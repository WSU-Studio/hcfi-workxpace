import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type BudgetPlanDb = Prisma.TransactionClient | typeof prisma;

/**
 * Document codes for Budget Plans: `{DEPT}{YYYY}{MM}{seq}` e.g. `IT202608001`.
 * Form create and bulk import must share this so `budget_plans.code` stays unique.
 */
export function normalizeBudgetPlanDepartmentCode(departmentCode: string): string {
  return departmentCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'BP';
}

export function buildBudgetPlanCodePrefix(
  departmentCode: string,
  at: Date = new Date(),
): string {
  const year = String(at.getFullYear());
  const month = String(at.getMonth() + 1).padStart(2, '0');
  return `${normalizeBudgetPlanDepartmentCode(departmentCode)}${year}${month}`;
}

export function formatBudgetPlanCode(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

export async function countBudgetPlansWithPrefix(
  db: BudgetPlanDb,
  prefix: string,
): Promise<number> {
  return db.budgetPlan.count({
    where: { code: { startsWith: prefix } },
  });
}

export async function allocateNextBudgetPlanCode(
  db: BudgetPlanDb,
  departmentCode: string,
  at: Date = new Date(),
): Promise<string> {
  const prefix = buildBudgetPlanCodePrefix(departmentCode, at);
  const count = await countBudgetPlansWithPrefix(db, prefix);
  return formatBudgetPlanCode(prefix, count + 1);
}

/**
 * One COUNT per `{DEPT}{YYYY}{MM}` prefix, then increment in memory.
 * Used by bulk import so N rows in the same month do not each re-query.
 */
export function createBudgetPlanCodeAllocator(
  db: BudgetPlanDb,
  at: Date = new Date(),
) {
  const nextSeqByPrefix = new Map<string, number>();

  return {
    async next(departmentCode: string): Promise<string> {
      const prefix = buildBudgetPlanCodePrefix(departmentCode, at);
      let sequence = nextSeqByPrefix.get(prefix);
      if (sequence === undefined) {
        sequence = (await countBudgetPlansWithPrefix(db, prefix)) + 1;
      }
      nextSeqByPrefix.set(prefix, sequence + 1);
      return formatBudgetPlanCode(prefix, sequence);
    },
  };
}
