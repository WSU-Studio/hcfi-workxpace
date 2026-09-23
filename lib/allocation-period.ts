import { MONTH_NAMES } from '@/lib/budget-plans/form';

/**
 * Months (1–12) that have a positive allocation amount.
 * Shared by list APIs and AllocationPeriodCell so the table and payload stay aligned.
 */
export function monthsWithPositiveAllocation(
  allocations: Array<{ month: number; allocation?: unknown }> | null | undefined,
): number[] {
  if (!allocations?.length) return [];
  const months = new Set<number>();
  for (const row of allocations) {
    if (row.month < 1 || row.month > 12) continue;
    if (Number(row.allocation ?? 0) <= 0) continue;
    months.add(row.month);
  }
  return Array.from(months).sort((a, b) => a - b);
}

export function formatAllocatedMonthLabels(months: number[]): string {
  if (months.length === 0) return '—';
  if (months.length === 12) return 'All months';
  return months.map((month) => MONTH_NAMES[month - 1]).join(', ');
}

export function formatFiscalYearLabel(fiscalYear: number | null | undefined): string {
  if (!fiscalYear || !Number.isFinite(fiscalYear) || fiscalYear <= 0) return '—';
  return `FY ${fiscalYear}`;
}

/** Sum of positive monthly allocation amounts (period budget impact). */
export function sumPositiveAllocations(
  allocations: Array<{ allocation?: unknown }> | null | undefined,
): number {
  if (!allocations?.length) return 0;
  let sum = 0;
  for (const row of allocations) {
    const amount = Number(row.allocation ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    sum += amount;
  }
  return sum;
}

