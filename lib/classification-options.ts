import { prisma } from '@/lib/prisma';
import accountOptions from '@/data/accounts.json';

export type ClassificationOption = { id: string; name: string };
export type AccountOption = { id: string; accountCode: string; accountName: string };

export type ClassificationOptionsPayload = {
  accountOptions: AccountOption[];
  categoryOptions: ClassificationOption[];
  categoryKeyIndexOptions: ClassificationOption[];
  costCenterOptions: ClassificationOption[];
  opexAllocationOptions: ClassificationOption[];
};

export async function loadClassificationOptions(): Promise<ClassificationOptionsPayload> {
  const [categoryOptions, categoryKeyIndexOptions, costCenterOptions, opexAllocationOptions] = await Promise.all([
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
