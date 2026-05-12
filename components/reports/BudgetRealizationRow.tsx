'use client';

import Link from 'next/link';
import { ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import { TableBodyRow, TableCell } from '@/components/ui/Table';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import UtilizationBar from './UtilizationBar';
import type { BudgetRealizationRow as BudgetRealizationRowType } from '@/types/budget-realization';

export interface BudgetRealizationRowProps {
  row: BudgetRealizationRowType;
  index: number;
  isExpanded: boolean;
  onToggle: (planId: string) => void;
  /** Total kolom (untuk colSpan baris detail). */
  columnCount: number;
}

/** Render 2 baris terkait: baris ringkasan + baris detail (collapsible). */
export default function BudgetRealizationRow({
  row,
  index,
  isExpanded,
  onToggle,
  columnCount,
}: BudgetRealizationRowProps) {
  const planTotal = Number(row.planTotal);
  const requestedTotal = Number(row.requestedTotal);
  const overBudget = row.utilizationPercent !== null && row.utilizationPercent > 100;

  return (
    <>
      <TableBodyRow className="border-gray-200">
        <TableCell className="text-gray-500">{index + 1}</TableCell>
        <TableCell>
          <button
            type="button"
            onClick={() => onToggle(row.planId)}
            className={cn(
              'inline-flex items-center justify-center rounded-md p-1 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 cursor-pointer',
              !row.hasRequest && 'opacity-30 cursor-not-allowed',
            )}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            disabled={!row.hasRequest}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded ? 'rotate-180' : '-rotate-90')} />
          </button>
        </TableCell>
        <TableCell>
          <Link
            href={`/budget-plans/${row.planId}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {row.planCode}
          </Link>
          <div className="text-xs text-gray-500">FY {row.fiscalYear}</div>
        </TableCell>
        <TableCell>
          <div className="max-w-[260px] truncate" title={row.planSubject}>
            {row.planSubject}
          </div>
        </TableCell>
        <TableCell className="text-sm text-gray-700">{row.departmentName}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} />
            {row.isApproved ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Approved" />
            ) : (
              <Circle className="h-4 w-4 text-gray-300" aria-label="Not approved" />
            )}
          </div>
        </TableCell>
        <TableCell>
          {row.hasRequest ? (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
              {row.requestCount} request{row.requestCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-gray-400">No request</span>
          )}
        </TableCell>
        <TableCell className="text-right tabular-nums">{formatCurrency(planTotal)}</TableCell>
        <TableCell
          className={cn(
            'text-right tabular-nums',
            overBudget && 'font-semibold text-red-700',
          )}
        >
          {formatCurrency(requestedTotal)}
        </TableCell>
        <TableCell>
          <UtilizationBar percent={row.utilizationPercent} />
        </TableCell>
      </TableBodyRow>

      {isExpanded && row.hasRequest && (
        <tr className="bg-blue-50/30">
          <td colSpan={columnCount} className="px-4 py-4">
            <div className="rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Linked Budget Requests ({row.requestCount})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-2 py-2">Request Code</th>
                      <th className="px-2 py-2">Subject</th>
                      <th className="px-2 py-2">Requestor</th>
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2 text-right">Grand Total</th>
                      <th className="px-2 py-2 text-right">% of Plan</th>
                      <th className="px-2 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.requests.map((req) => {
                      const reqTotal = Number(req.grandTotal);
                      const ratio = planTotal > 0 ? (reqTotal / planTotal) * 100 : null;
                      return (
                        <tr key={req.id} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/40">
                          <td className="px-2 py-2 font-medium text-gray-800">{req.code}</td>
                          <td className="px-2 py-2 max-w-[220px] truncate" title={req.subject}>
                            {req.subject}
                          </td>
                          <td className="px-2 py-2 text-gray-600">{req.requestorName ?? '-'}</td>
                          <td className="px-2 py-2 text-gray-600">{formatDate(req.requestDate)}</td>
                          <td className="px-2 py-2">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(reqTotal)}</td>
                          <td className="px-2 py-2 text-right text-xs text-gray-600 tabular-nums">
                            {ratio === null ? '—' : `${ratio.toFixed(1)}%`}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Link
                              href={`/budget-requests/${req.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
