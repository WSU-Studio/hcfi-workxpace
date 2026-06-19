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
  /** True when a row matched the Entra email on `Username`. */
  found: boolean;
  empNo: string | null;
  businessUnitName: string | null;
  /** Resolved Workxpace `departments.id`, when mapping succeeded. */
  departmentId: string | null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function pickBusinessUnitName(roles: ConfinsEmployeeRole[] | null | undefined): string | null {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  const activeRole =
    roles.find((role) => role.IsActive !== false && role.BusinessUnitName?.trim()) ??
    roles.find((role) => role.BusinessUnitName?.trim());
  return activeRole?.BusinessUnitName?.trim() ?? null;
}

async function postWithFallback<T>(
  client: ConfinsClient,
  paths: string[],
  body: Record<string, unknown>,
): Promise<T[]> {
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await client.post<T>({ path, body });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Confins request failed');
}

async function fetchEmployees(client: ConfinsClient): Promise<ConfinsEmployeeRow[]> {
  const now = Date.now();
  if (cachedEmployees && now < cacheExpiresAt) {
    return cachedEmployees;
  }

  const rows = await postWithFallback<ConfinsEmployeeRow>(client, DEFAULT_EMPLOYEE_PATHS, {
    IsActive: '0',
  });

  cachedEmployees = rows;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return rows;
}

async function resolveDepartmentIdByBusinessUnitName(
  businessUnitName: string,
  client: ConfinsClient,
): Promise<string | null> {
  const normalized = businessUnitName.trim();
  if (!normalized) return null;

  const existing = await prisma.department.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const bizUnits = await postWithFallback<ConfinsBizUnitRow>(
    client,
    DEFAULT_BIZ_UNIT_PATHS,
    { IsActive: '0' },
  );

  const match = bizUnits.find(
    (row) => row.BizUnitName?.trim().toLowerCase() === normalized.toLowerCase(),
  );
  if (!match?.BizUnitCode || !match.BizUnitName) return null;

  const department = await prisma.department.upsert({
    where: { code: String(match.BizUnitCode).trim() },
    update: {
      name: String(match.BizUnitName).trim(),
      description: 'Synced from Confins (SSO provisioning)',
    },
    create: {
      code: String(match.BizUnitCode).trim(),
      name: String(match.BizUnitName).trim(),
      description: 'Synced from Confins (SSO provisioning)',
    },
    select: { id: true },
  });

  return department.id;
}

/**
 * Resolve employee master data from Confins Organization Master API
 * (`GetListRefEmpByIsActiveX`) for SSO auto-provisioning.
 *
 * Match key: `Username` (corporate email) ↔ Entra `email`.
 * Mapped fields:
 *   - `EmpNo` → Workxpace `users.employeeId`
 *   - `Roles[].BusinessUnitName` → Workxpace `users.departmentId`
 *     (matched by department name, with on-demand BizUnit sync if missing)
 *
 * Name stays from Entra per Hyundai requirement — `EmpName` is ignored here.
 */
export async function lookupConfinsEmployeeByEmail(
  email: string,
): Promise<ConfinsEmployeeProfile> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { found: false, empNo: null, businessUnitName: null, departmentId: null };
  }

  try {
    const client = new ConfinsClient();
    const employees = await fetchEmployees(client);
    const row = employees.find(
      (employee) => normalizeEmail(String(employee.Username ?? '')) === normalizedEmail,
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
