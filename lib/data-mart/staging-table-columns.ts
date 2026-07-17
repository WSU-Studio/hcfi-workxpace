import { formatDate, formatISODate } from '@/lib/utils';
import type { DataMartStagingApiRow } from '@/types/data-mart-staging';

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function monthLabel(month: number): string {
  const i = Math.min(12, Math.max(1, month)) - 1;
  return MONTH_SHORT[i] ?? String(month);
}

function csvText(v: string | null | undefined): string {
  return v && String(v).trim() !== '' ? String(v).trim() : '';
}

function csvDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return formatDate(iso);
  } catch {
    return formatISODate(iso);
  }
}

export type StagingTableColumn = {
  key: string;
  /** Header label shown in DataMartStagingTable and CSV export. */
  header: string;
  csvValue: (row: DataMartStagingApiRow) => string;
};

/**
 * Visible columns in DataMartStagingTable (in render order).
 * Keep CSV export aligned with this list — deferred columns live below.
 */
export const DATA_MART_STAGING_VISIBLE_COLUMNS: readonly StagingTableColumn[] = [
  { key: 'period', header: 'Period', csvValue: (r) => r.period },
  { key: 'fiscalYear', header: 'FY', csvValue: (r) => String(r.fiscalYear) },
  { key: 'month', header: 'Month', csvValue: (r) => monthLabel(r.month) },
  { key: 'quarter', header: 'Quarter', csvValue: (r) => `Q${r.quarter}` },
  { key: 'confinsPaymentDocId', header: 'Doc ID', csvValue: (r) => r.confinsPaymentDocId },
  { key: 'dataInterfaceSource', header: 'Source', csvValue: (r) => csvText(r.dataInterfaceSource) },
  { key: 'interfaceId', header: 'Interface ID', csvValue: (r) => csvText(r.interfaceId) },
  { key: 'originOffice', header: 'Origin office', csvValue: (r) => csvText(r.originOffice) },
  { key: 'divisionName', header: 'Division', csvValue: (r) => csvText(r.divisionName) },
  { key: 'departmentName', header: 'Department', csvValue: (r) => csvText(r.departmentName) },
  { key: 'accountNumberCoa', header: 'Account (COA)', csvValue: (r) => csvText(r.accountNumberCoa) },
  { key: 'glAccountCode', header: 'GL code', csvValue: (r) => csvText(r.glAccountCode) },
  { key: 'glAccountName', header: 'GL name', csvValue: (r) => csvText(r.glAccountName) },
  { key: 'expenseCategory', header: 'Category', csvValue: (r) => csvText(r.expenseCategory) },
  { key: 'expenseTypeFp', header: 'Expense type', csvValue: (r) => csvText(r.expenseTypeFp) },
  { key: 'categoryKeyIndex', header: 'Cat. key index', csvValue: (r) => csvText(r.categoryKeyIndex) },
  { key: 'opexType', header: 'OPEX alloc.', csvValue: (r) => csvText(r.opexType) },
  { key: 'opexAllocation', header: 'OPEX type', csvValue: (r) => csvText(r.opexAllocation) },
  { key: 'projectCode', header: 'Project code', csvValue: (r) => csvText(r.projectCode) },
  { key: 'projectName', header: 'Project name', csvValue: (r) => csvText(r.projectName) },
  { key: 'budgetRequestCode', header: 'BR code', csvValue: (r) => r.budgetRequestCode },
  { key: 'budgetRequestApprovedAt', header: 'BR approved', csvValue: (r) => csvDate(r.budgetRequestApprovedAt) },
  { key: 'paymentRequestNo', header: 'PR No.', csvValue: (r) => csvText(r.paymentRequestNo) },
  { key: 'journalNo', header: 'Journal', csvValue: (r) => csvText(r.journalNo) },
  { key: 'voucherEgl', header: 'Voucher E-GL', csvValue: (r) => csvText(r.voucherEgl) },
  { key: 'paymentRequestDate', header: 'PR date', csvValue: (r) => csvDate(r.paymentRequestDate) },
  { key: 'requestedByEmail', header: 'Request by', csvValue: (r) => csvText(r.requestedByEmail) },
  { key: 'invoiceDate', header: 'Invoice date', csvValue: (r) => csvDate(r.invoiceDate) },
  { key: 'invoiceNo', header: 'Invoice No.', csvValue: (r) => csvText(r.invoiceNo) },
  { key: 'businessRole', header: 'Bus. role', csvValue: (r) => csvText(r.businessRole) },
  {
    key: 'activity',
    header: 'Activity',
    csvValue: (r) => csvText(r.activityLabel ?? r.activityCode),
  },
  {
    key: 'subActivity',
    header: 'Sub activity',
    csvValue: (r) => csvText(r.subActivityLabel ?? r.subActivityCode),
  },
  { key: 'vendorName', header: 'Vendor', csvValue: (r) => csvText(r.vendorName) },
  { key: 'paymentDescription', header: 'Description', csvValue: (r) => csvText(r.paymentDescription) },
  { key: 'costDriverMetric', header: 'Cost driver', csvValue: (r) => csvText(r.costDriverMetric) },
  {
    key: 'costPerUnit',
    header: 'Cost per unit',
    csvValue: (r) =>
      r.costPerUnit
        ? Number(r.costPerUnit).toLocaleString('id-ID', { maximumFractionDigits: 4 })
        : '',
  },
  { key: 'paidAmount', header: 'Paid (IDR)', csvValue: (r) => r.paidAmount },
  { key: 'expectedAmount', header: 'BR Approved Amount', csvValue: (r) => r.expectedAmount },
  { key: 'planAmount', header: 'Plan Amount', csvValue: (r) => csvText(r.planAmount) },
];

export const DATA_MART_STAGING_COLUMN_COUNT = DATA_MART_STAGING_VISIBLE_COLUMNS.length;

/**
 * Deferred — commented out in DataMartStagingTable; omit from CSV until re-enabled.
 * Reference (BR), Plan code, Transaction, Cost center, BR type, Match
 */
export const DATA_MART_STAGING_DEFERRED_COLUMN_KEYS = [
  'incomingReferenceId',
  'budgetPlanCode',
  'budgetRequestSubject',
  'costCenter',
  'budgetRequestType',
  'matchType',
] as const;
