import type { Prisma } from '@prisma/client';

/**
 * Prisma where for departments that may appear in pickers.
 * Always includes active rows; optionally keeps specific inactive IDs
 * (e.g. current assignment) so edit forms do not drop the selection.
 */
export function selectableDepartmentWhere(
  includeIds: Array<string | null | undefined> = []
): Prisma.DepartmentWhereInput {
  const ids = [...new Set(includeIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) {
    return { isActive: true };
  }
  return {
    OR: [{ isActive: true }, { id: { in: ids } }],
  };
}
