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
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReconciliationRow } from '@/types/reconciliation';

interface ReconciliationTableProps {
  rows: ReconciliationRow[];
  canEditManual: boolean;
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
  onManualMatch,
}: ReconciliationTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <Table className="min-w-[1200px] text-sm">
        <thead className="bg-gray-50">
          <TableHeaderRow className="border-gray-200">
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Post Date</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Source</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Form ID</TableHead>
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
          {rows.map((row) => {
            const payment = row.payment;
            return (
              <TableBodyRow key={payment.id} className="border-gray-200">
                <TableCell>{formatDate(payment.postDate)}</TableCell>
                <TableCell>{payment.source}</TableCell>
                <TableCell>{row.matchedPlan?.code ?? '-'}</TableCell>
                <TableCell className="font-medium text-gray-700">{payment.incomingReferenceId}</TableCell>
                <TableCell>{payment.description}</TableCell>
                <TableCell>{row.matchedPlan?.coaId ?? '-'}</TableCell>
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
                        {row.matchType === 'manual' ? 'Manual override' : 'Auto by incoming id'}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3 py-1 text-xs"
                    disabled={!canEditManual}
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
