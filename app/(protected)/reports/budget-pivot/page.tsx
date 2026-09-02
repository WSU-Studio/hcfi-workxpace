'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import FiscalYearSelect from '@/components/forms/FiscalYearSelect';
import Input, { inputFieldClassName } from '@/components/ui/Input';
import BudgetPivotTable, {
  type BudgetPivotViewMode,
} from '@/components/reports/BudgetPivotTable';
import {
  pivotDataMartRows,
  emptyPivotedReport,
  PIVOT_METRIC_LABELS,
  type PivotMetric,
} from '@/lib/data-mart/budget-pivot';
import { exportPivotToXlsx } from '@/lib/data-mart/budget-pivot-export';
import type { DataMartStagingApiRow } from '@/types/data-mart-staging';
import { IconDownload } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type DepartmentOption = { id: string; code: string; name: string };
type MasterCategory = { id: string; name: string; isActive?: boolean };
type MasterCki = { id: string; name: string; isActive?: boolean };
type MasterOriginOffice = { id: string; code: string; name: string; isActive?: boolean };
type MasterProject = { id: string; code: string; name: string };

/**
 * Budget Pivot — same data source as Data Marts, different layout.
 *
 * Re-pivots the flat staging rows by Origin Office › Department, with months
 * as columns. Useful for FP&A who want to read the budget at a glance the way
 * they're used to from Excel.
 *
 * Filter card mirrors Data Marts deliberately (consistency across the report
 * suite). When/if this set of filters needs to evolve we should extract a
 * shared `<ReportFilters />` component — keeping this duplicated in the
 * meantime is the lower-risk path until requirements stabilize.
 */
