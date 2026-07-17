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
