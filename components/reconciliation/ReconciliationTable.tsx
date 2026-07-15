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
  getRequestDateRaw,
  parseConfinsShortDate,
} from '@/lib/integrations/confins/v103-budget-real';
import { formatSignedCurrency, formatDate } from '@/lib/utils';
import { ReconciliationRow } from '@/types/reconciliation';
import { useMemo, useState } from 'react';

type RequestDateSort = 'asc' | 'desc';

/**
 * Parse RequestDate (Confins short date `18-Jun-25`) → Date. Fallback ke
 * `postDate` ISO bila parsing gagal. Dipakai untuk sorting kolom Request Date.
 */
function requestDateTimestamp(payment: ConfinsCashDisbursement): number {
  const raw = getRequestDateRaw(payment);
  if (raw) {
    const parsed = parseConfinsShortDate(raw);
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed.getTime();
  }
  const fallback = new Date(payment.postDate);
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
}

/**
 * Render RequestDate untuk kolom tabel. Coba parse format Confins (`18-Jun-25`)
 * dulu via `parseConfinsShortDate` (karena `new Date('18-Jun-25')` tidak
 * konsisten antar browser), baru fallback ke `formatDate` biasa, lalu ke `-`.
 */
function renderRequestDate(payment: ConfinsCashDisbursement): string {
  const raw = getRequestDateRaw(payment);
  if (raw) {
    const parsed = parseConfinsShortDate(raw);
    if (parsed && !Number.isNaN(parsed.getTime())) return formatDate(parsed);
    return raw;
  }
  return payment.postDate ? formatDate(payment.postDate) : '-';
}

interface ReconciliationTableProps {
  rows: ReconciliationRow[];
  canEditManual: boolean;
  /** Saat sync/save — tombol sort & Match Manual nonaktif (overlay di parent). */
  interactionsDisabled?: boolean;
  onManualMatch: (paymentId: string) => void;
  /** Tandai pembayaran sebagai "Marked Unused" — disembunyikan dari sync berikutnya. */
  onMarkUnused?: (paymentId: string) => void;
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
  onMarkUnused,
}: ReconciliationTableProps) {
  const [requestDateSort, setRequestDateSort] = useState<RequestDateSort>('asc');

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const diff = requestDateTimestamp(a.payment) - requestDateTimestamp(b.payment);
      return requestDateSort === 'asc' ? diff : -diff;
    });
    return copy;
  }, [rows, requestDateSort]);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <Table className="min-w-[1200px] text-sm">
        <thead className="bg-gray-50">
          <TableHeaderRow className="border-gray-200">
            <TableHead
              className="text-xs font-semibold uppercase text-gray-600"
              aria-sort={requestDateSort === 'asc' ? 'ascending' : 'descending'}
            >
              <button
                type="button"
                onClick={() => setRequestDateSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
                disabled={interactionsDisabled}
                className="inline-flex items-center gap-1 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Request Date
                <span className="text-[10px] font-normal normal-case text-gray-500" aria-hidden>
                  {requestDateSort === 'asc' ? '↑' : '↓'}
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
          {rows.length === 0 && <TableEmptyRow colSpan={11}>No reconciliation data. Run sync.</TableEmptyRow>}
          {sortedRows.map((row) => {
            const payment = row.payment;
            return (
              <TableBodyRow key={payment.id} className="border-gray-200">
                <TableCell>{renderRequestDate(payment)}</TableCell>
                <TableCell>{payment.dataInterfaceSource ?? '-'}</TableCell>
                <TableCell>{row.matchedRequest?.code ?? '-'}</TableCell>
                <TableCell className="font-medium text-gray-700">{payment.incomingReferenceId}</TableCell>
                <TableCell>{payment.description}</TableCell>
                <TableCell>{row.matchedRequest?.coa ?? '-'}</TableCell>
                <TableCell>{`${payment.glAccountCode} - ${payment.glAccountName}`}</TableCell>
                <TableCell className="text-right">{formatSignedCurrency(row.paidAmount)}</TableCell>
                <TableCell className="text-right">
                  <span className={row.variance === 0 ? 'text-gray-900' : 'text-rose-700'}>
                    {formatSignedCurrency(row.expectedAmount)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className={matchClassName(row.matchType)}>
                    <div className="font-semibold capitalize">{row.matchType === 'unmatched' ? 'Unmatched' : 'Matched'}</div>
                    {row.matchType !== 'unmatched' && (
                      <div className="text-xs text-gray-500">
                        {row.matchType === 'manual' ? 'Manual override' : 'Auto (BR ref from Description)'}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!canEditManual || interactionsDisabled}
                      onClick={() => onManualMatch(payment.id)}
                    >
                      Match Manual
                    </Button>
                    {onMarkUnused && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!canEditManual || interactionsDisabled}
                        onClick={() => onMarkUnused(payment.id)}
                        title="Mark Unused — this row will be hidden from the next sync"
                      >
                        Mark Unused
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableBodyRow>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
