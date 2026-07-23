import { prisma } from '@/lib/prisma';
import { ConfinsClient } from '@/lib/confins/client';

const DEFAULT_EMPLOYEE_PATHS = [
  process.env.CONFINS_EMPLOYEE_PATH ||
    '/v1/IntegrationEBudgetingX/GetListRefEmpByIsActiveX',
  '/v1/RefEmpX/GetListRefEmpByIsActiveX',
];

const DEFAULT_BIZ_UNIT_PATHS = [
  process.env.CONFINS_DEPARTMENT_PATH ||
    '/v1/IntegrationEBudgetingX/GetListRefBizUnitByIsActiveX',
  '/v1/RefBizUnitX/GetListRefBizUnitByIsActiveX',
];

/** In-memory cache — employee master is large; avoid refetching on every SSO login. */
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedEmployees: ConfinsEmployeeRow[] | null = null;
let cacheExpiresAt = 0;

export type ConfinsEmployeeRole = {
  BusinessUnitName?: string | null;
  SupervisorName?: string | null;
  JobTitleName?: string | null;
  OfficeName?: string | null;
  RoleName?: string | null;
  IsActive?: boolean;
};

export type ConfinsEmployeeRow = {
  Username?: string | null;
  EmpNo?: string | null;
  EmpName?: string | null;
  IsActive?: boolean;
  Roles?: ConfinsEmployeeRole[] | null;
};

type ConfinsBizUnitRow = {
  BizUnitCode?: string | null;
  BizUnitName?: string | null;
  IsActive?: boolean;
};

export interface ConfinsEmployeeProfile {
  found: boolean;
  empNo: string | null;
  businessUnitName: string | null;
  departmentId: string | null;
}

export type DepartmentIdResolver = (businessUnitName: string) => Promise<string | null>;

export type RoleIdResolver = (
  roleCode: string,
  jobTitleName: string | null,
) => Promise<string | null>;

export function normalizeConfinsEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Pick the primary active Confins role row for an employee. */
export function pickActiveConfinsRole(
  roles: ConfinsEmployeeRole[] | null | undefined,
): ConfinsEmployeeRole | null {
  if (!Array.isArray(roles) || roles.length === 0) return null;

  const hasData = (role: ConfinsEmployeeRole) =>
    Boolean(
      role.BusinessUnitName?.trim() ||
        role.RoleName?.trim() ||
        role.JobTitleName?.trim(),
    );

  return (
    roles.find((role) => role.IsActive !== false && hasData(role)) ??
    roles.find((role) => hasData(role)) ??
    null
  );
}

export function pickBusinessUnitName(
  roles: ConfinsEmployeeRole[] | null | undefined,
): string | null {
  return pickActiveConfinsRole(roles)?.BusinessUnitName?.trim() ?? null;
}

