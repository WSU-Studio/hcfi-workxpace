import type { Prisma, PrismaClient } from '@prisma/client';
import type { DashboardView } from '@/types/access-control';
import type {
  DashboardAlert,
  DashboardDepartmentPoint,
  DashboardHeatmapCell,
  DashboardNamedAmount,
  DashboardSummaryResponse,
  DashboardTransaction,
} from '@/types/dashboard';
import {
  buildPareto,
  costPerDriverUnit,
  elapsedMonthsThrough,
  forecastVsBudget,
  fyForecastRecommended,
  fyForecastRunRate,
  momVariance,
  momVariancePercent,
  monthlyRunRate,
  quarterMonthRange,
  ratioPercent,
  remainingBudget,
  resolveCutOffMonth,
  topVendorConcentration,
} from '@/lib/dashboard/metrics';
import {
  classificationMatchFilter,
  loadClassificationLabelMaps,
  resolveClassificationLabel,
} from '@/lib/data-mart/resolve-classification-labels';
import { selectableDepartmentWhere } from '@/lib/department/selectable';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const unspecified = '(Unspecified)';

export type DashboardAggregateQuery = {
  fiscalYear: number;
  quarter: number | null;
  month: number | null;
  departmentId: string | null;
  expenseCategory: string | null;
  vendorName: string | null;
  activity: string | null;
  projectCode: string | null;
  expenseType: string | null;
};

