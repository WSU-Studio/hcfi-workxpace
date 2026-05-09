'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
} from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

type ReportRow = {
  id: string;
  confinsPaymentDocId: string;
  budgetRequestCode: string;
  budgetRequestSubject: string;
  budgetPlanCode: string | null;
  matchType: string;
  incomingReferenceId: string;
  paidAmount: string;
  expectedAmount: string;
  variance: string;
  fiscalYear: number;
  month: number;
  departmentCode: string | null;
  departmentName: string | null;
  voucherNumber: string | null;
  paymentDescription: string | null;
  paymentSource: string | null;
  glAccountCode: string | null;
  glAccountName: string | null;
  savedByName: string;
  savedAt: string;
};

type DepartmentOption = { id: string; code: string; name: string };

export default function ReconciliationReportPage() {
  const { data: session, status } = useSession();
  const now = new Date();
  const canView = Boolean(session?.user?.access?.menuAccess?.reports);

  const [fiscalYear, setFiscalYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    const res = await fetch('/api/budget-plans');
    if (!res.ok) return;
    const data = (await res.json()) as { departments?: DepartmentOption[] };
    setDepartments(data.departments ?? []);
  }, []);

  const loadReport = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/reconciliation/report', window.location.origin);
      url.searchParams.set('fiscalYear', fiscalYear);
      if (month) url.searchParams.set('month', month);
      if (departmentId) url.searchParams.set('departmentId', departmentId);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load report');
      setRows(data.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView, fiscalYear, month, departmentId]);

  useEffect(() => {
    if (status !== 'authenticated' || !canView) return;
    loadDepartments();
  }, [status, canView, loadDepartments]);

  useEffect(() => {
    if (status !== 'authenticated' || !canView) return;
    loadReport();
  }, [status, canView, loadReport]);

  const exportCsv = () => {
    const headers = [
      'Saved At',
      'Budget Request',
      'Budget Plan',
      'Incoming Ref',
      'Confins Doc ID',
      'Paid',
      'Expected',
      'Variance',
      'Match',
      'Dept',
      'FY',
      'Month',
      'Saved By',
    ];
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.savedAt,
          r.budgetRequestCode,
          r.budgetPlanCode ?? '',
          r.incomingReferenceId,
          r.confinsPaymentDocId,
          r.paidAmount,
          r.expectedAmount,
          r.variance,
          r.matchType,
          r.departmentCode ?? '',
          r.fiscalYear,
          r.month,
          r.savedByName,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-report-${fiscalYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (status === 'loading') return <p className="text-gray-600">Loading...</p>;

  if (!canView) {
    return (
      <Card className="p-6">
        <p className="text-sm text-gray-600">Anda tidak memiliki akses ke laporan.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reporting — Reconciliation</h2>
        <p className="mt-1 text-sm text-gray-600">
          Data hasil simpan rekonsiliasi (matched) untuk audit dan review manajemen.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Fiscal Year</span>
            <Select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Month</span>
            <Select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">All</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>
                  {new Date(2026, m - 1, 1).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Department</span>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={loadReport} disabled={loading}>
              {loading ? 'Loading...' : 'View'}
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <Table className="min-w-[1100px] text-sm">
            <thead className="bg-gray-50">
              <TableHeaderRow className="border-gray-200">
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Saved At</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Budget Request</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Plan</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Incoming Ref</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Confins Doc</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">Paid</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">Expected</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Match</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-600">Saved By</TableHead>
              </TableHeaderRow>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <TableEmptyRow colSpan={9}>Belum ada data tersimpan untuk filter ini.</TableEmptyRow>
              )}
              {rows.map((r) => (
                <TableBodyRow key={r.id} className="border-gray-200">
                  <TableCell>{formatDate(r.savedAt)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{r.budgetRequestCode}</div>
                    <div className="text-xs text-gray-500">{r.budgetRequestSubject}</div>
                  </TableCell>
                  <TableCell>{r.budgetPlanCode ?? '-'}</TableCell>
                  <TableCell>{r.incomingReferenceId}</TableCell>
                  <TableCell className="max-w-[140px] truncate font-mono text-xs">{r.confinsPaymentDocId}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.paidAmount))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.expectedAmount))}</TableCell>
                  <TableCell className="capitalize">{r.matchType}</TableCell>
                  <TableCell>{r.savedByName}</TableCell>
                </TableBodyRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
