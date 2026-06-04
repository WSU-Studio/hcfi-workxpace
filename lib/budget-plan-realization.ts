/**
 * Per-month realization & outstanding calculation for a Budget Plan's
 * monthly allocation grid.
 *
 * Semantics (must match the existing budget-realization report so users
 * see consistent numbers across pages):
 *   - `realization[m]` = sum of `grandTotal` of every linked BudgetRequest
 *     whose `requestDate` falls in month `m` of the plan's fiscal year.
 *     We do NOT filter by BR status — this matches the `requestedTotal`
 *     metric in `lib/budget-realization/aggregate.ts`.
 *   - `outstanding[m]` = cumulative `(allocation[1..m] - realization[1..m])`.
 *     i.e. running balance through month `m` (matches the user's expected
 *     reading: O/S in March = O/S Feb + (alloc Mar - real Mar)).
 *
 * Extracted as a pure function so it can be unit-tested without Prisma and
 * reused (e.g. in realization-detail views or export pipelines).
 */

export type DecimalLike = { toString(): string } | number | string | null | undefined;

const toNumber = (value: DecimalLike): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface AllocationInput {
  month: number;
  allocation: DecimalLike;
}

export interface LinkedRequestInput {
  requestDate: Date | string | null | undefined;
  grandTotal: DecimalLike;
}

export interface EnrichedAllocation {
  month: number;
  allocation: number;
  realization: number;
  outstanding: number;
}

/**
 * Bucket linked BudgetRequests' grandTotal into months 1..12 for a given
 * fiscal year. Requests outside the year (or without a parseable date) are
 * skipped — they likely belong to a sibling plan or are corrupt records.
 */
export function bucketRealizationByMonth(
  linkedRequests: LinkedRequestInput[],
  fiscalYear: number,
): number[] {
  const buckets = new Array(12).fill(0) as number[];
  for (const req of linkedRequests) {
    if (!req.requestDate) continue;
    const date = req.requestDate instanceof Date ? req.requestDate : new Date(req.requestDate);
    if (Number.isNaN(date.getTime())) continue;
    if (date.getFullYear() !== fiscalYear) continue;
    const monthIndex = date.getMonth();
    buckets[monthIndex] = (buckets[monthIndex] ?? 0) + toNumber(req.grandTotal);
  }
  return buckets;
}

/**
 * Enrich each allocation row with `realization` (current month) and
 * `outstanding` (running cumulative balance up to that month).
 *
 * Allocations are sorted by month before accumulation to guarantee a stable
 * cumulative result regardless of input order.
 */
export function enrichAllocationsWithRealization(
  allocations: AllocationInput[],
  linkedRequests: LinkedRequestInput[],
  fiscalYear: number,
): EnrichedAllocation[] {
  const buckets = bucketRealizationByMonth(linkedRequests, fiscalYear);
  const sorted = [...allocations].sort((a, b) => a.month - b.month);

  let cumulativeAllocation = 0;
  let cumulativeRealization = 0;

  return sorted.map((row) => {
    const allocation = toNumber(row.allocation);
    const realization = buckets[row.month - 1] ?? 0;
    cumulativeAllocation += allocation;
    cumulativeRealization += realization;
    return {
      month: row.month,
      allocation,
      realization,
      outstanding: cumulativeAllocation - cumulativeRealization,
    };
  });
}
