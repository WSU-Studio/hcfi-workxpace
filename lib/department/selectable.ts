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

/**
 * Ensure an assigned department stays in picker options even if inactive
 * (edit forms). Does not add duplicates.
 */
export function ensureDepartmentOption<T extends { id: string; code: string; name: string }>(
  departments: T[],
  department: T | null | undefined,
): T[] {
  if (!department?.id) return departments;
  if (departments.some((item) => item.id === department.id)) return departments;
  return [...departments, department];
}
