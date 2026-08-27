/**
 * Pure FP&A dashboard formulas. Keep this free of Prisma so the same
 * arithmetic can be reused by the summary API, charts, and tests.
 */

export function remainingBudget(totalBudget: number, actualYtd: number): number {
  return totalBudget - actualYtd;
}

export function ratioPercent(numerator: number, denominator: number): number | null {
  if (!(denominator > 0)) return null;
  return (numerator / denominator) * 100;
}

export function monthlyRunRate(actualYtd: number, elapsedMonths: number): number | null {
  if (!(elapsedMonths > 0)) return null;
  return actualYtd / elapsedMonths;
}

/** Actual YTD + remaining Plan (recommended outlook). */
export function fyForecastRecommended(actualYtd: number, remainingPlan: number): number {
  return actualYtd + remainingPlan;
}

/** Annualized current pace. */
export function fyForecastRunRate(actualYtd: number, elapsedMonths: number): number | null {
  const runRate = monthlyRunRate(actualYtd, elapsedMonths);
  if (runRate === null) return null;
  return runRate * 12;
}

export function forecastVsBudget(forecast: number, totalBudget: number): number {
  return forecast - totalBudget;
}

export function momVariance(current: number, previous: number): number {
  return current - previous;
}

export function momVariancePercent(current: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return ((current - previous) / previous) * 100;
}

export function vendorContributionPercent(vendorActual: number, totalActual: number): number | null {
  return ratioPercent(vendorActual, totalActual);
}

export type NamedAmount = { label: string; actual: number };

export type ParetoRow = NamedAmount & {
  contributionPercent: number;
  cumulativePercent: number;
};

export function buildPareto(rows: NamedAmount[], totalActual: number): ParetoRow[] {
  const sorted = [...rows].sort((a, b) => b.actual - a.actual);
  let running = 0;
  return sorted.map((row) => {
    const contribution = totalActual > 0 ? (row.actual / totalActual) * 100 : 0;
    running += contribution;
    return {
      ...row,
      contributionPercent: contribution,
      cumulativePercent: Math.min(100, running),
    };
  });
}

export function topVendorConcentration(rows: NamedAmount[], totalActual: number, topN: number): number | null {
  if (!(totalActual > 0)) return null;
  const top = [...rows].sort((a, b) => b.actual - a.actual).slice(0, topN);
  const sum = top.reduce((acc, row) => acc + row.actual, 0);
  return (sum / totalActual) * 100;
}

export function costPerDriverUnit(actual: number, driverMetric: number): number | null {
  if (!(driverMetric > 0)) return null;
  return actual / driverMetric;
}

export function elapsedMonthsThrough(cutOffMonth: number): number {
  if (cutOffMonth < 1) return 0;
  return Math.min(12, Math.max(1, Math.trunc(cutOffMonth)));
}

export function quarterMonthRange(quarter: number): { from: number; to: number } | null {
  if (quarter < 1 || quarter > 4) return null;
  const to = quarter * 3;
  return { from: to - 2, to };
}

export function resolveCutOffMonth(args: {
  month: number | null;
  quarter: number | null;
  fiscalYear: number;
  now?: Date;
}): number {
  if (args.month != null && args.month >= 1 && args.month <= 12) return args.month;
  if (args.quarter != null) {
    const range = quarterMonthRange(args.quarter);
    if (range) return range.to;
  }
  const now = args.now ?? new Date();
  if (args.fiscalYear === now.getFullYear()) return now.getMonth() + 1;
  if (args.fiscalYear < now.getFullYear()) return 12;
  return 1;
}
