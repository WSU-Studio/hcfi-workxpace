'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import DataMartStagingTable from '@/components/reports/DataMartStagingTable';
import { buildStagingGuidelineCsv } from '@/lib/data-mart/staging-export-csv';
import type { DataMartStagingApiRow } from '@/types/data-mart-staging';
import { IconDatabase } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type DepartmentOption = { id: string; code: string; name: string };

export default function DataMartsReportPage() {
  const { data: session, status } = useSession();
  const now = new Date();
  const canView = Boolean(session?.user?.access?.menuAccess?.reports);

  const [fiscalYear, setFiscalYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [originOffice, setOriginOffice] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [rows, setRows] = useState<DataMartStagingApiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    const res = await fetch('/api/budget-plans');
    if (!res.ok) return;
    const data = (await res.json()) as { departments?: DepartmentOption[] };
    setDepartments(data.departments ?? []);
  }, []);

  const loadStaging = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/reports/data-mart', window.location.origin);
      url.searchParams.set('fiscalYear', fiscalYear);
      if (month) url.searchParams.set('month', month);
      if (departmentId) url.searchParams.set('departmentId', departmentId);
      if (originOffice.trim()) url.searchParams.set('originOffice', originOffice.trim());
      if (vendorName.trim()) url.searchParams.set('vendorName', vendorName.trim());
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setRows(data.rows ?? []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canView, fiscalYear, month, departmentId, originOffice, vendorName]);

  useEffect(() => {
    if (status !== 'authenticated' || !canView) return;
    loadDepartments();
  }, [status, canView, loadDepartments]);

  useEffect(() => {
    if (status !== 'authenticated' || !canView) return;
    void loadStaging();
    // fiscal selects reload automatically; origin/vendor require "Apply filters"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canView, fiscalYear, month, departmentId]);

  const exportCsv = useCallback(() => {
    const blob = new Blob([buildStagingGuidelineCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `data-mart-staging-${fiscalYear}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [rows, fiscalYear]);

  const subtitle = useMemo(
    () =>
      total > rows.length
        ? `Showing ${rows.length} of ${total} rows (indexed columns + JSON fallback stored per save).`
        : `${total} row${total === 1 ? '' : 's'} loaded.`,
    [total, rows.length]
  );

  if (status === 'loading') {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-10 text-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!canView) {
    return (
      <Card className="p-8">
        <p className="text-center text-gray-600">You do not have access to this section.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Data Marts</h2>
        {/* <p className="mt-1 text-sm text-gray-600">
          Staging dataset from saved reconciliation: indexed columns for fast filtering; Confins and budget snapshots are
          kept in JSON for schema drift and extra fields.
        </p> */}
      </div>

      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <IconDatabase className="h-5 w-5 text-blue-600" aria-hidden />
          <span className="text-sm font-medium text-gray-800">Filters</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Fiscal year</span>
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
              {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
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
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Origin office contains</span>
            <input
              type="text"
              value={originOffice}
              onChange={(e) => setOriginOffice(e.target.value)}
              placeholder="e.g. HEAD OFFICE"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Vendor contains</span>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <Button type="button" variant="outline" onClick={loadStaging} disabled={loading}>
              {loading ? 'Loading…' : 'Apply filters'}
            </Button>
            <Button type="button" onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">{subtitle}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <DataMartStagingTable rows={rows} />
    </div>
  );
}
