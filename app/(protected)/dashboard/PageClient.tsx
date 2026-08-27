'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import DashboardFilters, { type DashboardFilterState } from '@/components/dashboard/DashboardFilters';
import DepartmentDashboard from '@/components/dashboard/DepartmentDashboard';
import DirectorDashboard from '@/components/dashboard/DirectorDashboard';
import FpaDashboard from '@/components/dashboard/FpaDashboard';
import { DASHBOARD_VIEW_OPTIONS, parseDashboardView, type DashboardView } from '@/types/access-control';
import type { DashboardSummaryResponse } from '@/types/dashboard';
import { getCurrentFiscalYear } from '@/lib/fiscal-year';

const emptyFilters = (): DashboardFilterState => ({
  fiscalYear: String(getCurrentFiscalYear()),
  quarter: '',
  month: '',
  departmentId: '',
  expenseCategory: '',
  vendorName: '',
  activity: '',
  projectCode: '',
  expenseType: '',
});

export default function DashboardPageClient() {
  const { data: session, status } = useSession();
  const canView = Boolean(session?.user?.access?.menuAccess?.dashboard);
  const persona: DashboardView = parseDashboardView(session?.user?.access?.activityAccess?.dashboardView);
  const viewAllDepartments = Boolean(session?.user?.access?.activityAccess?.viewAllDashboardDepartments);
  const personaMeta = DASHBOARD_VIEW_OPTIONS.find((option) => option.value === persona);

  const [filters, setFilters] = useState<DashboardFilterState>(emptyFilters);
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = useMemo(() => {
    const current = getCurrentFiscalYear();
    return [current, current - 1, current - 2];
  }, []);

  const load = useCallback(async (applied: DashboardFilterState = filters) => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/dashboard/summary', window.location.origin);
      url.searchParams.set('fiscalYear', applied.fiscalYear);
      if (applied.quarter) url.searchParams.set('quarter', applied.quarter);
      if (applied.month) url.searchParams.set('month', applied.month);
      if (viewAllDepartments && applied.departmentId) url.searchParams.set('departmentId', applied.departmentId);
      if (applied.expenseCategory) url.searchParams.set('expenseCategory', applied.expenseCategory);
      if (applied.vendorName) url.searchParams.set('vendorName', applied.vendorName);
      if (applied.activity) url.searchParams.set('activity', applied.activity);
      if (applied.projectCode) url.searchParams.set('projectCode', applied.projectCode);
      if (applied.expenseType) url.searchParams.set('expenseType', applied.expenseType);

      const response = await fetch(url.toString());
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? 'Failed to load dashboard');
      setData(payload as DashboardSummaryResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canView, filters, viewAllDepartments]);

  useEffect(() => {
    if (status !== 'authenticated' || !canView) return;
    void load();
    // Initial load only; subsequent refreshes go through Apply filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canView]);

  if (status === 'loading') return <LoadingSpin />;

  if (!canView) {
    return (
      <Card>
        <p className="text-gray-600">You do not have access to the dashboard. Ask an administrator to grant menu access.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{personaMeta?.label ?? 'Department'} Dashboard</h2>
          <p className="text-sm text-gray-500">{personaMeta?.description}</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {personaMeta?.label} view
        </span>
      </div>

      <DashboardFilters
        value={filters}
        years={years}
        options={
          data?.filterOptions ?? {
            departments: [],
            categories: [],
            vendors: [],
            activities: [],
            projects: [],
            expenseTypes: [],
          }
        }
        viewAllDepartments={viewAllDepartments}
        showDimensionFilters={persona === 'department'}
        onChange={setFilters}
        onApply={() => void load()}
        onReset={() => {
          const next = emptyFilters();
          setFilters(next);
          void load(next);
        }}
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading && !data ? <LoadingSpin /> : null}

      {data ? (
        persona === 'director' ? (
          <DirectorDashboard data={data} />
        ) : persona === 'fpa' ? (
          <FpaDashboard data={data} />
        ) : (
          <DepartmentDashboard data={data} />
        )
      ) : null}
    </div>
  );
}
