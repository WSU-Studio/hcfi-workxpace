import { FPA_DATA_MART_SPEC_ROWS } from '@/lib/data-mart/fpa-data-mart-spec';
import type { DataMartStagingApiRow } from '@/types/data-mart-staging';

export function csvEscapeCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FPA_VALUES: Record<string, (r: DataMartStagingApiRow) => string> = {
  dataInterfaceSource: (r) => r.dataInterfaceSource ?? '',
  interfaceId: (r) => r.interfaceId ?? '',
  fiscalYear: (r) => String(r.fiscalYear),
  period: (r) => r.period,
  month: (r) => MONTH_LABELS[r.month] ?? String(r.month),
  quarter: (r) => `Q${r.quarter}`,
  year: (r) => String(r.fiscalYear),
  originOffice: (r) => r.originOffice ?? '',
  divisionName: (r) => r.divisionName ?? '',
  departmentName: (r) => r.departmentName ?? '',
  glAccountCode: (r) => r.glAccountCode ?? '',
  glAccountName: (r) => r.glAccountName ?? '',
  expenseCategory: (r) => r.expenseCategory ?? '',
  expenseTypeFp: (r) => r.expenseTypeFp ?? '',
  categoryKeyIndex: (r) => r.categoryKeyIndex ?? '',
  opexAllocation: (r) => r.opexAllocation ?? '',
  opexType: (r) => r.opexType ?? '',
  projectCode: (r) => r.projectCode ?? '',
  projectName: (r) => r.projectName ?? '',
  budgetRequestCode: (r) => r.budgetRequestCode ?? '',
  requestorName: (r) => r.requestorName ?? '',
  budgetRequestApprovedAt: (r) => r.budgetRequestApprovedAt ?? '',
  paymentRequestNo: (r) => r.paymentRequestNo ?? '',
  journalNo: (r) => r.journalNo ?? '',
  voucherEgl: (r) => r.voucherEgl ?? '',
  paymentRequestDate: (r) => r.paymentRequestDate ?? '',
  requestedByEmail: (r) => r.requestedByEmail ?? '',
  invoiceDate: (r) => r.invoiceDate ?? '',
  invoiceNo: (r) => r.invoiceNo ?? '',
  businessRole: (r) => r.businessRole ?? '',
  activityLabel: (r) => r.activityLabel ?? r.activityCode ?? '',
  subActivityLabel: (r) => r.subActivityLabel ?? r.subActivityCode ?? '',
  vendorName: (r) => r.vendorName ?? '',
  paymentDescription: (r) => r.paymentDescription ?? '',
  costDriverMetric: (r) => r.costDriverMetric ?? '',
  costPerUnit: (r) => r.costPerUnit ?? '',
  paidAmount: (r) => r.paidAmount,
  expectedAmount: (r) => r.expectedAmount,
  planAmount: (r) => r.planAmount ?? '',
};

/** Baris pertama = header guideline FP&A (No + label); kemudian nilai kolom tambahan untuk analisis lokal. */
export function buildStagingGuidelineCsv(rows: DataMartStagingApiRow[]): string {
  const specHeaders = FPA_DATA_MART_SPEC_ROWS.map(
    (s) => csvEscapeCell(`${String(s.no).padStart(2, '0')} ${s.fieldLabel}`)
  );
  const trailing = ['budgetRequestSubject', 'budgetPlanCode', 'voucherConfins', 'confinsPaymentDocId', 'ConfinsPayloadRaw_JSON', 'BudgetSnapshot_JSON'];
  const allHeaders = [...specHeaders, ...trailing.map(csvEscapeCell)].join(',');

  const lines = rows.map((r) => {
    const specCells = FPA_DATA_MART_SPEC_ROWS.map((s) => {
      const getter = FPA_VALUES[s.fieldKey];
      const raw = getter ? getter(r) : '';
      return csvEscapeCell(raw);
    });
    const tail = [
      r.budgetRequestSubject ?? '',
      r.budgetPlanCode ?? '',
      r.voucherNumber ?? '',
      r.confinsPaymentDocId ?? '',
      JSON.stringify(r.confinsPayloadRaw ?? {}),
      JSON.stringify(r.budgetRequestSnapshot ?? {}),
    ].map(csvEscapeCell);
    return [...specCells, ...tail].join(',');
  });

  return [allHeaders, ...lines].join('\n');
}
