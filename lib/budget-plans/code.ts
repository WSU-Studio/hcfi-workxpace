import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type BudgetPlanDb = Prisma.TransactionClient | typeof prisma;

/**
 * Document codes for Budget Plans: `{DEPT}{YYYY}{MM}{seq}` e.g. `IT202608001`.
 * Form create and bulk import must share this so `budget_plans.code` stays unique.
 *
 * Sequence is MAX(existing suffix)+1, not COUNT. COUNT collides when codes in
 * the same month have gaps (deleted drafts, mixed numbering).
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

export function parseBudgetPlanSequence(code: string, prefix: string): number | null {
  if (!code.startsWith(prefix)) return null;
  const suffix = code.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) return null;
  const parsed = Number(suffix);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function nextBudgetPlanSequence(db: BudgetPlanDb, prefix: string): Promise<number> {
  const rows = await db.budgetPlan.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  let max = 0;
  for (const row of rows) {
    const sequence = parseBudgetPlanSequence(row.code, prefix);
    if (sequence != null && sequence > max) max = sequence;
  }
  return max + 1;
}

export async function allocateNextBudgetPlanCode(
  db: BudgetPlanDb,
  departmentCode: string,
  at: Date = new Date(),
): Promise<string> {
  const prefix = buildBudgetPlanCodePrefix(departmentCode, at);
  const sequence = await nextBudgetPlanSequence(db, prefix);
  return formatBudgetPlanCode(prefix, sequence);
}

/**
 * One MAX-sequence read per `{DEPT}{YYYY}{MM}` prefix, then increment in memory.
 * Used by bulk import so N rows in the same month do not each re-query.
 * `recover` re-reads MAX after a unique-constraint collision.
 */
export function createBudgetPlanCodeAllocator(
  db: BudgetPlanDb,
  at: Date = new Date(),
) {
  const nextSeqByPrefix = new Map<string, number>();

  const allocate = async (departmentCode: string, reset = false): Promise<string> => {
    const prefix = buildBudgetPlanCodePrefix(departmentCode, at);
    if (reset) nextSeqByPrefix.delete(prefix);
    let sequence = nextSeqByPrefix.get(prefix);
    if (sequence === undefined) {
      sequence = await nextBudgetPlanSequence(db, prefix);
    }
    nextSeqByPrefix.set(prefix, sequence + 1);
    return formatBudgetPlanCode(prefix, sequence);
  };

  return {
    next(departmentCode: string): Promise<string> {
      return allocate(departmentCode, false);
    },
    recover(departmentCode: string): Promise<string> {
      return allocate(departmentCode, true);
    },
  };
}
