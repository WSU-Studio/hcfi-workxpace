import { prisma } from '@/lib/prisma';
import { ConfinsClient } from '@/lib/confins/client';
import {
  buildConfinsEmployeeEmailMap,
  fetchAllConfinsEmployees,
  normalizeConfinsEmail,
  pickActiveConfinsRole,
  type ConfinsEmployeeRow,
  type DepartmentIdResolver,
  type RoleIdResolver,
  createDepartmentIdResolver,
  createRoleIdResolver,
} from '@/lib/confins/employee-lookup';

export type ConfinsEmployeeSyncSummary = {
  /** Total users in Workxpace DB considered for sync. */
  totalUsers: number;
  /** Users whose email matched a Confins `Username`. */
  matchedInConfins: number;
  /** Users with no Confins row for their email. */
  notInConfins: number;
  /** Rows where `employeeId`, `departmentId`, and/or `roleId` were written. */
  updated: number;
  /** Matched users already up to date — no DB write. */
  unchanged: number;
  /** Per-user failures (EmpNo collision, missing department, etc.). */
  errors: { email: string; reason: string }[];
};

type UserPatchData = {
  employeeId: string;
  departmentId: string;
  roleId: string;
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

async function applyUserPatch(
  userId: string,
  currentRoleId: string,
  data: UserPatchData,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data,
    });

    if (data.roleId !== currentRoleId) {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.create({ data: { userId, roleId: data.roleId } });
    }
  });
}

/**
 * Daily batch sync: update Workxpace users whose email exists in Confins.
 *
 * Fields synced (Confins → Workxpace):
 *   - `EmpNo` → `users.employeeId`
 *   - `Roles[].BusinessUnitName` → `users.departmentId`
 *   - `Roles[].RoleName` → `users.roleId` (match/create `roles.roleCode`)
 *   - `Roles[].JobTitleName` → `roles.roleName` when role is auto-created
 *
 * NOT synced (by design):
 *   - `name` — remains from Entra / manual entry
 *   - access flags — admin-managed in Workxpace
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
        roleId: true,
      },
    }),
  ]);

  summary.totalUsers = users.length;

  const emailMap = buildConfinsEmployeeEmailMap(employees);
  const [resolveDepartmentId, resolveRoleId] = await Promise.all([
    createDepartmentIdResolver(client),
    createRoleIdResolver(),
  ]);

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
        resolveRoleId,
      );

      if (patch.kind === 'unchanged') {
        summary.unchanged += 1;
        continue;
      }

      if (patch.kind === 'error') {
        summary.errors.push({ email, reason: patch.reason });
        if (patch.partial) {
          await applyUserPatch(user.id, user.roleId, {
            employeeId: patch.partial.employeeId ?? user.employeeId,
            departmentId: patch.partial.departmentId ?? user.departmentId,
            roleId: patch.partial.roleId ?? user.roleId,
          });
          summary.updated += 1;
        } else {
          summary.unchanged += 1;
        }
        continue;
      }

      await applyUserPatch(user.id, user.roleId, patch.data);
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
  roleId: string;
};

type UserPatchResult =
  | { kind: 'unchanged' }
  | { kind: 'error'; reason: string; partial?: Partial<UserPatchData> }
  | { kind: 'update'; data: UserPatchData };

async function buildUserPatchFromConfinsRow(
  row: ConfinsEmployeeRow,
  user: UserRow,
  resolveDepartmentId: DepartmentIdResolver,
  resolveRoleId: RoleIdResolver,
): Promise<UserPatchResult> {
  const activeRole = pickActiveConfinsRole(row.Roles);
  const businessUnitName = activeRole?.BusinessUnitName?.trim() ?? null;
  const confinsRoleCode = activeRole?.RoleName?.trim() ?? null;
  const jobTitleName = activeRole?.JobTitleName?.trim() ?? null;

  const departmentId = businessUnitName
    ? await resolveDepartmentId(businessUnitName)
    : null;
  const roleId = confinsRoleCode
    ? await resolveRoleId(confinsRoleCode, jobTitleName)
    : null;

  const { employeeId, skipped: empSkipped } = await resolveEmployeeIdForUpdate(
    String(row.EmpNo ?? '').trim() || null,
    user.email,
    user.employeeId,
  );

  const nextDepartmentId = departmentId ?? user.departmentId;
  const nextRoleId = roleId ?? user.roleId;
  const employeeChanged = employeeId !== user.employeeId;
  const departmentChanged = nextDepartmentId !== user.departmentId;
  const roleChanged = nextRoleId !== user.roleId;

  if (!employeeChanged && !departmentChanged && !roleChanged) {
    return { kind: 'unchanged' };
  }

  if (empSkipped) {
    const partial: Partial<UserPatchData> = {};
    if (departmentChanged) partial.departmentId = nextDepartmentId;
    if (roleChanged) partial.roleId = nextRoleId;

    if (Object.keys(partial).length === 0) {
      return { kind: 'error', reason: empSkipped };
    }

    return { kind: 'error', reason: empSkipped, partial };
  }

  return {
    kind: 'update',
    data: {
      employeeId,
      departmentId: nextDepartmentId,
      roleId: nextRoleId,
    },
  };
}
