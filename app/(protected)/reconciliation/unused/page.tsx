'use client';

import Card from '@/components/ui/Card';
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
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type UnusedRow = {
  id: string;
  confinsPaymentDocId: string;
  interfaceId: string | null;
  paymentRequestNo: string | null;
  journalNo: string | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  fiscalYear: number;
  month: number;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  paymentSource: string | null;
  paidAmount: string;
  currency: string | null;
  glAccountCode: string | null;
  glAccountName: string | null;
  vendorName: string | null;
  description: string | null;
  reason: string | null;
  markedAt: string;
  markedByName: string;
};

export default function ReconciliationUnusedPage() {
  const { data: session, status } = useSession();
  const canView = Boolean(session?.user?.access?.menuAccess?.reconciliation);
  const canRestore = Boolean(session?.user?.access?.activityAccess?.editReconciliationMapping);

  const [rows, setRows] = useState<UnusedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState(false);
  const [search, setSearch] = useState('');

  const loadRows = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reconciliation/unused');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setRows(data.rows ?? []);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (status === 'authenticated') loadRows();
  }, [status, loadRows]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const needle = search.trim().toLowerCase();
    return rows.filter((r) =>
      [
        r.confinsPaymentDocId,
        r.interfaceId,
        r.paymentRequestNo,
        r.journalNo,
        r.invoiceNo,
        r.vendorName,
        r.description,
        r.departmentName,
        r.departmentCode,
        r.glAccountCode,
        r.glAccountName,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [rows, search]);

  const toggleSelect = (docId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredRows.length && filteredRows.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map((r) => r.confinsPaymentDocId)));
    }
  };

  const restoreSelected = async () => {
    if (!canRestore || restoring || selected.size === 0) return;
    const ok = window.confirm(
      `Kembalikan ${selected.size} baris ke daftar rekonsiliasi?\n\nBaris ini akan kembali muncul saat sync berikutnya sesuai filter Department / Fiscal Year / Month yang relevan.`
    );
    if (!ok) return;

    setRestoring(true);
    try {
      const res = await fetch('/api/reconciliation/unused', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confinsPaymentDocIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Restore gagal');
      toast.success(`${data.restoredCount ?? 0} baris berhasil dikembalikan.`);
      await loadRows();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Restore gagal';
      toast.error(msg);
    } finally {
      setRestoring(false);
    }
  };

  if (status === 'loading') return <p className="text-gray-600">Loading...</p>;

  if (!canView) {
    return (
      <Card className="p-6">
        <p className="text-sm text-gray-600">Anda tidak memiliki akses ke halaman ini.</p>
      </Card>
    );
  }

  const allSelectedOnPage =
    filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.confinsPaymentDocId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marked Unused</h2>
          <p className="mt-1 text-sm text-gray-600">
            Daftar pembayaran Confins yang ditandai sebagai tidak dipakai untuk reconciliation. Baris di sini
            disembunyikan dari daftar kerja saat sync. Pilih satu/beberapa baris lalu klik <strong>Restore</strong> untuk
            mengembalikannya ke daftar sync-able.
          </p>
        </div>
        <Link
          href="/reconciliation"
          className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to Reconciliation
        </Link>
      </div>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari InterfaceID / Invoice / Vendor / Description..."
              className="h-9 w-72 rounded-md border border-gray-300 px-3 text-sm focus:border-gray-500 focus:outline-none"
            />
            <Button type="button" variant="outline" onClick={loadRows} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-600">
              Total: <span className="font-semibold text-gray-900">{rows.length}</span>
              {search.trim() && (
                <>
                  {' '}
                  | Filtered: <span className="font-semibold text-gray-900">{filteredRows.length}</span>
                </>
              )}
              {' '}
              | Selected: <span className="font-semibold text-gray-900">{selected.size}</span>
            </span>
            <Button
              type="button"
              onClick={restoreSelected}
              disabled={!canRestore || restoring || selected.size === 0}
              className="disabled:cursor-not-allowed disabled:opacity-60"
            >
              {restoring ? 'Restoring...' : `Restore selected (${selected.size})`}
            </Button>
          </div>
        </div>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {!canRestore && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Anda hanya dapat melihat — restore membutuhkan izin &quot;Edit Reconciliation Mapping&quot;.
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <Table className="min-w-[1200px] text-sm">
            <thead className="bg-gray-50">
              <TableHeaderRow className="border-gray-200">
                <TableHead className="w-10 text-xs font-semibold uppercase text-gray-600">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAll}
                    disabled={!canRestore || filteredRows.length === 0}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Marked At</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Invoice Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">FY / Month</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Source</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Interface ID</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Invoice / Journal</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Department</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">GL Account</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Description</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">Amount</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Marked By</TableHead>
              </TableHeaderRow>
            </thead>
            <tbody>
              {filteredRows.length === 0 && !loading && (
                <TableEmptyRow colSpan={12}>
                  {rows.length === 0
                    ? 'Belum ada pembayaran yang ditandai sebagai unused.'
                    : 'Tidak ada baris yang cocok dengan pencarian.'}
                </TableEmptyRow>
              )}
              {filteredRows.map((r) => (
                <TableBodyRow key={r.id} className="border-gray-200">
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.confinsPaymentDocId}`}
                      checked={selected.has(r.confinsPaymentDocId)}
                      onChange={() => toggleSelect(r.confinsPaymentDocId)}
                      disabled={!canRestore}
                    />
                  </TableCell>
                  <TableCell>{formatDate(r.markedAt)}</TableCell>
                  <TableCell>{r.invoiceDate ?? '-'}</TableCell>
                  <TableCell>
                    {r.fiscalYear} / {String(r.month).padStart(2, '0')}
                  </TableCell>
                  <TableCell>{r.paymentSource ?? '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{r.interfaceId ?? '-'}</TableCell>
                  <TableCell className="text-xs">
                    <div>{r.invoiceNo ?? '-'}</div>
                    <div className="text-gray-500">{r.journalNo ?? '-'}</div>
                  </TableCell>
                  <TableCell>
                    {r.departmentCode ? `${r.departmentCode} - ${r.departmentName ?? ''}` : r.departmentName ?? '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.glAccountCode ? `${r.glAccountCode} - ${r.glAccountName ?? ''}` : '-'}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate" title={r.description ?? ''}>
                    {r.description ?? '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(r.paidAmount))}
                    {r.currency && <span className="ml-1 text-xs text-gray-500">{r.currency}</span>}
                  </TableCell>
                  <TableCell>{r.markedByName}</TableCell>
                </TableBodyRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
