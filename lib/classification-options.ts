import { prisma } from '@/lib/prisma';

export type ClassificationOption = { id: string; name: string };
export type AccountOption = { id: string; accountCode: string; accountName: string };

/**
 * Account (COA) options for classification dropdowns. Sourced from the
 * `CoaMaster` table (synced from Confins + manual entries). The stable
 * `accountCode` is used as the option `id` so BP/BR/PR persist a value that
 * survives re-syncs. Both active and inactive rows are returned so that
 * previously-selected (now inactive) accounts still resolve their label on
 * detail/review pages; ordering keeps active rows first.
 */
export async function loadAccountOptions(): Promise<AccountOption[]> {
  const rows = await prisma.coaMaster.findMany({
    orderBy: [{ isActive: 'desc' }, { accountCode: 'asc' }],
    select: { accountCode: true, accountName: true },
  });
  return rows.map((row) => ({
    id: row.accountCode,
    accountCode: row.accountCode,
    accountName: row.accountName,
  }));
}

export type ClassificationOptionsPayload = {
  accountOptions: AccountOption[];
  categoryOptions: ClassificationOption[];
  categoryKeyIndexOptions: ClassificationOption[];
  costCenterOptions: ClassificationOption[];
  opexAllocationOptions: ClassificationOption[];
};

export async function loadClassificationOptions(): Promise<ClassificationOptionsPayload> {
  const [accountOptions, categoryOptions, categoryKeyIndexOptions, costCenterOptions, opexAllocationOptions] = await Promise.all([
    loadAccountOptions(),
    prisma.categoryMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.categoryKeyIndexMaster.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.costCenterMaster.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.opexAllocationMaster.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return {
    accountOptions,
    categoryOptions,
    categoryKeyIndexOptions,
    costCenterOptions,
    opexAllocationOptions,
  };
}