async function postWithFallback<T>(
  client: ConfinsClient,
  paths: string[],
  body: Record<string, unknown>,
): Promise<T[]> {
  const failures: string[] = [];
  for (const path of paths) {
    try {
      return await client.post<T>({ path, body, liveOnly: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${path}: ${message}`);
      console.warn('[Confins] path failed, trying next', { path, message });
    }
  }
  throw new Error(
    failures.length > 0
      ? `Confins request failed after ${failures.length} path(s): ${failures.join(' | ')}`
      : 'Confins request failed',
  );
}

/**
 * Fetch the full Confins employee master list.
 *
 * SSO login uses a short TTL cache; the daily batch sync passes
 * `{ bypassCache: true }` to always read fresh data.
 */
export async function fetchAllConfinsEmployees(
  client: ConfinsClient,
  options?: { bypassCache?: boolean },
): Promise<ConfinsEmployeeRow[]> {
  const now = Date.now();
  if (!options?.bypassCache && cachedEmployees && now < cacheExpiresAt) {
    return cachedEmployees;
  }

  const rows = await postWithFallback<ConfinsEmployeeRow>(client, DEFAULT_EMPLOYEE_PATHS, {
    IsActive: '0',
  });

  if (!options?.bypassCache) {
    cachedEmployees = rows;
    cacheExpiresAt = now + CACHE_TTL_MS;
  }

  return rows;
}

/** Index Confins employees by normalized `Username` (corporate email). */
export function buildConfinsEmployeeEmailMap(
  employees: ConfinsEmployeeRow[],
): Map<string, ConfinsEmployeeRow> {
  const map = new Map<string, ConfinsEmployeeRow>();
  for (const row of employees) {
    const email = normalizeConfinsEmail(String(row.Username ?? ''));
    if (!email) continue;
    map.set(email, row);
  }
  return map;
}

/**
 * Preload department name → Workxpace ID mapping for batch sync.
 *
 * Combines existing DB rows with Confins BizUnit master so repeated lookups
 * during a sync run don't hit the database/API per user.
 */
export async function createDepartmentIdResolver(
  client: ConfinsClient,
): Promise<DepartmentIdResolver> {
  const [dbDepartments, bizUnits] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true, code: true } }),
    postWithFallback<ConfinsBizUnitRow>(client, DEFAULT_BIZ_UNIT_PATHS, {
      IsActive: '0',
    }),
  ]);

  const byName = new Map<string, string>();
  for (const dept of dbDepartments) {
    byName.set(dept.name.trim().toLowerCase(), dept.id);
  }

  for (const unit of bizUnits) {
    const code = String(unit.BizUnitCode ?? '').trim();
    const name = String(unit.BizUnitName ?? '').trim();
    if (!code || !name) continue;

    const key = name.toLowerCase();
    if (byName.has(key)) continue;

    const department = await prisma.department.upsert({
      where: { code },
      update: {
        name,
        description: 'Synced from Confins (employee sync)',
      },
      create: {
        code,
        name,
        description: 'Synced from Confins (employee sync)',
      },
      select: { id: true, name: true },
    });
    byName.set(department.name.trim().toLowerCase(), department.id);
  }

  return async (businessUnitName: string) => {
    const normalized = businessUnitName.trim().toLowerCase();
    if (!normalized) return null;
    return byName.get(normalized) ?? null;
  };
}

/**
 * Resolve Confins `RoleName` → Workxpace `roles.id`.
 *
 * Match key: `roles.roleCode` ↔ Confins `RoleName`.
 * If missing, auto-create:
 *   - `roleCode` ← `RoleName`
 *   - `roleName` ← `JobTitleName` (falls back to `RoleName`)
 */
export async function createRoleIdResolver(): Promise<RoleIdResolver> {
  const dbRoles = await prisma.role.findMany({
    select: { id: true, roleCode: true },
  });

  const byCode = new Map<string, string>();
  for (const role of dbRoles) {
    byCode.set(role.roleCode.trim().toLowerCase(), role.id);
  }

  return async (roleCode: string, jobTitleName: string | null) => {
    const code = roleCode.trim();
    if (!code) return null;

    const key = code.toLowerCase();
    const cached = byCode.get(key);
    if (cached) return cached;

    const roleName = jobTitleName?.trim() || code;
    const role = await prisma.role.upsert({
      where: { roleCode: code },
      update: {},
      create: {
        roleCode: code,
        roleName,
        description: 'Synced from Confins (employee sync)',
      },
      select: { id: true, roleCode: true },
    });

    byCode.set(role.roleCode.trim().toLowerCase(), role.id);
    return role.id;
  };
}

async function resolveDepartmentIdByBusinessUnitName(
  businessUnitName: string,
  client: ConfinsClient,
): Promise<string | null> {
  const resolver = await createDepartmentIdResolver(client);
  return resolver(businessUnitName);
}

/**
 * Resolve employee master data from Confins Organization Master API
 * (`GetListRefEmpByIsActiveX`) for SSO auto-provisioning.
 *
 * Match key: `Username` (corporate email) ↔ Entra `email`.
 * Mapped fields:
 *   - `EmpNo` → Workxpace `users.employeeId`
 *   - `Roles[].BusinessUnitName` → Workxpace `users.departmentId`
 *
 * `EmpName` is applied during batch employee sync, not SSO auto-provision
 * (SSO keeps the display name from Entra on first login).
 */
export async function lookupConfinsEmployeeByEmail(
  email: string,
): Promise<ConfinsEmployeeProfile> {
  const normalizedEmail = normalizeConfinsEmail(email);
  if (!normalizedEmail) {
    return { found: false, empNo: null, businessUnitName: null, departmentId: null };
  }

  try {
    const client = new ConfinsClient();
    const employees = await fetchAllConfinsEmployees(client);
    const row = employees.find(
      (employee) => normalizeConfinsEmail(String(employee.Username ?? '')) === normalizedEmail,
    );

    if (!row) {
      return { found: false, empNo: null, businessUnitName: null, departmentId: null };
    }

    const empNo = String(row.EmpNo ?? '').trim() || null;
    const businessUnitName = pickBusinessUnitName(row.Roles);
    const departmentId = businessUnitName
      ? await resolveDepartmentIdByBusinessUnitName(businessUnitName, client)
      : null;

    return {
      found: true,
      empNo,
      businessUnitName,
      departmentId,
    };
  } catch (error) {
    if (process.env.SSO_DEBUG === 'true') {
      console.warn('[SSO] Confins employee lookup failed', {
        email: normalizedEmail,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { found: false, empNo: null, businessUnitName: null, departmentId: null };
  }
}

/** Test helper — clears in-memory employee cache between test runs. */
export function clearConfinsEmployeeCache(): void {
  cachedEmployees = null;
  cacheExpiresAt = 0;
}
