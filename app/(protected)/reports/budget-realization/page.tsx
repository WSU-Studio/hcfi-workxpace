'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import LoadingSpin from '@/components/ui/LoadingSpin';
import BudgetRealizationTable from '@/components/reports/BudgetRealizationTable';
import RealizationStatsOverview from '@/components/reports/RealizationStatsOverview';
import { formatCurrency } from '@/lib/utils';
import type { BudgetRealizationResponse } from '@/types/budget-realization';

type DepartmentOption = { id: string; code: string; name: string };

const STATUS_OPTIONS = ['', 'Draft', 'Pending', 'Reviewed', 'Approved', 'Revision', 'Declined'] as const;

export default function BudgetRealizationReportPage() {
  const { data: session, status: sessionStatus } = useSession();
  const now = new Date();
  const canView = Boolean(session?.user?.access?.menuAccess?.reports);

  const [fiscalYear, setFiscalYear] = useState(String(now.getFullYear()));
  const [departmentId, setDepartmentId] = useState('');
  const [planStatus, setPlanStatus] = useState<string>('');
  const [onlyWithRequest, setOnlyWithRequest] = useState(false);

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [data, setData] = useState<BudgetRealizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    const res = await fetch('/api/budget-plans');
    if (!res.ok) return;
    const payload = (await res.json()) as { departments?: DepartmentOption[] };
    setDepartments(payload.departments ?? []);
  }, []);

  const loadReport = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/reports/budget-realization', window.location.origin);
      url.searchParams.set('fiscalYear', fiscalYear);
      if (departmentId) url.searchParams.set('departmentId', departmentId);
      if (planStatus) url.searchParams.set('status', planStatus);
      if (onlyWithRequest) url.searchParams.set('onlyWithRequest', '1');

      const res = await fetch(url.toString());
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load report');
      setData(payload as BudgetRealizationResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canView, fiscalYear, departmentId, planStatus, onlyWithRequest]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canView) return;
    void loadDepartments();
  }, [sessionStatus, canView, loadDepartments]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canView) return;
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, canView]);

  const exportCsv = () => {
    if (!data) return;
    const headers = [
      'Plan Code',
      'Subject',
      'Fiscal Year',
      'Department',
      'Status',
      'Has Request',
      'Request Count',
      'Plan Total',
      'Requested Total',
      'Approved Requested Total',
      'Utilization %',
    ];
    const lines = [
      headers.join(','),
      ...data.rows.map((r) =>
        [
          r.planCode,
          r.planSubject,
          r.fiscalYear,
          r.departmentName,
          r.status,
          r.hasRequest ? 'Yes' : 'No',
          r.requestCount,
          r.planTotal,
          r.requestedTotal,
          r.approvedRequestedTotal,
          r.utilizationPercent === null ? '' : r.utilizationPercent.toFixed(2),
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-plan-realization-${fiscalYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sessionStatus === 'loading') return <LoadingSpin />;

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
        <h2 className="text-2xl font-bold text-gray-900">Budget Plan Realization</h2>
        <p className="mt-1 text-sm text-gray-600">
          Bandingkan tiap budget plan dengan budget request yang sudah dibuat. Lihat status approval, total
          nominal, dan rasio realisasi.
        </p>
      </div>

      {data && <RealizationStatsOverview totals={data.totals} />}

      <Card className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
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
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Plan Status</span>
            <Select value={planStatus} onChange={(e) => setPlanStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s || 'all'} value={s}>
                  {s || 'All'}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col justify-end space-y-1 text-sm">
            <span className="font-medium text-gray-700">Coverage</span>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm hover:border-blue-400">
              <input
                type="checkbox"
                checked={onlyWithRequest}
                onChange={(e) => setOnlyWithRequest(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Only plans with requests</span>
            </label>
          </label>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={loadReport} disabled={loading}>
              {loading ? 'Loading...' : 'Apply'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportCsv}
              disabled={!data || data.rows.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {data && data.rows.length > 0 && (
          <p className="text-xs text-gray-500">
            Showing {data.rows.length} plan{data.rows.length === 1 ? '' : 's'}. Plan total{' '}
            {formatCurrency(Number(data.totals.planTotal))} vs requested{' '}
            {formatCurrency(Number(data.totals.requestedTotal))}.
          </p>
        )}
      </Card>

      <BudgetRealizationTable rows={data?.rows ?? []} />
    </div>
  );
}
