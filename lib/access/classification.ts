import type { Session } from 'next-auth';

/**
 * Single source of truth for the Classification-section permission gate used
 * on the Review pages of Budget Plan, Budget Request, and Payment Request.
 *
 * The Classification section contains accounting-sensitive fields (Cost
 * Center, Category, Category Key Index, Kode Akun / COA, OPEX vs CAPEX type,
 * OPEX Allocation). Tagging a document to the wrong COA / cost center
 * misroutes financial reporting, so we let admins assign this hat narrowly —
 * independent from whether a user can review/approve the document.
 *
 * Mirrors the shape of `lib/access/cross-department.ts`: a tiny pure module
 * keeps the rule in one place so the UI gate and the server-side gate cannot
 * drift apart.
 */

export type ClassificationFieldKeys =
  | 'coaId'
  | 'categoryId'
  | 'categoryKeyIndexId'
  | 'costCenterId'
  | 'opexType'
  | 'opexAllocationId';

/** Read the permission flag from the NextAuth session (UI and server). */
export function canEditClassificationFields(
  session: Session | null | undefined,
): boolean {
  return Boolean(session?.user?.access?.activityAccess?.editClassificationSection);
}

/**
 * Server-side helper: project an incoming PATCH/POST body onto either the
 * caller-provided classification overrides (when allowed) or the existing
 * persisted values (when not). Use this in API handlers to ignore — rather
 * than reject — classification edits from callers who lack the permission,
 * so legitimate review/approve actions still succeed without forcing the UI
 * to strip fields before sending.
 *
 * Returns the same key set so the result can be spread directly into a
 * Prisma `update.data` object.
 */
export interface ClassificationFieldValues {
  coaId: string | null | undefined;
  categoryId: string | null | undefined;
  categoryKeyIndexId: string | null | undefined;
  costCenterId: string | null | undefined;
  opexType: string | null | undefined;
  opexAllocationId: string | null | undefined;
}

export function pickClassificationFields(
  incoming: Partial<ClassificationFieldValues>,
  current: ClassificationFieldValues,
  allowed: boolean,
): ClassificationFieldValues {
  if (!allowed) return current;
  return {
    coaId: incoming.coaId ?? current.coaId ?? null,
    categoryId: incoming.categoryId ?? current.categoryId ?? null,
    categoryKeyIndexId: incoming.categoryKeyIndexId ?? current.categoryKeyIndexId ?? null,
    costCenterId: incoming.costCenterId ?? current.costCenterId ?? null,
    opexType: incoming.opexType ?? current.opexType ?? null,
    opexAllocationId:
      (incoming.opexType ?? current.opexType) === 'OPEX'
        ? incoming.opexAllocationId ?? current.opexAllocationId ?? null
        : null,
  };
}
