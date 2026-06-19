import type { DataMartStagingApiRow } from '@/types/data-mart-staging';

/**
 * Pivot Data Mart staging rows into the shape used by the "Budget Pivot"
 * report. Pure function — no DOM/network — so it's testable and reusable for
 * exports.
 *
 * The report mockup HCFI sent puts THREE metric blocks side-by-side:
 *   • Actual         (← `paidAmount`)
 *   • Budget Request (← `expectedAmount`, the BR/GR approved amount)
 *   • Budget Plan    (← `planAmount`)
 * Each block is 12 monthly cells + an FY total.
 *
 * Hierarchy (rows): Origin Office › Department › leaf
 *   leaf identity = (Category Key Index, Expense Category, GL Account, GL
 *   Account Name, Description). Each leaf carries all three metric buckets;
 *   group nodes carry per-metric subtotals; a per-metric grand total is also
 *   returned. Storing all three metrics together lets a UI either show all
 *   side-by-side or render only one section without re-aggregating.
 */

export type MonthlyAmounts = readonly number[];

export const PIVOT_METRICS = ['actual', 'budgetRequest', 'budgetPlan'] as const;
export type PivotMetric = (typeof PIVOT_METRICS)[number];

export const PIVOT_METRIC_LABELS: Record<PivotMetric, string> = {
  actual: 'Actual',
  budgetRequest: 'Budget Request',
  budgetPlan: 'Budget Plan',
};

/** Maps a metric to the staging-row field it aggregates. */
export const PIVOT_METRIC_TO_FIELD: Record<
  PivotMetric,
  'paidAmount' | 'expectedAmount' | 'planAmount'
> = {
  actual: 'paidAmount',
  budgetRequest: 'expectedAmount',
  budgetPlan: 'planAmount',
};

export type MetricBucket = {
  monthly: MonthlyAmounts;
  fy: number;
};

export type MetricMap = Record<PivotMetric, MetricBucket>;

export type PivotLeafRow = {
  categoryKeyIndex: string;
  expenseCategory: string;
  glAccountCode: string;
  glAccountName: string;
  description: string;
  metrics: MetricMap;
};

export type PivotDepartmentGroup = {
  department: string;
  leaves: PivotLeafRow[];
  subtotals: MetricMap;
};

export type PivotOriginOfficeGroup = {
  originOffice: string;
  departments: PivotDepartmentGroup[];
  subtotals: MetricMap;
};

export type PivotedReport = {
  origins: PivotOriginOfficeGroup[];
  grandTotals: MetricMap;
  leafCount: number;
};

const FALLBACK = '—';

function makeMetricsMutable(): Record<PivotMetric, { monthly: number[]; fy: number }> {
  return {
    actual: { monthly: Array.from({ length: 12 }, () => 0), fy: 0 },
    budgetRequest: { monthly: Array.from({ length: 12 }, () => 0), fy: 0 },
    budgetPlan: { monthly: Array.from({ length: 12 }, () => 0), fy: 0 },
  };
}

