'use client';

import Button from '@/components/ui/Button';
import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
} from '@/components/ui/Table';
import type { ConfinsCashDisbursement } from '@/lib/integrations/confins-mock/types';
import {
  getInvoiceDateRaw,
  parseConfinsShortDate,
} from '@/lib/integrations/confins/v103-budget-real';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReconciliationRow } from '@/types/reconciliation';
import { useMemo, useState } from 'react';

type InvoiceDateSort = 'asc' | 'desc';

function invoiceDateTimestamp(payment: ConfinsCashDisbursement): number {
  const raw = getInvoiceDateRaw(payment);
  if (raw) {
    const parsed = parseConfinsShortDate(raw);
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed.getTime();
  }
  const fallback = new Date(payment.postDate);
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
}

interface ReconciliationTableProps {
  rows: ReconciliationRow[];
  canEditManual: boolean;
  /** Saat sync/save — tombol sort & Match Manual nonaktif (overlay di parent). */
  interactionsDisabled?: boolean;
  onManualMatch: (paymentId: string) => void;
}

function matchClassName(status: ReconciliationRow['matchType']) {
  if (status === 'manual') return 'text-amber-700';
  if (status === 'auto') return 'text-emerald-700';
  return 'text-rose-700';
}

export default function ReconciliationTable({
  rows,
  canEditManual,
  interactionsDisabled = false,
  onManualMatch,
}: ReconciliationTableProps) {
  const [invoiceDateSort, setInvoiceDateSort] = useState<InvoiceDateSort>('asc');

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const diff = invoiceDateTimestamp(a.payment) - invoiceDateTimestamp(b.payment);
      return invoiceDateSort === 'asc' ? diff : -diff;
    });
    return copy;
  }, [rows, invoiceDateSort]);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <Table className="min-w-[1200px] text-sm">
        <thead className="bg-gray-50">
          <TableHeaderRow className="border-gray-200">
            <TableHead
              className="text-xs font-semibold uppercase text-gray-600"
              aria-sort={invoiceDateSort === 'asc' ? 'ascending' : 'descending'}
            >
              <button
                type="button"
                onClick={() => setInvoiceDateSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
                disabled={interactionsDisabled}
                className="inline-flex items-center gap-1 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Invoice Date
                <span className="text-[10px] font-normal normal-case text-gray-500" aria-hidden>
                  {invoiceDateSort === 'asc' ? '↑' : '↓'}
                </span>
              </button>
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Source</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Budget Request</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Incoming ID</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Description</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">GL Account</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Incoming GL</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">Amount</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">Incoming Budget</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Status</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Action</TableHead>
          </TableHeaderRow>
        </thead>
        <tbody>
          {rows.length === 0 && <TableEmptyRow colSpan={11}>Belum ada data rekonsiliasi. Jalankan sync.</TableEmptyRow>}
          {sortedRows.map((row) => {
            const payment = row.payment;
            return (
              <TableBodyRow key={payment.id} className="border-gray-200">
                <TableCell>{formatDate(payment.postDate)}</TableCell>
                <TableCell>{payment.source}</TableCell>
                <TableCell>{row.matchedRequest?.code ?? '-'}</TableCell>
                <TableCell className="font-medium text-gray-700">{payment.incomingReferenceId}</TableCell>
                <TableCell>{payment.description}</TableCell>
                <TableCell>{row.matchedRequest?.coa ?? '-'}</TableCell>
                <TableCell>{`${payment.glAccountCode} - ${payment.glAccountName}`}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.paidAmount)}</TableCell>
                <TableCell className="text-right">
                  <span className={row.variance === 0 ? 'text-gray-900' : 'text-rose-700'}>
                    {formatCurrency(row.expectedAmount)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className={matchClassName(row.matchType)}>
                    <div className="font-semibold capitalize">{row.matchType === 'unmatched' ? 'Unmatched' : 'Matched'}</div>
                    {row.matchType !== 'unmatched' && (
                      <div className="text-xs text-gray-500">
                        {row.matchType === 'manual' ? 'Manual override' : 'Auto (exact request ref)'}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canEditManual || interactionsDisabled}
                    onClick={() => onManualMatch(payment.id)}
                  >
                    Match Manual
                  </Button>
                </TableCell>
              </TableBodyRow>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
