'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import DataMartStagingTable from '@/components/reports/DataMartStagingTable';
import { buildStagingGuidelineCsv } from '@/lib/data-mart/staging-export-csv';
import type { DataMartStagingApiRow } from '@/types/data-mart-staging';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Input, { inputFieldClassName } from '@/components/ui/Input';

type DepartmentOption = { id: string; code: string; name: string };
type MasterCategory = { id: string; name: string; isActive?: boolean };
type MasterCki = { id: string; name: string; isActive?: boolean };
type MasterOriginOffice = { id: string; code: string; name: string; isActive?: boolean };
type MasterProject = { id: string; code: string; name: string };

export default function DataMartsReportPage() {
  const { data: session, status } = useSession();
  const now = new Date();
  const canView = Boolean(session?.user?.access?.menuAccess?.reports);

  const [fiscalYear, setFiscalYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [originOfficeId, setOriginOfficeId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryKeyIndexId, setCategoryKeyIndexId] = useState('');
  const [projectId, setProjectId] = useState('');

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [categoryKeyIndexes, setCategoryKeyIndexes] = useState<MasterCki[]>([]);
  const [originOffices, setOriginOffices] = useState<MasterOriginOffice[]>([]);
  const [projects, setProjects] = useState<MasterProject[]>([]);

  const [rows, setRows] = useState<DataMartStagingApiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFilterOptions = useCallback(async () => {
    const [planRes, catRes, ckiRes, ooRes, projRes] = await Promise.all([
      fetch('/api/budget-plans'),
      fetch('/api/workspace-management/category'),
      fetch('/api/workspace-management/category-key-index'),
      fetch('/api/workspace-management/origin-office'),
      fetch('/api/workspace-management/project'),
    ]);

    if (planRes.ok) {
      const data = (await planRes.json()) as { departments?: DepartmentOption[] };
      setDepartments(data.departments ?? []);
    }
    if (catRes.ok) {
      const data = (await catRes.json()) as { categories?: MasterCategory[] };
      const list = (data.categories ?? []).filter((c) => c.isActive !== false);
      setCategories(list.sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (ckiRes.ok) {
      const data = (await ckiRes.json()) as { categoryKeyIndexes?: MasterCki[] };
      const list = (data.categoryKeyIndexes ?? []).filter((c) => c.isActive !== false);
      setCategoryKeyIndexes(list.sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (ooRes.ok) {
      const data = (await ooRes.json()) as { originOffices?: MasterOriginOffice[] };
      const list = (data.originOffices ?? []).filter((o) => o.isActive !== false);
      setOriginOffices(list.sort((a, b) => a.code.localeCompare(b.code)));
    }
    if (projRes.ok) {
      const data = (await projRes.json()) as { projects?: MasterProject[] };
      const list = data.projects ?? [];
      setProjects(list.sort((a, b) => a.code.localeCompare(b.code)));
    }
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
      if (originOfficeId) url.searchParams.set('originOfficeId', originOfficeId);
      if (vendorName.trim()) url.searchParams.set('vendorName', vendorName.trim());
      if (categoryId) url.searchParams.set('categoryId', categoryId);
      if (categoryKeyIndexId) url.searchParams.set('categoryKeyIndexId', categoryKeyIndexId);
      if (projectId) url.searchParams.set('projectId', projectId);
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
  }, [
    canView,
    fiscalYear,
    month,
    departmentId,
    originOfficeId,
    vendorName,
    categoryId,
    categoryKeyIndexId,
    projectId,
  ]);

  useEffect(() => {
    if (status !== 'authenticated' || !canView) return;
    void loadFilterOptions();
  }, [status, canView, loadFilterOptions]);

  useEffect(() => {
    if (status !== 'authenticated' || !canView) return;
    void loadStaging();
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
      </div>

      <Card className="space-y-4 p-6">
        <div className="flex w-full gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <span className="font-medium text-gray-700">Origin office</span>
              <Select value={originOfficeId} onChange={(e) => setOriginOfficeId(e.target.value)}>
                <option value="">All</option>
                {originOffices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} — {o.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Expense category</span>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Category key index</span>
              <Select value={categoryKeyIndexId} onChange={(e) => setCategoryKeyIndexId(e.target.value)}>
                <option value="">All</option>
                {categoryKeyIndexes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Vendor contains</span>
              <Input
                value={vendorName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVendorName(e.target.value)}
                className={inputFieldClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Project code</span>
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">All</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="flex flex-col items-end justify-end gap-2">
            <Button className="whitespace-nowrap" type="button" onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </Button>
            <Button className="whitespace-nowrap" type="button" variant="outline" onClick={loadStaging} disabled={loading}>
              {loading ? 'Loading…' : 'Apply filters'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {subtitle} Origin office, category, key index, and project use workspace master data (exact match to staging).
          Click Apply after changing those filters.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <DataMartStagingTable rows={rows} />
    </div>
  );
}
