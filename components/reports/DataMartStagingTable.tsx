'use client';

import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
} from '@/components/ui/Table';
import { DATA_MART_STAGING_COLUMN_COUNT } from '@/lib/data-mart/staging-table-columns';
import { formatCurrency, formatSignedCurrency, formatDate, formatISODate } from '@/lib/utils';
import type { DataMartStagingApiRow } from '@/types/data-mart-staging';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(month: number): string {
  const i = Math.min(12, Math.max(1, month)) - 1;
  return MONTH_SHORT[i] ?? String(month);
}

function d(v: string | null | undefined): string {
  return v && String(v).trim() !== '' ? v : '—';
}

function dateCell(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatDate(iso);
  } catch {
    return formatISODate(iso);
  }
}

/** Kolom visible — selaras `lib/data-mart/staging-table-columns.ts` (urutan CSV export). */
const COL_COUNT = DATA_MART_STAGING_COLUMN_COUNT;

export type DataMartStagingTableProps = {
  rows: DataMartStagingApiRow[];
};

export default function DataMartStagingTable({ rows }: DataMartStagingTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <Table className="min-w-[4300px] text-sm">
        <thead className="bg-sky-50">
          <TableHeaderRow>
            <TableHead className="sticky left-0 z-10 min-w-[100px] bg-sky-50 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
              Period
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">FY</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Month</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Quarter</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Doc ID</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">Source</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Interface ID</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Origin office</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Division</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Department</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Account (COA)</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">GL code</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">GL name</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Category</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Expense type</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Cat. key index</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">OPEX alloc.</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">OPEX type</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Project code</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Project name</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">BR code</TableHead>
            {/* requestor */}
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">BR approved</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">PR No.</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">Journal</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">Voucher E-GL</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">PR date</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">Request by</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">Invoice date</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">Invoice No.</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Bus. role</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Activity</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Sub activity</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Vendor</TableHead>
            {/* description */}
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">Cost driver</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">Cost per unit</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Paid (IDR)</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">BR Approved Amount</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-950">Plan Amount</TableHead>

            {/* <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Reference (BR)</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Plan code</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Transaction</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Cost center</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">BR type</TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">Match</TableHead> */}
          </TableHeaderRow>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={COL_COUNT} className="pl-4 text-left text-gray-500">No staging rows for these filters.</TableEmptyRow>
          ) : (
            rows.map((r) => (
              <TableBodyRow key={r.id}>
                <TableCell className="sticky left-0 z-[1] min-w-[100px] bg-white whitespace-nowrap text-sm tabular-nums shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  {r.period}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{r.fiscalYear}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{monthLabel(r.month)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-gray-600">Q{r.quarter}</TableCell>
                <TableCell className="max-w-[152px] whitespace-wrap font-mono text-xs text-gray-700">{r.confinsPaymentDocId}</TableCell>
                <TableCell className="text-xs">{d(r.dataInterfaceSource)}</TableCell>
                <TableCell className="max-w-[120px] whitespace-wrap font-mono text-xs">{d(r.interfaceId)}</TableCell>
                <TableCell className="max-w-[120px] whitespace-wrap text-sm">{d(r.originOffice)}</TableCell>
                <TableCell className="max-w-[120px] whitespace-wrap text-sm">{d(r.divisionName)}</TableCell>
                <TableCell className="max-w-[140px] whitespace-wrap text-sm">{d(r.departmentName)}</TableCell>
                <TableCell className="max-w-[100px] whitespace-wrap font-mono text-xs">{d(r.accountNumberCoa)}</TableCell>
                <TableCell className="max-w-[136px] whitespace-wrap font-mono text-xs">{d(r.glAccountCode)}</TableCell>
                <TableCell className="max-w-[160px] whitespace-wrap text-sm">{d(r.glAccountName)}</TableCell>
                <TableCell className="text-sm">{d(r.expenseCategory)}</TableCell>
                <TableCell className="max-w-[90px] whitespace-wrap text-sm">{d(r.expenseTypeFp)}</TableCell>
                <TableCell className="text-sm">{d(r.categoryKeyIndex)}</TableCell>
                <TableCell className="text-sm">{d(r.opexAllocation)}</TableCell>
                <TableCell className="max-w-[90px] whitespace-wrap text-sm">{d(r.opexType)}</TableCell>
                <TableCell className="max-w-[90px] text-sm">{d(r.projectCode)}</TableCell>
                <TableCell className="max-w-[140px] whitespace-wrap text-sm">{d(r.projectName)}</TableCell>
                <TableCell className="text-sm">{r.budgetRequestCode}</TableCell>
                {/* requestor */}
                <TableCell className="text-xs">{dateCell(r.budgetRequestApprovedAt)}</TableCell>
                <TableCell className="font-mono text-xs">{d(r.paymentRequestNo)}</TableCell>
                <TableCell className="font-mono text-xs">{d(r.journalNo)}</TableCell>
                <TableCell className="max-w-[90px] font-mono text-xs">{d(r.voucherEgl)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{dateCell(r.paymentRequestDate)}</TableCell>
                <TableCell className="max-w-[120px] text-xs">{d(r.requestedByEmail)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{dateCell(r.invoiceDate)}</TableCell>
                <TableCell className="max-w-[100px] text-xs">{d(r.invoiceNo)}</TableCell>
                <TableCell className="max-w-[100px] text-sm">{d(r.businessRole)}</TableCell>
                <TableCell className="max-w-[130px] text-sm">{r.activityLabel ?? r.activityCode ?? '—'}</TableCell>
                <TableCell className="max-w-[130px] text-sm">{r.subActivityLabel ?? r.subActivityCode ?? '—'}</TableCell>
                <TableCell className="max-w-[120px] text-sm">{d(r.vendorName)}</TableCell>
                {/* description */}
                <TableCell className="whitespace-nowrap text-xs tabular-nums">{d(r.costDriverMetric)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs tabular-nums">
                  {r.costPerUnit ? Number(r.costPerUnit).toLocaleString('id-ID', { maximumFractionDigits: 4 }) : '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{formatSignedCurrency(Number(r.paidAmount))}</TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{formatCurrency(Number(r.expectedAmount))}</TableCell>
                <TableCell className="whitespace-nowrap text-xs tabular-nums">
                  {r.planAmount ? formatCurrency(Number(r.planAmount)) : '—'}
                </TableCell>

                {/* <TableCell className="max-w-[130px] truncate text-sm font-medium">{r.incomingReferenceId}</TableCell>
                <TableCell className="max-w-[100px] truncate text-sm">{d(r.budgetPlanCode)}</TableCell>
                <TableCell className="max-w-[180px] truncate text-sm" title={r.budgetRequestSubject ?? undefined}>
                  {d(r.budgetRequestSubject)}
                </TableCell>
                <TableCell className="max-w-[100px] truncate text-sm">{d(r.costCenter)}</TableCell>
                <TableCell className="max-w-[80px] truncate text-sm">{d(r.budgetRequestType)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm capitalize">{r.matchType}</TableCell> */}
              </TableBodyRow>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