function toNum(value: unknown): number {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function labelOf(value: string | null | undefined): string {
  const trimmed = value?.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed : unspecified;
}

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function monthClause(from: number | null, to: number | null): Prisma.IntFilter | number | undefined {
  if (from != null && to != null && from === to) return from;
  if (from != null || to != null) {
    return {
      ...(from != null ? { gte: from } : {}),
      ...(to != null ? { lte: to } : {}),
    };
  }
  return undefined;
}

function namedAmounts(
  groups: Array<{ key: string | null; actual: unknown; plan?: unknown; budget?: unknown }>,
): DashboardNamedAmount[] {
  const merged = new Map<string, DashboardNamedAmount>();
  for (const row of groups) {
    const label = labelOf(row.key);
    const bucket = normalizeLabel(label);
    const actual = toNum(row.actual);
    const plan = row.plan === undefined ? undefined : toNum(row.plan);
    const budget = row.budget === undefined ? undefined : toNum(row.budget);
    const existing = merged.get(bucket);
    if (!existing) {
      merged.set(bucket, { label, actual, plan, budget });
      continue;
    }
    existing.actual += actual;
    if (plan !== undefined || existing.plan !== undefined) {
      existing.plan = (existing.plan ?? 0) + (plan ?? 0);
    }
    if (budget !== undefined || existing.budget !== undefined) {
      existing.budget = (existing.budget ?? 0) + (budget ?? 0);
    }
  }
  return [...merged.values()].sort((a, b) => b.actual - a.actual);
}

export async function buildDashboardSummary(args: {
  prisma: PrismaClient;
  persona: DashboardView;
  viewAllDepartments: boolean;
  scopedDepartmentId: string | null;
  query: DashboardAggregateQuery;
}): Promise<DashboardSummaryResponse> {
  const { prisma, persona, viewAllDepartments, scopedDepartmentId, query } = args;
  const cutOffMonth = resolveCutOffMonth({
    month: query.month,
    quarter: query.quarter,
    fiscalYear: query.fiscalYear,
  });
  const quarterRange = query.quarter != null ? quarterMonthRange(query.quarter) : null;
  const windowFrom = quarterRange?.from ?? 1;
  const windowTo = quarterRange?.to ?? 12;
  const ytdTo = Math.min(cutOffMonth, windowTo);
  const ytdFrom = windowFrom;

  const labelMaps = await loadClassificationLabelMaps();

  const dimensionWhere: Prisma.DataMartStagingRowWhereInput = {
    fiscalYear: query.fiscalYear,
    ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}),
    ...(!scopedDepartmentId && query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.expenseCategory
      ? { expenseCategory: classificationMatchFilter(labelMaps.categoryById, query.expenseCategory) }
      : {}),
    ...(query.vendorName ? { vendorName: query.vendorName } : {}),
    ...(query.activity ? { activityLabel: query.activity } : {}),
    ...(query.projectCode ? { projectCode: query.projectCode } : {}),
    ...(query.expenseType ? { expenseTypeFp: query.expenseType } : {}),
  };

  const windowMonth = monthClause(windowFrom, windowTo);
  const ytdMonth = monthClause(ytdFrom, ytdTo);

  const windowWhere: Prisma.DataMartStagingRowWhereInput = {
    ...dimensionWhere,
    ...(windowMonth !== undefined ? { month: windowMonth } : {}),
  };
  const ytdWhere: Prisma.DataMartStagingRowWhereInput = {
    ...dimensionWhere,
    ...(ytdMonth !== undefined ? { month: ytdMonth } : {}),
  };

  const remainingPlanWhere: Prisma.DataMartStagingRowWhereInput = {
    ...dimensionWhere,
    month: { gte: ytdTo + 1, lte: windowTo },
  };

  const [
    windowSums,
    ytdSums,
    remainingPlanSums,
    monthlyGroups,
    categoryGroups,
    vendorGroups,
    activityGroups,
    expenseTypeGroups,
    departmentGroups,
    heatmapGroups,
    glGroups,
    driverGroups,
    transactionRows,
    approvedRequests,
    pendingPaymentRequests,
    filterDepartments,
    categoryOptions,
    vendorOptions,
    activityOptions,
    projectOptions,
    expenseTypeOptions,
  ] = await Promise.all([
    prisma.dataMartStagingRow.aggregate({
      where: windowWhere,
      _sum: { expectedAmount: true, paidAmount: true, planAmount: true },
    }),
    prisma.dataMartStagingRow.aggregate({
      where: ytdWhere,
      _sum: { expectedAmount: true, paidAmount: true, planAmount: true },
    }),
    prisma.dataMartStagingRow.aggregate({
      where: remainingPlanWhere,
      _sum: { planAmount: true },
    }),
    prisma.dataMartStagingRow.groupBy({
      by: ['month'],
      where: windowWhere,
      _sum: { expectedAmount: true, paidAmount: true, planAmount: true },
    }),
    prisma.dataMartStagingRow.groupBy({
      by: ['expenseCategory'],
      where: ytdWhere,
      _sum: { paidAmount: true, planAmount: true, expectedAmount: true },
    }),
    prisma.dataMartStagingRow.groupBy({
      by: ['vendorName'],
      where: ytdWhere,
      _sum: { paidAmount: true },
    }),
    prisma.dataMartStagingRow.groupBy({
      by: ['activityLabel'],
      where: ytdWhere,
      _sum: { paidAmount: true },
    }),
    prisma.dataMartStagingRow.groupBy({
      by: ['month', 'expenseTypeFp'],
      where: ytdWhere,
      _sum: { paidAmount: true },
    }),
    prisma.dataMartStagingRow.groupBy({
      by: ['departmentId', 'departmentName'],
      where: ytdWhere,
      _sum: { paidAmount: true, planAmount: true, expectedAmount: true },
    }),
    prisma.dataMartStagingRow.groupBy({
      by: ['departmentName', 'month'],
      where: windowWhere,
      _sum: { paidAmount: true, expectedAmount: true },
    }),
    prisma.dataMartStagingRow.groupBy({
      by: ['glAccountCode', 'glAccountName'],
      where: ytdWhere,
      _sum: { paidAmount: true },
    }),
    prisma.dataMartStagingRow.groupBy({
      by: ['vendorName'],
      where: ytdWhere,
      _sum: { paidAmount: true, costDriverMetric: true },
    }),
    prisma.dataMartStagingRow.findMany({
      where: ytdWhere,
      orderBy: { paidAmount: 'desc' },
      take: 10,
      select: {
        id: true,
        invoiceDate: true,
        paymentRequestDate: true,
        savedAt: true,
        departmentName: true,
        vendorName: true,
        paymentDescription: true,
        budgetRequestCode: true,
        glAccountCode: true,
        glAccountName: true,
        paidAmount: true,
        matchType: true,
      },
    }),
    prisma.budgetRequest.findMany({
      where: {
        status: 'Approved',
        fiscalYear: query.fiscalYear,
        ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}),
        ...(!scopedDepartmentId && query.departmentId ? { departmentId: query.departmentId } : {}),
      },
      select: {
        id: true,
        grandTotal: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    }),
    prisma.paymentRequest.findMany({
      where: {
        status: { in: ['Draft', 'Pending', 'Reviewed', 'Revision'] },
        fiscalYear: query.fiscalYear,
        ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}),
        ...(!scopedDepartmentId && query.departmentId ? { departmentId: query.departmentId } : {}),
      },
      select: {
        id: true,
        amount: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    }),
    prisma.department.findMany({
      where: selectableDepartmentWhere(),
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.dataMartStagingRow.findMany({
      where: { fiscalYear: query.fiscalYear, ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}) },
      distinct: ['expenseCategory'],
      select: { expenseCategory: true },
    }),
    prisma.dataMartStagingRow.findMany({
      where: { fiscalYear: query.fiscalYear, ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}) },
      distinct: ['vendorName'],
      select: { vendorName: true },
    }),
    prisma.dataMartStagingRow.findMany({
      where: { fiscalYear: query.fiscalYear, ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}) },
      distinct: ['activityLabel'],
      select: { activityLabel: true },
    }),
    prisma.dataMartStagingRow.findMany({
      where: { fiscalYear: query.fiscalYear, ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}) },
      distinct: ['projectCode', 'projectName'],
      select: { projectCode: true, projectName: true },
    }),
    prisma.dataMartStagingRow.findMany({
      where: { fiscalYear: query.fiscalYear, ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}) },
      distinct: ['expenseTypeFp'],
      select: { expenseTypeFp: true },
    }),
  ]);

  const paidByRequest = approvedRequests.length
    ? await prisma.dataMartStagingRow.groupBy({
        by: ['budgetRequestId', 'departmentId', 'departmentName'],
        where: {
          fiscalYear: query.fiscalYear,
          budgetRequestId: { in: approvedRequests.map((row) => row.id) },
        },
        _sum: { paidAmount: true },
      })
    : [];

  const paidByRequestId = new Map(paidByRequest.map((row) => [row.budgetRequestId, toNum(row._sum.paidAmount)]));

  let outstandingGrCount = 0;
  let outstandingGrAmount = 0;
  const outstandingByDept = new Map<string, { count: number; amount: number; name: string }>();
  for (const request of approvedRequests) {
    const paid = paidByRequestId.get(request.id) ?? 0;
    const gap = Math.max(0, toNum(request.grandTotal) - paid);
    if (gap <= 0) continue;
    outstandingGrCount += 1;
    outstandingGrAmount += gap;
    const key = request.departmentId;
    const current = outstandingByDept.get(key) ?? {
      count: 0,
      amount: 0,
      name: request.department.name,
    };
    current.count += 1;
    current.amount += gap;
    outstandingByDept.set(key, current);
  }

  const pendingByDept = new Map<string, { count: number; amount: number; name: string }>();
  let pendingPrCount = 0;
  let pendingPrAmount = 0;
  for (const pr of pendingPaymentRequests) {
    pendingPrCount += 1;
    pendingPrAmount += toNum(pr.amount);
    const key = pr.departmentId;
    const current = pendingByDept.get(key) ?? {
      count: 0,
      amount: 0,
      name: pr.department.name,
    };
    current.count += 1;
    current.amount += toNum(pr.amount);
    pendingByDept.set(key, current);
  }

  const totalBudget = toNum(windowSums._sum.expectedAmount);
  const planYtd = toNum(ytdSums._sum.planAmount);
  const actualYtd = toNum(ytdSums._sum.paidAmount);
  const remainingPlan = toNum(remainingPlanSums._sum.planAmount);
  const elapsed = elapsedMonthsThrough(ytdTo);
  const forecastRecommended = fyForecastRecommended(actualYtd, remainingPlan);
  const forecastRunRate = fyForecastRunRate(actualYtd, elapsed);

  const monthlyByNumber = new Map(
    monthlyGroups.map((row) => [
      row.month,
      {
        budget: toNum(row._sum.expectedAmount),
        plan: toNum(row._sum.planAmount),
        actual: toNum(row._sum.paidAmount),
      },
    ]),
  );

  const monthly = [];
  for (let month = windowFrom; month <= windowTo; month += 1) {
    const point = monthlyByNumber.get(month) ?? { budget: 0, plan: 0, actual: 0 };
    monthly.push({ month, label: MONTH_LABELS[month - 1] ?? String(month), ...point });
  }

  const currentMonthActual = monthlyByNumber.get(ytdTo)?.actual ?? 0;
  const previousMonthActual = monthlyByNumber.get(ytdTo - 1)?.actual ?? 0;

  const byCategory = namedAmounts(
    categoryGroups.map((row) => ({
      key: resolveClassificationLabel(labelMaps.categoryById, row.expenseCategory),
      actual: row._sum.paidAmount,
      plan: row._sum.planAmount,
      budget: row._sum.expectedAmount,
    })),
  );
  const byVendor = namedAmounts(
    vendorGroups.map((row) => ({ key: row.vendorName, actual: row._sum.paidAmount })),
  );
  const byActivity = namedAmounts(
    activityGroups.map((row) => ({ key: row.activityLabel, actual: row._sum.paidAmount })),
  );

  const typeByMonth = new Map<number, DashboardNamedAmount[]>();
  for (const row of expenseTypeGroups) {
    const slices = typeByMonth.get(row.month) ?? [];
    slices.push({ label: labelOf(row.expenseTypeFp), actual: toNum(row._sum.paidAmount) });
    typeByMonth.set(row.month, slices);
  }
  const byExpenseTypeMonth = monthly.map((point) => ({
    month: point.month,
    label: point.label,
    slices: typeByMonth.get(point.month) ?? [],
  }));

  const byDepartmentMap = new Map<string, DashboardDepartmentPoint>();
  for (const row of departmentGroups) {
    const departmentName = labelOf(row.departmentName);
    const bucket = normalizeLabel(departmentName);
    const budget = toNum(row._sum.expectedAmount);
    const actual = toNum(row._sum.paidAmount);
    const plan = toNum(row._sum.planAmount);
    const outstanding = outstandingByDept.get(row.departmentId ?? '') ?? { count: 0, amount: 0, name: '' };
    const pending = pendingByDept.get(row.departmentId ?? '') ?? { count: 0, amount: 0, name: '' };
    const existing = byDepartmentMap.get(bucket);
    if (!existing) {
      byDepartmentMap.set(bucket, {
        departmentId: row.departmentId ?? '',
        departmentName,
        budget,
        plan,
        actual,
        utilizationPercent: null,
        outstandingGrCount: outstanding.count,
        outstandingGrAmount: outstanding.amount,
        pendingPrCount: pending.count,
        pendingPrAmount: pending.amount,
      });
      continue;
    }
    existing.budget += budget;
    existing.plan += plan;
    existing.actual += actual;
    existing.outstandingGrCount += outstanding.count;
    existing.outstandingGrAmount += outstanding.amount;
    existing.pendingPrCount += pending.count;
    existing.pendingPrAmount += pending.amount;
    if (!existing.departmentId && row.departmentId) {
      existing.departmentId = row.departmentId;
    }
  }
  const byDepartment: DashboardDepartmentPoint[] = [...byDepartmentMap.values()]
    .map((row) => ({
      ...row,
      utilizationPercent: ratioPercent(row.actual, row.budget),
    }))
    .sort((a, b) => b.actual - a.actual);

  const heatmapMap = new Map<string, { departmentName: string; month: number; actual: number; budget: number }>();
  for (const row of heatmapGroups) {
    const departmentName = labelOf(row.departmentName);
    const bucket = `${normalizeLabel(departmentName)}-${row.month}`;
    const existing = heatmapMap.get(bucket) ?? {
      departmentName,
      month: row.month,
      actual: 0,
      budget: 0,
    };
    existing.actual += toNum(row._sum.paidAmount);
    existing.budget += toNum(row._sum.expectedAmount);
    heatmapMap.set(bucket, existing);
  }
  const heatmap: DashboardHeatmapCell[] = [...heatmapMap.values()].map((row) => ({
    departmentName: row.departmentName,
    month: row.month,
    utilizationPercent: ratioPercent(row.actual, row.budget),
  }));

  const byGlAccount = namedAmounts(
    glGroups.map((row) => ({
      key: [row.glAccountCode, row.glAccountName].filter(Boolean).join(' — ') || null,
      actual: row._sum.paidAmount,
    })),
  );

  const paretoVendors = buildPareto(
    byVendor.map((row) => ({ label: row.label, actual: row.actual })),
    actualYtd,
  ).slice(0, 12);

  const costDrivers = driverGroups
    .map((row) => {
      const actual = toNum(row._sum.paidAmount);
      const volume = toNum(row._sum.costDriverMetric);
      return {
        label: labelOf(row.vendorName),
        volume,
        actual,
        costPerUnit: costPerDriverUnit(actual, volume),
      };
    })
    .filter((row) => row.volume > 0 || row.actual > 0)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 20);

  const alerts = buildAlerts(byCategory, byDepartment, outstandingGrCount, pendingPrCount);

  const transactions: DashboardTransaction[] = transactionRows.map((row) => ({
    id: row.id,
    date: (row.invoiceDate ?? row.paymentRequestDate ?? row.savedAt)?.toISOString() ?? null,
    departmentName: row.departmentName,
    vendorName: row.vendorName,
    description: row.paymentDescription,
    budgetRequestCode: row.budgetRequestCode,
    glAccount: [row.glAccountCode, row.glAccountName].filter(Boolean).join(' — ') || null,
    amount: toNum(row.paidAmount),
    matchType: row.matchType,
  }));

  const visibleDepartments = viewAllDepartments
    ? filterDepartments
    : filterDepartments.filter((dept) => dept.id === scopedDepartmentId);

  return {
    persona,
    viewAllDepartments,
    scopedToDepartmentId: scopedDepartmentId,
    fiscalYear: query.fiscalYear,
    quarter: query.quarter,
    month: query.month,
    cutOffMonth,
    kpis: {
      totalBudget,
      planYtd,
      actualYtd,
      remainingBudget: remainingBudget(totalBudget, actualYtd),
      budgetUtilizationPercent: ratioPercent(actualYtd, totalBudget),
      planAchievementPercent: ratioPercent(actualYtd, planYtd),
      planVariance: actualYtd - planYtd,
      budgetVariance: actualYtd - totalBudget,
      outstandingGrCount,
      outstandingGrAmount,
      paymentRequestsPaid: actualYtd,
      pendingPrCount,
      pendingPrAmount,
      monthlyRunRate: monthlyRunRate(actualYtd, elapsed),
      fyForecastRecommended: forecastRecommended,
      fyForecastRunRate: forecastRunRate,
      forecastVsBudget: forecastVsBudget(forecastRecommended, totalBudget),
      burnRatePercent: ratioPercent(forecastRunRate ?? forecastRecommended, totalBudget),
      momVariance: momVariance(currentMonthActual, previousMonthActual),
      momVariancePercent: momVariancePercent(currentMonthActual, previousMonthActual),
      topVendorConcentrationPercent: topVendorConcentration(byVendor, actualYtd, 5),
    },
    monthly,
    byCategory,
    byVendor: byVendor.slice(0, 10),
    byActivity: byActivity.slice(0, 10),
    byExpenseTypeMonth,
    byDepartment,
    heatmap,
    byGlAccount: byGlAccount.slice(0, 12),
    paretoVendors,
    costDrivers,
    alerts,
    transactions,
    filterOptions: {
      departments: visibleDepartments,
      categories: uniqueLabels(
        categoryOptions.map((row) => resolveClassificationLabel(labelMaps.categoryById, row.expenseCategory)),
      ),
      vendors: uniqueLabels(vendorOptions.map((row) => row.vendorName)),
      activities: uniqueLabels(activityOptions.map((row) => row.activityLabel)),
      projects: projectOptions
        .filter((row) => row.projectCode)
        .map((row) => ({ code: row.projectCode as string, name: row.projectName ?? row.projectCode ?? '' }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      expenseTypes: uniqueLabels(expenseTypeOptions.map((row) => row.expenseTypeFp)),
    },
  };
}

function uniqueLabels(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function buildAlerts(
  byCategory: DashboardNamedAmount[],
  byDepartment: DashboardDepartmentPoint[],
  outstandingGrCount: number,
  pendingPrCount: number,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  for (const row of byCategory) {
    if ((row.plan ?? 0) > 0 && row.actual > (row.plan ?? 0)) {
      alerts.push({
        id: `category-over-plan-${row.label}`,
        severity: 'critical',
        title: `${row.label} above plan`,
        detail: `Actual exceeds plan for this category. Review remaining spend before period close.`,
      });
    } else if ((row.budget ?? 0) > 0 && row.actual / (row.budget ?? 0) >= 0.9) {
      alerts.push({
        id: `category-util-${row.label}`,
        severity: 'warning',
        title: `${row.label} utilization is high`,
        detail: `Budget consumption is at or above 90% of approved GR for this category.`,
      });
    }
  }

  for (const row of byDepartment) {
    if ((row.utilizationPercent ?? 0) > 100) {
      alerts.push({
        id: `dept-over-budget-${row.departmentId}`,
        severity: 'critical',
        title: `${row.departmentName} over budget`,
        detail: `Actual YTD is above approved budget for this department.`,
      });
    }
  }

  if (outstandingGrCount > 0) {
    alerts.push({
      id: 'outstanding-gr',
      severity: outstandingGrCount >= 5 ? 'critical' : 'warning',
      title: 'Outstanding GR',
      detail: `${outstandingGrCount} approved budget request(s) still have unconsumed amount.`,
    });
  }

  if (pendingPrCount > 0) {
    alerts.push({
      id: 'pending-pr',
      severity: 'warning',
      title: 'Payment requests pending',
      detail: `${pendingPrCount} payment request(s) are still in workflow.`,
    });
  }

  return alerts.slice(0, 8);
}