export default function BudgetPivotReportPage() {
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

  const [viewMode, setViewMode] = useState<BudgetPivotViewMode>('three-section');
  const [singleMetric, setSingleMetric] = useState<PivotMetric>('budgetPlan');

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

  type StagingQuery = {
    fiscalYear: string;
    month: string;
    departmentId: string;
    originOfficeId: string;
    vendorName: string;
    categoryId: string;
    categoryKeyIndexId: string;
    projectId: string;
  };

  const fetchStaging = useCallback(
    async (q: StagingQuery) => {
      if (!canView) return;
      setLoading(true);
      setError(null);
      try {
        const url = new URL('/api/reports/data-mart', window.location.origin);
        url.searchParams.set('fiscalYear', q.fiscalYear);
        if (q.month) url.searchParams.set('month', q.month);
        if (q.departmentId) url.searchParams.set('departmentId', q.departmentId);
        if (q.originOfficeId) url.searchParams.set('originOfficeId', q.originOfficeId);
        if (q.vendorName.trim()) url.searchParams.set('vendorName', q.vendorName.trim());
        if (q.categoryId) url.searchParams.set('categoryId', q.categoryId);
        if (q.categoryKeyIndexId) url.searchParams.set('categoryKeyIndexId', q.categoryKeyIndexId);
        if (q.projectId) url.searchParams.set('projectId', q.projectId);
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
    },
    [canView]
  );

  const loadStaging = useCallback(() => {
    void fetchStaging({
      fiscalYear,
      month,
      departmentId,
      originOfficeId,
      vendorName,
      categoryId,
      categoryKeyIndexId,
      projectId,
    });
  }, [
    fetchStaging,
    fiscalYear,
    month,
    departmentId,
    originOfficeId,
    vendorName,
    categoryId,
    categoryKeyIndexId,
    projectId,
  ]);

  const resetFilters = useCallback(() => {
    const fy = String(new Date().getFullYear());
    setFiscalYear(fy);
    setMonth('');
    setDepartmentId('');
    setOriginOfficeId('');
    setVendorName('');
    setCategoryId('');
    setCategoryKeyIndexId('');
    setProjectId('');
    setViewMode('three-section');
    setSingleMetric('budgetPlan');
    void fetchStaging({
      fiscalYear: fy,
      month: '',
      departmentId: '',
      originOfficeId: '',
      vendorName: '',
      categoryId: '',
      categoryKeyIndexId: '',
      projectId: '',
    });
  }, [fetchStaging]);

  useEffect(() => {
    if (status !== 'authenticated' || !canView) return;
    void loadFilterOptions();
  }, [status, canView, loadFilterOptions]);

  useEffect(() => {
    if (status !== 'authenticated' || !canView) return;
    void fetchStaging({
      fiscalYear,
      month,
      departmentId,
      originOfficeId,
      vendorName,
      categoryId,
      categoryKeyIndexId,
      projectId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canView, fiscalYear, month, departmentId]);

  const pivot = useMemo(() => {
    if (rows.length === 0) return emptyPivotedReport();
    return pivotDataMartRows(rows);
  }, [rows]);

  const subtitle = useMemo(() => {
    const fyNum = Number(fiscalYear);
    const fyTxt = Number.isFinite(fyNum) ? `FY ${fyNum}` : `FY ${fiscalYear}`;
    const viewTxt =
      viewMode === 'three-section'
        ? 'Actual / Budget Request / Budget Plan side-by-side'
        : `Single metric: ${PIVOT_METRIC_LABELS[singleMetric]}`;
    return `${fyTxt} · ${viewTxt} · ${pivot.leafCount} pivoted ${pivot.leafCount === 1 ? 'row' : 'rows'} from ${total} staging rows.`;
  }, [fiscalYear, viewMode, singleMetric, pivot.leafCount, total]);

  const buildFilterCaption = useCallback((): string => {
    const parts: string[] = [];
    parts.push(`FY ${fiscalYear}`);
    if (month) {
      parts.push(`Month: ${new Date(2026, Number(month) - 1, 1).toLocaleString('en-US', { month: 'long' })}`);
    }
    const dept = departments.find((d) => d.id === departmentId);
    if (dept) parts.push(`Department: ${dept.code} — ${dept.name}`);
    const oo = originOffices.find((o) => o.id === originOfficeId);
    if (oo) parts.push(`Origin: ${oo.code} — ${oo.name}`);
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) parts.push(`Category: ${cat.name}`);
    const cki = categoryKeyIndexes.find((c) => c.id === categoryKeyIndexId);
    if (cki) parts.push(`CKI: ${cki.name}`);
    if (vendorName.trim()) parts.push(`Vendor contains: "${vendorName.trim()}"`);
    const proj = projects.find((p) => p.id === projectId);
    if (proj) parts.push(`Project: ${proj.code} — ${proj.name}`);
    return parts.join(' · ');
  }, [
    fiscalYear,
    month,
    departments,
    departmentId,
    originOffices,
    originOfficeId,
    categories,
    categoryId,
    categoryKeyIndexes,
    categoryKeyIndexId,
    vendorName,
    projects,
    projectId,
  ]);

  const downloadXlsx = useCallback(async () => {
    if (pivot.origins.length === 0) return;
    await exportPivotToXlsx(pivot, {
      fiscalYear: Number(fiscalYear) || new Date().getFullYear(),
      visibleMetrics:
        viewMode === 'three-section' ? undefined : [singleMetric],
      fileName: `budget-pivot-${fiscalYear}-${viewMode === 'three-section' ? 'all' : singleMetric}`,
      filterCaption: buildFilterCaption(),
    });
  }, [pivot, fiscalYear, viewMode, singleMetric, buildFilterCaption]);

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
        <h2 className="text-2xl font-bold text-gray-900">Budget Pivot</h2>
        <p className="mt-1 text-sm text-gray-500">
          Annual budget broken down by Origin Office › Department, with months as columns. Same data
          as Data Marts, re-pivoted for FP&amp;A reading.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <div className="flex w-full gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Fiscal year</span>
              <FiscalYearSelect
                value={fiscalYear}
                onChange={(year) => setFiscalYear(String(year))}
              />
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
              <Select
                value={categoryKeyIndexId}
                onChange={(e) => setCategoryKeyIndexId(e.target.value)}
              >
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
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">View mode</span>
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as BudgetPivotViewMode)}
              >
                <option value="three-section">3-section (Actual / BR / BP)</option>
                <option value="single-metric">Single metric</option>
              </Select>
            </label>
            {viewMode === 'single-metric' && (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-gray-700">Metric</span>
                <Select
                  value={singleMetric}
                  onChange={(e) => setSingleMetric(e.target.value as PivotMetric)}
                >
                  <option value="budgetPlan">{PIVOT_METRIC_LABELS.budgetPlan}</option>
                  <option value="budgetRequest">{PIVOT_METRIC_LABELS.budgetRequest}</option>
                  <option value="actual">{PIVOT_METRIC_LABELS.actual}</option>
                </Select>
              </label>
            )}
          </div>

          <div className="flex flex-col items-end justify-end gap-2">
            <Button
              className="whitespace-nowrap"
              type="button"
              onClick={() => void downloadXlsx()}
              disabled={loading || pivot.origins.length === 0}
            >
              <span className="inline-flex items-center gap-1.5">
                <IconDownload className="h-4 w-4" />
                Download Report
              </span>
            </Button>
            <Button
              className="whitespace-nowrap"
              type="button"
              variant="outline"
              onClick={resetFilters}
              disabled={loading}
            >
              Reset filters
            </Button>
            <Button
              className="whitespace-nowrap"
              type="button"
              variant="outline"
              onClick={loadStaging}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Apply filters'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">{subtitle}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <BudgetPivotTable
        data={pivot}
        fiscalYear={Number(fiscalYear) || now.getFullYear()}
        viewMode={viewMode}
        singleMetric={singleMetric}
        emptyMessage={
          loading ? 'Loading data…' : 'No data for the selected filters.'
        }
      />
    </div>
  );
}
