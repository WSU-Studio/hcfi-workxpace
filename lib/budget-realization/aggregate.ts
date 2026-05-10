/**
 * Pure aggregation untuk laporan Budget Plan Realization.
 *
 * Disengaja tidak bergantung pada Prisma agar:
 * - Mudah di-unit-test
 * - Bisa dipakai ulang di server / client / tooling lain
 *
 * Convention: nilai uang masuk dalam bentuk Decimal-like (object dengan
 * `.toString()`) atau number, dan keluar dalam bentuk string desimal
 * (jaga presisi, tidak kehilangan precision saat besar).
 */

import type {
  BudgetPlanStatus,
  BudgetRealizationRow,
  BudgetRealizationResponse,
  BudgetRequestStatus,
  RealizationRequestSummary,
} from '@/types/budget-realization';

/** Apa pun yang punya `.toString()` (Prisma Decimal, BigInt, number, string). */
export type DecimalLike = { toString(): string } | number | string | null | undefined;

/** Bentuk minimum BudgetRequest untuk perhitungan agregasi. */
export interface AggregatableRequest {
  id: string;
  code: string;
  subject: string;
  status: string;
  requestorName?: string | null;
  requestDate: Date | string;
  grandTotal: DecimalLike;
}

/** Bentuk minimum BudgetPlan untuk perhitungan agregasi. */
export interface AggregatablePlan {
  id: string;
  code: string;
  subject: string;
  fiscalYear: number;
  status: string;
  department: { name: string } | null;
  allocations: { allocation: DecimalLike }[];
  budgetRequests: AggregatableRequest[];
}

const APPROVED_STATUSES = new Set(['Approved']);

/** Konversi DecimalLike -> number aman untuk perhitungan ringkasan. */
const toNumber = (value: DecimalLike): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Konversi DecimalLike -> string desimal kanonik. */
const toDecimalString = (value: DecimalLike): string => {
  if (value === null || value === undefined) return '0';
  return value.toString();
};

const sum = (values: DecimalLike[]): number =>
  values.reduce<number>((acc, v) => acc + toNumber(v), 0);

const formatNumberAsDecimal = (n: number): string =>
  Number.isFinite(n) ? n.toFixed(2) : '0';

/** Ratio request terhadap plan (dalam %). null bila plan = 0 (tidak terdefinisi). */
export const calcUtilizationPercent = (planTotal: number, requestedTotal: number): number | null => {
  if (planTotal <= 0) return null;
  return (requestedTotal / planTotal) * 100;
};

const isPlanStatus = (status: string): BudgetPlanStatus => status as BudgetPlanStatus;
const isRequestStatus = (status: string): BudgetRequestStatus => status as BudgetRequestStatus;

const buildRequestSummary = (req: AggregatableRequest): RealizationRequestSummary => ({
  id: req.id,
  code: req.code,
  subject: req.subject,
  status: isRequestStatus(req.status),
  requestorName: req.requestorName ?? null,
  requestDate: typeof req.requestDate === 'string' ? req.requestDate : req.requestDate.toISOString(),
  grandTotal: toDecimalString(req.grandTotal),
});

/** Hitung 1 baris laporan realisasi untuk 1 plan. */
export const buildRealizationRow = (plan: AggregatablePlan): BudgetRealizationRow => {
  const planTotalNum = sum(plan.allocations.map((a) => a.allocation));
  const requestedTotalNum = sum(plan.budgetRequests.map((r) => r.grandTotal));
  const approvedRequestedTotalNum = sum(
    plan.budgetRequests.filter((r) => APPROVED_STATUSES.has(r.status)).map((r) => r.grandTotal),
  );

  const requests = plan.budgetRequests
    .map(buildRequestSummary)
    .sort((a, b) => (a.requestDate < b.requestDate ? 1 : -1));

  return {
    planId: plan.id,
    planCode: plan.code,
    planSubject: plan.subject,
    fiscalYear: plan.fiscalYear,
    status: isPlanStatus(plan.status),
    isApproved: APPROVED_STATUSES.has(plan.status),
    departmentName: plan.department?.name ?? '-',
    planTotal: formatNumberAsDecimal(planTotalNum),
    requestedTotal: formatNumberAsDecimal(requestedTotalNum),
    approvedRequestedTotal: formatNumberAsDecimal(approvedRequestedTotalNum),
    requestCount: plan.budgetRequests.length,
    hasRequest: plan.budgetRequests.length > 0,
    utilizationPercent: calcUtilizationPercent(planTotalNum, requestedTotalNum),
    requests,
  };
};

/** Hitung totals (footer ringkasan) dari koleksi rows. */
export const buildRealizationTotals = (rows: BudgetRealizationRow[]): BudgetRealizationResponse['totals'] => {
  return {
    planCount: rows.length,
    approvedPlanCount: rows.filter((r) => r.isApproved).length,
    plansWithRequest: rows.filter((r) => r.hasRequest).length,
    planTotal: formatNumberAsDecimal(sum(rows.map((r) => r.planTotal))),
    requestedTotal: formatNumberAsDecimal(sum(rows.map((r) => r.requestedTotal))),
    approvedRequestedTotal: formatNumberAsDecimal(sum(rows.map((r) => r.approvedRequestedTotal))),
  };
};

/** End-to-end: dari koleksi plan ke response laporan realisasi. */
export const buildRealizationResponse = (plans: AggregatablePlan[]): BudgetRealizationResponse => {
  const rows = plans.map(buildRealizationRow);
  return { rows, totals: buildRealizationTotals(rows) };
};
