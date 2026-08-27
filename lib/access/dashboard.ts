import type { Session } from 'next-auth';
import {
  parseDashboardView,
  type DashboardView,
} from '@/types/access-control';

/**
 * Dashboard row-level scope. Independent from `viewOtherDepartmentDocuments`
 * (BP/BR/PR lists). Fail-closed when the user has no department and no
 * "view all" grant — same sentinel pattern as `buildDepartmentScope`.
 */
export function buildDashboardDepartmentScope(
  session: Session | null | undefined,
): { departmentId: string } | null {
  const viewAll = Boolean(session?.user?.access?.activityAccess?.viewAllDashboardDepartments);
  if (viewAll) return null;

  const userDepartmentId = session?.user?.departmentId ?? '';
  if (!userDepartmentId) {
    return { departmentId: '__no-department-assigned__' };
  }
  return { departmentId: userDepartmentId };
}

export function resolveDashboardView(session: Session | null | undefined): DashboardView {
  return parseDashboardView(session?.user?.access?.activityAccess?.dashboardView);
}

export function canViewDashboard(session: Session | null | undefined): boolean {
  return Boolean(session?.user?.access?.menuAccess?.dashboard);
}
