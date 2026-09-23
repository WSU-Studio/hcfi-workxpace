/**
 * Per-month realization & outstanding calculation for a Budget Plan's
 * monthly allocation grid.
 *
 * Semantics:
 *   - `realization[m]` = sum of BudgetRequestAllocation amounts for month `m`
 *     from every linked BudgetRequest whose status is `'Approved'`. Each
 *     selected month carries the full item grand total (period impact =
 *     grandTotal × month count). When allocations are missing, falls back to
 *     putting `grandTotal` on the `requestDate` month.
 *     Pending / Draft / Revision / Declined BRs do NOT contribute.
 *     Plus Other Receive (ORV) credits from saved reconciliation / Data Mart
 *     staging for BRs on this plan. ORV is signed negative (credit), so it
 *     reduces effective realization and increases outstanding — Hyundai rule.
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

export interface LinkedRequestAllocationInput {
  month: number;
  allocation: DecimalLike;
}

export interface LinkedRequestInput {
  requestDate: Date | string | null | undefined;
  grandTotal: DecimalLike;
  /**
   * Budget Request status as stored in DB. Only `'Approved'` (final state of
   * the approval schema) counts toward realization; everything else is
   * treated as not-yet-realized.
   */
  status: string | null | undefined;
  /**
   * Per-month BR allocations (full item grand total on each selected month).
   * Preferred source for realization bucketing.
   */
  allocations?: LinkedRequestAllocationInput[] | null;
}

/**
 * ORV credit row already matched & saved against a BR on this plan.
 * `amount` should be negative (credit). Callers may pass positive legacy
 * amounts — `bucketOrvCreditsByMonth` always normalizes to -|amount|.
 */
export interface OrvCreditInput {
  /** Calendar month 1–12 of the reconciliation / staging row. */
  month: number;
  fiscalYear?: number | null;
  amount: DecimalLike;
}

/**
 * Canonical "fully approved" status for a Budget Request. Matches
 * `APPROVED_STATUSES` in `lib/budget-realization/aggregate.ts` and the
 * status string emitted by `app/api/budget-requests/[id]/approve/route.ts`
 * when the final approver signs off.
 */
const APPROVED_BR_STATUS = 'Approved';

export interface EnrichedAllocation {
  month: number;
  allocation: number;
  realization: number;
  outstanding: number;
}

/**
 * Bucket approved BudgetRequests into months 1..12 for a given fiscal year.
 *
 * Preferred path: sum positive `allocations` into their months (each month
 * already holds the full item grand total). Fallback when allocations are
 * empty: put `grandTotal` on the `requestDate` month (legacy / incomplete rows).
 */
export function bucketRealizationByMonth(
  linkedRequests: LinkedRequestInput[],
  fiscalYear: number,
): number[] {
  const buckets = new Array(12).fill(0) as number[];
  for (const req of linkedRequests) {
    if (req.status !== APPROVED_BR_STATUS) continue;

    const positiveAllocations = (req.allocations ?? []).filter((row) => {
      const month = Number(row.month);
      return Number.isFinite(month) && month >= 1 && month <= 12 && toNumber(row.allocation) > 0;
    });

    if (positiveAllocations.length > 0) {
      for (const row of positiveAllocations) {
        const monthIndex = Number(row.month) - 1;
        buckets[monthIndex] = (buckets[monthIndex] ?? 0) + toNumber(row.allocation);
      }
      continue;
    }

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
 * Bucket Other Receive credits into months 1..12 as signed negatives.
 * Only rows for the plan's fiscal year (when fiscalYear is present on the row)
 * contribute. Amounts are always stored as -|amount| so legacy positive ORV
 * saves still reduce realization correctly.
 */
export function bucketOrvCreditsByMonth(
  orvCredits: OrvCreditInput[],
  fiscalYear: number,
): number[] {
  const buckets = new Array(12).fill(0) as number[];
  for (const credit of orvCredits) {
    if (credit.fiscalYear != null && Number(credit.fiscalYear) !== fiscalYear) continue;
    const month = Number(credit.month);
    if (!Number.isFinite(month) || month < 1 || month > 12) continue;
    const raw = toNumber(credit.amount);
    if (raw === 0) continue;
    buckets[month - 1] = (buckets[month - 1] ?? 0) + -Math.abs(raw);
  }
  return buckets;
}

/**
 * Enrich each allocation row with `realization` (current month) and
 * `outstanding` (running cumulative balance up to that month).
 *
 * Allocations are sorted by month before accumulation to guarantee a stable
 * cumulative result regardless of input order.
 *
 * Optional `orvCredits` (saved Other Receive) reduce effective realization
 * per month and therefore increase outstanding.
 */
export function enrichAllocationsWithRealization(
  allocations: AllocationInput[],
  linkedRequests: LinkedRequestInput[],
  fiscalYear: number,
  orvCredits: OrvCreditInput[] = [],
): EnrichedAllocation[] {
  const brBuckets = bucketRealizationByMonth(linkedRequests, fiscalYear);
  const orvBuckets = bucketOrvCreditsByMonth(orvCredits, fiscalYear);
  const sorted = [...allocations].sort((a, b) => a.month - b.month);

  let cumulativeAllocation = 0;
  let cumulativeRealization = 0;

  return sorted.map((row) => {
    const allocation = toNumber(row.allocation);
    const realization = (brBuckets[row.month - 1] ?? 0) + (orvBuckets[row.month - 1] ?? 0);
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

/** Annual totals: BR realization + ORV credits (signed). */
export function sumPlanRealization(
  linkedRequests: LinkedRequestInput[],
  fiscalYear: number,
  orvCredits: OrvCreditInput[] = [],
): number {
  const br = bucketRealizationByMonth(linkedRequests, fiscalYear).reduce((s, v) => s + v, 0);
  const orv = bucketOrvCreditsByMonth(orvCredits, fiscalYear).reduce((s, v) => s + v, 0);
  return br + orv;
}
