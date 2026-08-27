import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Legacy Data Mart staging rows persisted BR classification fields as master
 * IDs (cuid) instead of display names (see `upsertDataMartStaging` — it copies
 * `br.category` etc. verbatim). Production rows can't be rewritten, so we
 * resolve ID → name at read time. Values that don't match any master ID are
 * returned unchanged (rows saved with proper names, or free text).
 */
export type ClassificationLabelMaps = {
  categoryById: Map<string, string>;
  categoryKeyIndexById: Map<string, string>;
  costCenterById: Map<string, string>;
  opexAllocationById: Map<string, string>;
};

export async function loadClassificationLabelMaps(): Promise<ClassificationLabelMaps> {
  const [categories, categoryKeyIndexes, costCenters, opexAllocations] = await prisma.$transaction([
    prisma.categoryMaster.findMany({ select: { id: true, name: true } }),
    prisma.categoryKeyIndexMaster.findMany({ select: { id: true, name: true } }),
    prisma.costCenterMaster.findMany({ select: { id: true, name: true } }),
    prisma.opexAllocationMaster.findMany({ select: { id: true, name: true } }),
  ]);

  return {
    categoryById: new Map(categories.map((row) => [row.id, row.name])),
    categoryKeyIndexById: new Map(categoryKeyIndexes.map((row) => [row.id, row.name])),
    costCenterById: new Map(costCenters.map((row) => [row.id, row.name])),
    opexAllocationById: new Map(opexAllocations.map((row) => [row.id, row.name])),
  };
}

export function resolveClassificationLabel(
  map: Map<string, string>,
  value: string | null | undefined,
): string | null {
  if (!value) return value ?? null;
  return map.get(value) ?? value;
}

/** Match staging rows stored as either master ID or display name. */
export function classificationMatchFilter(
  map: Map<string, string>,
  value: string,
): Prisma.StringFilter {
  const trimmed = value.trim();
  const aliases = new Set<string>([trimmed]);
  const asName = map.get(trimmed);
  if (asName) aliases.add(asName);
  const lowered = trimmed.toLowerCase();
  for (const [id, name] of map) {
    if (name.toLowerCase() === lowered) aliases.add(id);
  }
  const list = [...aliases];
  if (list.length === 1) {
    return { equals: list[0], mode: 'insensitive' };
  }
  return { in: list, mode: 'insensitive' };
}
