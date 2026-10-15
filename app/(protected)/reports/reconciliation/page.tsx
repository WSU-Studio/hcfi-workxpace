'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import FiscalYearSelect from '@/components/forms/FiscalYearSelect';
import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
  TableScroll,
  stickyListCol,
} from '@/components/ui/Table';
import { formatCurrency, formatSignedCurrency, formatDate, cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

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
  const canUnsave = Boolean(session?.user?.access?.activityAccess?.saveReconciliationResult);

  const [fiscalYear, setFiscalYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unsaving, setUnsaving] = useState(false);

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
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setRows([]);
      setSelected(new Set());
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

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === rows.length && rows.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  };

  const unsaveSelected = async () => {
    if (!canUnsave || unsaving || selected.size === 0) return;
    const ok = window.confirm(
      `Unsave ${selected.size} reconciliation match(es)?\n\n` +
        `The match will be removed from this recap and related Data Mart staging rows will be deleted. ` +
        `Payments will reappear on the Reconciliation work list after the next sync so you can match again or mark unused.`
    );
    if (!ok) return;

    setUnsaving(true);
    try {
      const res = await fetch('/api/reconciliation/save', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unsave failed');
      toast.success(`${data.unsavedCount ?? 0} match(es) unsaved.`);
      await loadReport();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unsave failed';
      toast.error(msg);
    } finally {
      setUnsaving(false);
    }
  };

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
        <p className="text-sm text-gray-600">You don&apos;t have access to this report.</p>
      </Card>
    );
  }

  const allSelectedOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reconciliation Recap</h2>
        <p className="mt-1 text-sm text-gray-600">
          Matched records from Reconciliation. Saved records for audit and management review. Select
          wrong matches and use <strong>Unsave selected</strong> to remove them so they can be
          rematched on the work list after the next sync.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Fiscal Year</span>
            <FiscalYearSelect
              value={fiscalYear}
              onChange={(year) => setFiscalYear(String(year))}
            />
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
            <Button type="button" variant="outline" className="whitespace-nowrap" onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-gray-600">
            Rows: <span className="font-semibold text-gray-900">{rows.length}</span>
            {' '}
            | Selected: <span className="font-semibold text-gray-900">{selected.size}</span>
          </span>
          <Button
            type="button"
            variant="danger"
            onClick={unsaveSelected}
            disabled={!canUnsave || unsaving || selected.size === 0}
            className="disabled:cursor-not-allowed disabled:opacity-60"
          >
            {unsaving ? 'Unsaving...' : `Unsave selected (${selected.size})`}
          </Button>
        </div>
        {!canUnsave && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            You can only view — unsaving matches requires &quot;Save Reconciliation Results&quot; permission.
          </p>
        )}
        <TableScroll className="rounded-lg border border-gray-200">
          <Table className="min-w-[1100px] text-sm">
            <thead className="bg-gray-50">
              <TableHeaderRow className="border-gray-200">
                <TableHead className="w-10 text-xs font-semibold uppercase text-gray-600">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAll}
                    disabled={!canUnsave || rows.length === 0 || unsaving}
                  />
                </TableHead>
                <TableHead className={cn(stickyListCol.date.head, 'text-xs font-semibold uppercase text-gray-600')}>
                  Saved At
                </TableHead>
                <TableHead
                  className={cn(stickyListCol.labelAfterDate.head, 'text-xs font-semibold uppercase text-gray-600')}
                >
                  Budget Request
                </TableHead>
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
                <TableEmptyRow colSpan={10}>No saved data for this filter.</TableEmptyRow>
              )}
              {rows.map((r) => (
                <TableBodyRow key={r.id} className="border-gray-200">
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.budgetRequestCode} / ${r.confinsPaymentDocId}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      disabled={!canUnsave || unsaving}
                    />
                  </TableCell>
                  <TableCell className={stickyListCol.date.cell}>{formatDate(r.savedAt)}</TableCell>
                  <TableCell className={stickyListCol.labelAfterDate.cell}>
                    <div className="font-medium text-gray-900 truncate" title={r.budgetRequestCode}>
                      {r.budgetRequestCode}
                    </div>
                    <div className="text-xs text-gray-500 truncate" title={r.budgetRequestSubject}>
                      {r.budgetRequestSubject}
                    </div>
                  </TableCell>
                  <TableCell>{r.budgetPlanCode ?? '-'}</TableCell>
                  <TableCell>{r.incomingReferenceId}</TableCell>
                  <TableCell className="max-w-[140px] truncate font-mono text-xs">{r.confinsPaymentDocId}</TableCell>
                  <TableCell className="text-right">{formatSignedCurrency(Number(r.paidAmount))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.expectedAmount))}</TableCell>
                  <TableCell className="capitalize">{r.matchType}</TableCell>
                  <TableCell>{r.savedByName}</TableCell>
                </TableBodyRow>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      </Card>
    </div>
  );
}
