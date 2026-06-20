import { prisma } from '@/lib/prisma';
import { ConfinsClient } from '@/lib/confins/client';
import {
  buildConfinsEmployeeEmailMap,
  fetchAllConfinsEmployees,
  normalizeConfinsEmail,
  pickBusinessUnitName,
  type ConfinsEmployeeRow,
  type DepartmentIdResolver,
  createDepartmentIdResolver,
} from '@/lib/confins/employee-lookup';

export type ConfinsEmployeeSyncSummary = {
  /** Total users in Workxpace DB considered for sync. */
  totalUsers: number;
  /** Users whose email matched a Confins `Username`. */
  matchedInConfins: number;
  /** Users with no Confins row for their email. */
  notInConfins: number;
  /** Rows where `employeeId` and/or `departmentId` were written. */
  updated: number;
  /** Matched users already up to date — no DB write. */
  unchanged: number;
  /** Per-user failures (EmpNo collision, missing department, etc.). */
  errors: { email: string; reason: string }[];
};

async function resolveEmployeeIdForUpdate(
  confinsEmpNo: string | null,
  email: string,
  currentEmployeeId: string,
): Promise<{ employeeId: string; skipped?: string }> {
  const candidate = confinsEmpNo?.trim();
  if (!candidate) {
    return { employeeId: currentEmployeeId, skipped: 'empty EmpNo in Confins' };
  }

  if (candidate === currentEmployeeId) {
    return { employeeId: currentEmployeeId };
  }

  const taken = await prisma.user.findUnique({
    where: { employeeId: candidate },
    select: { email: true },
  });
  if (taken && normalizeConfinsEmail(taken.email) !== normalizeConfinsEmail(email)) {
    return {
      employeeId: currentEmployeeId,
      skipped: `EmpNo ${candidate} already assigned to another user`,
    };
  }

  return { employeeId: candidate };
}

/**
 * Daily batch sync: update Workxpace users whose email exists in Confins.
 *
 * Fields synced (Confins → Workxpace):
 *   - `EmpNo` → `users.employeeId`
 *   - `Roles[].BusinessUnitName` → `users.departmentId`
 *
 * NOT synced (by design):
 *   - `name` — remains from Entra / manual entry
 *   - `roleId`, access flags — admin-managed in Workxpace
 *   - `isActive` — not changed by this job (confirm with HCFI before enabling)
 *
 * Users without a Confins match are skipped silently.
 */
export async function syncAllUsersFromConfins(): Promise<ConfinsEmployeeSyncSummary> {
  const summary: ConfinsEmployeeSyncSummary = {
    totalUsers: 0,
    matchedInConfins: 0,
    notInConfins: 0,
    updated: 0,
    unchanged: 0,
    errors: [],
  };

  const client = new ConfinsClient();
  const [employees, users] = await Promise.all([
    fetchAllConfinsEmployees(client, { bypassCache: true }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        employeeId: true,
        departmentId: true,
      },
    }),
  ]);

  summary.totalUsers = users.length;

  const emailMap = buildConfinsEmployeeEmailMap(employees);
  const resolveDepartmentId: DepartmentIdResolver = await createDepartmentIdResolver(client);

  for (const user of users) {
    const email = normalizeConfinsEmail(user.email);
    const confinsRow = emailMap.get(email);

    if (!confinsRow) {
      summary.notInConfins += 1;
      continue;
    }

    summary.matchedInConfins += 1;

    try {
      const patch = await buildUserPatchFromConfinsRow(
        confinsRow,
        user,
        resolveDepartmentId,
      );

      if (patch.kind === 'unchanged') {
        summary.unchanged += 1;
        continue;
      }

      if (patch.kind === 'error') {
        summary.errors.push({ email, reason: patch.reason });
        if (patch.partial) {
          await prisma.user.update({
            where: { id: user.id },
            data: patch.partial,
          });
          summary.updated += 1;
        } else {
          summary.unchanged += 1;
        }
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: patch.data,
      });
      summary.updated += 1;
    } catch (error) {
      summary.errors.push({
        email,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return summary;
}

type UserRow = {
  id: string;
  email: string;
  employeeId: string;
  departmentId: string;
};

type UserPatchResult =
  | { kind: 'unchanged' }
  | { kind: 'error'; reason: string; partial?: { departmentId: string } }
  | { kind: 'update'; data: { employeeId: string; departmentId: string } };

async function buildUserPatchFromConfinsRow(
  row: ConfinsEmployeeRow,
  user: UserRow,
  resolveDepartmentId: DepartmentIdResolver,
): Promise<UserPatchResult> {
  const businessUnitName = pickBusinessUnitName(row.Roles);
  const departmentId = businessUnitName
    ? await resolveDepartmentId(businessUnitName)
    : null;

  const { employeeId, skipped: empSkipped } = await resolveEmployeeIdForUpdate(
    String(row.EmpNo ?? '').trim() || null,
    user.email,
    user.employeeId,
  );

  if (empSkipped && !departmentId) {
    return { kind: 'error', reason: empSkipped };
  }

  const nextDepartmentId = departmentId ?? user.departmentId;
  const employeeChanged = employeeId !== user.employeeId;
  const departmentChanged = nextDepartmentId !== user.departmentId;

  if (!employeeChanged && !departmentChanged) {
    return { kind: 'unchanged' };
  }

  if (empSkipped && departmentChanged) {
    return {
      kind: 'error',
      reason: empSkipped,
      partial: { departmentId: nextDepartmentId },
    };
  }

  if (empSkipped && !departmentChanged) {
    return { kind: 'error', reason: empSkipped };
  }

  return {
    kind: 'update',
    data: {
      employeeId,
      departmentId: nextDepartmentId,
    },
  };
}
