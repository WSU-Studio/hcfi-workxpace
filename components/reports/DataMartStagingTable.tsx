'use client';

import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
} from '@/components/ui/Table';
import { formatCurrency } from '@/lib/utils';
import type { DataMartStagingApiRow } from '@/types/data-mart-staging';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(month: number): string {
  const i = Math.min(12, Math.max(1, month)) - 1;
  return MONTH_SHORT[i] ?? String(month);
}

export type DataMartStagingTableProps = {
  rows: DataMartStagingApiRow[];
};

export default function DataMartStagingTable({ rows }: DataMartStagingTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <Table>
        <thead className="bg-sky-50">
          <TableHeaderRow>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Period
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              FY
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Month
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Reference (BR)
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Budget request
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Origin office
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Department
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Vendor
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Business role
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Activity
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Sub activity
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Paid (IDR)
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Expected
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sky-900">
              Match
            </TableHead>
          </TableHeaderRow>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={14}>No staging rows for these filters.</TableEmptyRow>
          ) : (
            rows.map((r) => (
              <TableBodyRow key={r.id}>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{r.period}</TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{r.fiscalYear}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {monthLabel(r.month)} <span className="text-gray-400">(Q{r.quarter})</span>
                </TableCell>
                <TableCell className="max-w-[140px] truncate text-sm font-medium">{r.incomingReferenceId}</TableCell>
                <TableCell className="max-w-[160px] truncate text-sm">{r.budgetRequestCode}</TableCell>
                <TableCell className="max-w-[120px] truncate text-sm text-gray-700">{r.originOffice ?? '—'}</TableCell>
                <TableCell className="max-w-[160px] truncate text-sm">{r.departmentName ?? '—'}</TableCell>
                <TableCell className="max-w-[140px] truncate text-sm">{r.vendorName ?? '—'}</TableCell>
                <TableCell className="max-w-[120px] truncate text-sm">{r.businessRole ?? '—'}</TableCell>
                <TableCell className="max-w-[140px] truncate text-sm">
                  {r.activityLabel ?? r.activityCode ?? '—'}
                </TableCell>
                <TableCell className="max-w-[140px] truncate text-sm">
                  {r.subActivityLabel ?? r.subActivityCode ?? '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">
                  {formatCurrency(Number(r.paidAmount))}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">
                  {formatCurrency(Number(r.expectedAmount))}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm capitalize">{r.matchType}</TableCell>
              </TableBodyRow>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
