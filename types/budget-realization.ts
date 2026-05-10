/** Status budget plan / request yang mungkin muncul di laporan realisasi. */
export type BudgetPlanStatus = 'Draft' | 'Pending' | 'Reviewed' | 'Approved' | 'Revision' | 'Declined';
export type BudgetRequestStatus = 'Draft' | 'Pending' | 'Reviewed' | 'Approved' | 'Revision' | 'Declined';

/** Ringkasan satu BudgetRequest yang sudah dilink ke BudgetPlan. */
export interface RealizationRequestSummary {
  id: string;
  code: string;
  subject: string;
  status: BudgetRequestStatus;
  requestorName: string | null;
  requestDate: string;
  /** Nilai yang diminta (grandTotal) — string untuk presisi Decimal. */
  grandTotal: string;
}

/** Satu baris laporan realisasi: 1 BudgetPlan + agregasi request-nya. */
export interface BudgetRealizationRow {
  planId: string;
  planCode: string;
  planSubject: string;
  fiscalYear: number;
  status: BudgetPlanStatus;
  isApproved: boolean;
  departmentName: string;
  /** Sum allocation bulanan (string untuk presisi Decimal). */
  planTotal: string;
  /** Sum grandTotal semua request — termasuk yang belum approved. */
  requestedTotal: string;
  /** Sum grandTotal hanya untuk request yang sudah Approved. */
  approvedRequestedTotal: string;
  /** Jumlah request yang sudah dibuat untuk plan ini. */
  requestCount: number;
  /** Apakah sudah ada minimal 1 budget request. */
  hasRequest: boolean;
  /** requestedTotal / planTotal × 100 — null jika planTotal = 0. */
  utilizationPercent: number | null;
  requests: RealizationRequestSummary[];
}

/** Response API GET /api/reports/budget-realization. */
export interface BudgetRealizationResponse {
  rows: BudgetRealizationRow[];
  totals: {
    planCount: number;
    approvedPlanCount: number;
    plansWithRequest: number;
    planTotal: string;
    requestedTotal: string;
    approvedRequestedTotal: string;
  };
}