function readAmount(row: DataMartStagingApiRow, metric: PivotMetric): number {
  const raw = row[PIVOT_METRIC_TO_FIELD[metric]];
  if (raw == null) return 0;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function safeText(value: string | null | undefined): string {
  if (!value) return FALLBACK;
  const trimmed = value.trim();
  return trimmed === '' ? FALLBACK : trimmed;
}

function addBucket(
  target: { monthly: number[]; fy: number },
  source: { monthly: MonthlyAmounts; fy: number },
): void {
  for (let i = 0; i < 12; i++) target.monthly[i] += source.monthly[i] ?? 0;
  target.fy += source.fy;
}

function applyMonthly(
  target: Record<PivotMetric, { monthly: number[]; fy: number }>,
  metric: PivotMetric,
  monthIdx: number,
  amount: number,
): void {
  if (monthIdx < 0 || monthIdx > 11) return;
  target[metric].monthly[monthIdx] += amount;
  target[metric].fy += amount;
}

/**
 * Aggregate flat staging rows into the hierarchical pivot shape. Stable order:
 * origin offices alphabetical, departments alphabetical, leaves alphabetical
 * by (catKeyIndex, expenseCategory, glAccountCode, description). Predictable
 * ordering matches the manually-arranged Excel reports HCFI is used to.
 *
 * Leaves where ALL three metrics are zero are dropped — that mirrors Excel's
 * convention of suppressing fully-empty rows so the table stays compact.
 * Leaves with at least one non-zero metric are kept (the other zeros render
 * as "—").
 */
export function pivotDataMartRows(rows: DataMartStagingApiRow[]): PivotedReport {
  type LeafMutable = Omit<PivotLeafRow, 'metrics'> & {
    metrics: ReturnType<typeof makeMetricsMutable>;
  };
  const originMap = new Map<string, Map<string, Map<string, LeafMutable>>>();

  for (const row of rows) {
    const monthIdx = (row.month ?? 0) - 1;
    if (monthIdx < 0 || monthIdx > 11) continue;

    const actualAmt = readAmount(row, 'actual');
    const brAmt = readAmount(row, 'budgetRequest');
    const bpAmt = readAmount(row, 'budgetPlan');
    if (actualAmt === 0 && brAmt === 0 && bpAmt === 0) continue;

    const originKey = safeText(row.originOffice);
    const deptKey = safeText(row.departmentName);
    const cki = safeText(row.categoryKeyIndex);
    const expense = safeText(row.expenseCategory);
    const glCode = safeText(row.glAccountCode);
    const glName = safeText(row.glAccountName);
    const description = safeText(row.paymentDescription ?? row.budgetRequestSubject);
    const leafKey = `${cki}|${expense}|${glCode}|${glName}|${description}`;

    let deptMap = originMap.get(originKey);
    if (!deptMap) {
      deptMap = new Map();
      originMap.set(originKey, deptMap);
    }
    let leafMap = deptMap.get(deptKey);
    if (!leafMap) {
      leafMap = new Map();
      deptMap.set(deptKey, leafMap);
    }
    let leaf = leafMap.get(leafKey);
    if (!leaf) {
      leaf = {
        categoryKeyIndex: cki,
        expenseCategory: expense,
        glAccountCode: glCode,
        glAccountName: glName,
        description,
        metrics: makeMetricsMutable(),
      };
      leafMap.set(leafKey, leaf);
    }

    applyMonthly(leaf.metrics, 'actual', monthIdx, actualAmt);
    applyMonthly(leaf.metrics, 'budgetRequest', monthIdx, brAmt);
    applyMonthly(leaf.metrics, 'budgetPlan', monthIdx, bpAmt);
  }

  const grandTotals = makeMetricsMutable();
  let leafCount = 0;
  const origins: PivotOriginOfficeGroup[] = [];

  const sortedOriginKeys = Array.from(originMap.keys()).sort((a, b) => a.localeCompare(b));
  for (const originKey of sortedOriginKeys) {
    const deptMap = originMap.get(originKey)!;
    const originSub = makeMetricsMutable();
    const departments: PivotDepartmentGroup[] = [];

    const sortedDeptKeys = Array.from(deptMap.keys()).sort((a, b) => a.localeCompare(b));
    for (const deptKey of sortedDeptKeys) {
      const leafMap = deptMap.get(deptKey)!;
      const deptSub = makeMetricsMutable();

      const leaves: PivotLeafRow[] = Array.from(leafMap.values()).sort(
        (a, b) =>
          a.categoryKeyIndex.localeCompare(b.categoryKeyIndex) ||
          a.expenseCategory.localeCompare(b.expenseCategory) ||
          a.glAccountCode.localeCompare(b.glAccountCode) ||
          a.description.localeCompare(b.description),
      );

      for (const leaf of leaves) {
        addBucket(deptSub.actual, leaf.metrics.actual);
        addBucket(deptSub.budgetRequest, leaf.metrics.budgetRequest);
        addBucket(deptSub.budgetPlan, leaf.metrics.budgetPlan);
        leafCount++;
      }
      addBucket(originSub.actual, deptSub.actual);
      addBucket(originSub.budgetRequest, deptSub.budgetRequest);
      addBucket(originSub.budgetPlan, deptSub.budgetPlan);

      departments.push({
        department: deptKey,
        leaves,
        subtotals: deptSub,
      });
    }

    addBucket(grandTotals.actual, originSub.actual);
    addBucket(grandTotals.budgetRequest, originSub.budgetRequest);
    addBucket(grandTotals.budgetPlan, originSub.budgetPlan);

    origins.push({
      originOffice: originKey,
      departments,
      subtotals: originSub,
    });
  }

  return {
    origins,
    grandTotals,
    leafCount,
  };
}

/** Lightweight placeholder for callers that need an empty report. */
export function emptyPivotedReport(): PivotedReport {
  const empty = makeMetricsMutable();
  return {
    origins: [],
    grandTotals: empty,
    leafCount: 0,
  };
}
