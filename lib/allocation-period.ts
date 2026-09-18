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

/**
 * BR persists the grand total on every selected month (`normalizeBudgetRequestBody`).
 * Spread that total evenly across those months so a pivot FY total equals the BR
 * total instead of total × month count. Remainder (rupiah) goes on the last month.
 */
export function spreadCopiedGrandTotalAcrossMonths(
  monthly: Map<number, number>,
): Map<number, number> {
  const months = Array.from(monthly.keys()).sort((a, b) => a - b);
  if (months.length <= 1) return monthly;

  const totalRupiah = Math.round(Math.max(...months.map((month) => monthly.get(month) ?? 0)));
  if (totalRupiah <= 0) return monthly;

  const count = months.length;
  const base = Math.floor(totalRupiah / count);
  const remainder = totalRupiah - base * count;
  const spread = new Map<number, number>();
  months.forEach((month, index) => {
    spread.set(month, base + (index === count - 1 ? remainder : 0));
  });
  return spread;
}
