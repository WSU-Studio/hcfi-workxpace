import type { Session } from 'next-auth';

/**
 * Server-side guard for the `createForOtherDepartment` activity permission.
 *
 * Reads the permission from the NextAuth session and compares the requested
 * `departmentId` against the user's own `departmentId`. Returns a structured
 * verdict so callers can shape their HTTP response without re-implementing
 * the same logic on every endpoint (BP / BR / PR creation, etc.).
 *
 * Single responsibility: decide whether a user is allowed to act on a
 * department other than their own. UI gating lives in
 * `components/forms/DepartmentSelectField.tsx`; this is the matching server
 * check (defense in depth — UI gates can be bypassed by direct API calls).
 */

export type CrossDepartmentVerdict =
  | { ok: true }
  | { ok: false; reason: 'missing-user-department' | 'forbidden-other-department'; message: string };

export function assertCanActOnDepartment(
  session: Session | null | undefined,
  requestedDepartmentId: string | null | undefined,
): CrossDepartmentVerdict {
  const userDepartmentId = session?.user?.departmentId ?? '';
  const canCrossDepartment = Boolean(
    session?.user?.access?.activityAccess?.createForOtherDepartment,
  );

  if (canCrossDepartment) return { ok: true };

  // No permission to act on other departments → must match the user's own.
  if (!userDepartmentId) {
    return {
      ok: false,
      reason: 'missing-user-department',
      message:
        'Your account is not assigned to any department. Ask an admin to assign one before creating documents.',
    };
  }

  if (!requestedDepartmentId || requestedDepartmentId !== userDepartmentId) {
    return {
      ok: false,
      reason: 'forbidden-other-department',
      message:
        'You can only create documents for your own department. The "Create for Other Departments" permission is required for cross-department creation.',
    };
  }

  return { ok: true };
}
