import { formatCurrency, formatDate, formatISODate, formatSignedCurrency } from '@/lib/utils';
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

function text(v: string | null | undefined): string {
  return v && String(v).trim() !== '' ? String(v).trim() : '';
}

function dateValue(iso: string | null): string {
  if (!iso) return '';
  try {
    return formatDate(iso);
  } catch {
    return formatISODate(iso);
  }
}

export type StagingTableColumn = {
  key: string;
  /** Header label — identical in web table and CSV export. */
  header: string;
  /**
   * Canonical cell value shared by web table and CSV.
   * Empty string means "no value" (web renders "—"; CSV leaves blank).
   */
  value: (row: DataMartStagingApiRow) => string;
  /** Optional tooltip (e.g. full description). */
  title?: (row: DataMartStagingApiRow) => string | undefined;
  cellClassName?: string;
  headerClassName?: string;
  sticky?: boolean;
};

/**
 * Single source of truth for DataMartStagingTable + CSV export.
 * Order and headers MUST stay identical between web and download.
 *
 * Field order follows FP&A guideline (`fpa-data-mart-spec.ts`):
 * Opex Allocation then Opex Type (Fixed/Variable).
 */
export const DATA_MART_STAGING_VISIBLE_COLUMNS: readonly StagingTableColumn[] = [
  {
    key: 'period',
    header: 'Period',
    value: (r) => r.period,
    sticky: true,
    cellClassName:
      'sticky left-0 z-[1] min-w-[100px] bg-white whitespace-nowrap text-sm tabular-nums shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]',
    headerClassName:
      'sticky left-0 z-10 min-w-[100px] bg-sky-50 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]',
  },
  {
    key: 'fiscalYear',
    header: 'FY',
    value: (r) => String(r.fiscalYear),
    cellClassName: 'whitespace-nowrap text-sm tabular-nums',
  },
  {
    key: 'month',
    header: 'Month',
    value: (r) => monthLabel(r.month),
    cellClassName: 'whitespace-nowrap text-sm',
  },
  {
    key: 'quarter',
    header: 'Quarter',
    value: (r) => `Q${r.quarter}`,
    cellClassName: 'whitespace-nowrap text-sm text-gray-600',
  },
  {
    key: 'confinsPaymentDocId',
    header: 'Doc ID',
    value: (r) => r.confinsPaymentDocId,
    cellClassName: 'max-w-[152px] whitespace-wrap font-mono text-xs text-gray-700',
  },
  {
    key: 'dataInterfaceSource',
    header: 'Source',
    value: (r) => text(r.dataInterfaceSource),
    cellClassName: 'text-xs',
  },
  {
    key: 'interfaceId',
    header: 'Interface ID',
    value: (r) => text(r.interfaceId),
    cellClassName: 'max-w-[120px] whitespace-wrap font-mono text-xs',
  },
  {
    key: 'originOffice',
    header: 'Origin office',
    value: (r) => text(r.originOffice),
    cellClassName: 'max-w-[120px] whitespace-wrap text-sm',
  },
  {
    key: 'divisionName',
    header: 'Division',
    value: (r) => text(r.divisionName),
    cellClassName: 'max-w-[120px] whitespace-wrap text-sm',
  },
  {
    key: 'departmentName',
    header: 'Department',
    value: (r) => text(r.departmentName),
    cellClassName: 'max-w-[140px] whitespace-wrap text-sm',
  },
  {
    key: 'accountNumberCoa',
    header: 'Account (COA)',
    value: (r) => text(r.accountNumberCoa),
    cellClassName: 'max-w-[100px] whitespace-wrap font-mono text-xs',
  },
  {
    key: 'glAccountCode',
    header: 'GL code',
    value: (r) => text(r.glAccountCode),
    cellClassName: 'max-w-[136px] whitespace-wrap font-mono text-xs',
  },
  {
    key: 'glAccountName',
    header: 'GL name',
    value: (r) => text(r.glAccountName),
    cellClassName: 'max-w-[160px] whitespace-wrap text-sm',
  },
  {
    key: 'expenseCategory',
    header: 'Category',
    value: (r) => text(r.expenseCategory),
    cellClassName: 'text-sm',
  },
  {
    key: 'expenseTypeFp',
    header: 'Expense type',
    value: (r) => text(r.expenseTypeFp),
    cellClassName: 'max-w-[90px] whitespace-wrap text-sm',
  },
  {
    key: 'categoryKeyIndex',
    header: 'Cat. key index',
    value: (r) => text(r.categoryKeyIndex),
    cellClassName: 'text-sm',
  },
  {
    key: 'opexAllocation',
    header: 'OPEX alloc.',
    value: (r) => text(r.opexAllocation),
    cellClassName: 'text-sm',
  },
  {
    key: 'opexType',
    header: 'OPEX type',
    value: (r) => text(r.opexType),
    cellClassName: 'max-w-[90px] whitespace-wrap text-sm',
  },
  {
    key: 'projectCode',
    header: 'Project code',
    value: (r) => text(r.projectCode),
    cellClassName: 'max-w-[90px] text-sm',
  },
  {
    key: 'projectName',
    header: 'Project name',
    value: (r) => text(r.projectName),
    cellClassName: 'max-w-[140px] whitespace-wrap text-sm',
  },
  {
    key: 'budgetRequestCode',
    header: 'BR code',
    value: (r) => r.budgetRequestCode,
    cellClassName: 'text-sm',
  },
  {
    key: 'requestorName',
    header: 'Requestor',
    value: (r) => text(r.requestorName),
    cellClassName: 'max-w-[130px] text-sm',
  },
  {
    key: 'budgetRequestApprovedAt',
    header: 'BR approved',
    value: (r) => dateValue(r.budgetRequestApprovedAt),
    cellClassName: 'text-xs',
  },
  {
    key: 'paymentRequestNo',
    header: 'PR No.',
    value: (r) => text(r.paymentRequestNo),
    cellClassName: 'font-mono text-xs',
  },
  {
    key: 'journalNo',
    header: 'Journal',
    value: (r) => text(r.journalNo),
    cellClassName: 'font-mono text-xs',
  },
  {
    key: 'voucherEgl',
    header: 'Voucher E-GL',
    value: (r) => text(r.voucherEgl),
    cellClassName: 'max-w-[90px] font-mono text-xs',
  },
  {
    key: 'paymentRequestDate',
    header: 'PR date',
    value: (r) => dateValue(r.paymentRequestDate),
    cellClassName: 'whitespace-nowrap text-xs',
  },
  {
    key: 'requestedByEmail',
    header: 'Request by',
    value: (r) => text(r.requestedByEmail),
    cellClassName: 'max-w-[120px] text-xs',
  },
  {
    key: 'invoiceDate',
    header: 'Invoice date',
    value: (r) => dateValue(r.invoiceDate),
    cellClassName: 'whitespace-nowrap text-xs',
  },
  {
    key: 'invoiceNo',
    header: 'Invoice No.',
    value: (r) => text(r.invoiceNo),
    cellClassName: 'max-w-[100px] text-xs',
  },
  {
    key: 'businessRole',
    header: 'Bus. role',
    value: (r) => text(r.businessRole),
    cellClassName: 'max-w-[100px] text-sm',
  },
  {
    key: 'activity',
    header: 'Activity',
    value: (r) => text(r.activityLabel ?? r.activityCode),
    cellClassName: 'max-w-[130px] text-sm',
  },
  {
    key: 'subActivity',
    header: 'Sub activity',
    value: (r) => text(r.subActivityLabel ?? r.subActivityCode),
    cellClassName: 'max-w-[130px] text-sm',
  },
  {
    key: 'vendorName',
    header: 'Vendor',
    value: (r) => text(r.vendorName),
    cellClassName: 'max-w-[120px] text-sm',
  },
  {
    key: 'paymentDescription',
    header: 'Description',
    value: (r) => text(r.paymentDescription),
    title: (r) => r.paymentDescription ?? undefined,
    cellClassName: 'max-w-[220px] text-xs',
  },
  {
    key: 'costDriverMetric',
    header: 'Cost driver',
    value: (r) => text(r.costDriverMetric),
    cellClassName: 'whitespace-nowrap text-xs tabular-nums',
  },
  {
    key: 'costPerUnit',
    header: 'Cost per unit',
    value: (r) =>
      r.costPerUnit
        ? Number(r.costPerUnit).toLocaleString('id-ID', { maximumFractionDigits: 4 })
        : '',
    cellClassName: 'whitespace-nowrap text-xs tabular-nums',
  },
  {
    key: 'paidAmount',
    header: 'Paid (IDR)',
    value: (r) => formatSignedCurrency(Number(r.paidAmount)),
    cellClassName: 'whitespace-nowrap text-sm tabular-nums',
  },
  {
    key: 'expectedAmount',
    header: 'BR Approved Amount',
    value: (r) => formatCurrency(Number(r.expectedAmount)),
    cellClassName: 'whitespace-nowrap text-sm tabular-nums',
  },
  {
    key: 'planAmount',
    header: 'Plan Amount',
    value: (r) => (r.planAmount ? formatCurrency(Number(r.planAmount)) : ''),
    cellClassName: 'whitespace-nowrap text-xs tabular-nums',
  },
];

export const DATA_MART_STAGING_COLUMN_COUNT = DATA_MART_STAGING_VISIBLE_COLUMNS.length;

/** Empty placeholder shown in the web table only (CSV stays blank). */
export const STAGING_EMPTY_DISPLAY = '—';

export function stagingColumnDisplayValue(
  column: StagingTableColumn,
  row: DataMartStagingApiRow,
): string {
  const raw = column.value(row);
  return raw !== '' ? raw : STAGING_EMPTY_DISPLAY;
}

/**
 * Deferred — omit from web + CSV until re-enabled.
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
