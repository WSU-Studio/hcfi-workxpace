import { Building2, Gauge, Landmark, Target, Wallet, Waves } from 'lucide-react';
import DashboardBarList from '@/components/dashboard/DashboardBarList';
import DashboardGroupedBar from '@/components/dashboard/DashboardGroupedBar';
import DashboardHeatmap from '@/components/dashboard/DashboardHeatmap';
import DashboardKpiCard from '@/components/dashboard/DashboardKpiCard';
import DashboardTransactionTable from '@/components/dashboard/DashboardTransactionTable';
import { formatIdr, formatPercent } from '@/lib/dashboard/format';
import type { DashboardSummaryResponse } from '@/types/dashboard';

type PersonaProps = { data: DashboardSummaryResponse };

export default function DirectorDashboard({ data }: PersonaProps) {
  const { kpis } = data;
  const departments = data.byDepartment ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <DashboardKpiCard icon={Landmark} label="Total Budget" value={formatIdr(kpis.totalBudget)} tone="slate" />
        <DashboardKpiCard icon={Wallet} label="Actual YTD" value={formatIdr(kpis.actualYtd)} tone="emerald" />
        <DashboardKpiCard icon={Gauge} label="Budget Utilization" value={formatPercent(kpis.budgetUtilizationPercent)} tone="amber" />
        <DashboardKpiCard icon={Target} label="Plan YTD" value={formatIdr(kpis.planYtd)} tone="blue" />
        <DashboardKpiCard icon={Building2} label="Plan Achievement" value={formatPercent(kpis.planAchievementPercent)} />
        <DashboardKpiCard
          icon={Waves}
          label="Remaining Budget"
          value={formatIdr(kpis.remainingBudget)}
          tone={kpis.remainingBudget < 0 ? 'rose' : 'violet'}
        />
      </div>

      <DashboardGroupedBar
        title="Budget vs Actual by Department"
        categories={departments.map((row) => row.departmentName)}
        series={[
          { key: 'budget', label: 'Budget', color: '#334155', values: departments.map((row) => row.budget) },
          { key: 'actual', label: 'Actual', color: '#0d9488', values: departments.map((row) => row.actual) },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardBarList
          title="Department Utilization"
          valueMode="percent"
          items={departments.map((row) => ({
            label: row.departmentName,
            actual: row.utilizationPercent ?? 0,
          }))}
        />
        <DashboardHeatmap title="Department Utilization Heatmap" cells={data.heatmap} />
      </div>

      <DashboardGroupedBar
        title="Expense Composition by Department"
        subtitle="Actual YTD"
        categories={departments.map((row) => row.departmentName)}
        series={[
          { key: 'actual', label: 'Actual', color: '#2563eb', values: departments.map((row) => row.actual) },
          { key: 'plan', label: 'Plan', color: '#94a3b8', values: departments.map((row) => row.plan) },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardBarList title="Top Vendors" items={data.byVendor} />
        <DashboardBarList
          title="Outstanding GR & Payment Requests"
          items={departments.map((row) => ({
            label: row.departmentName,
            actual: row.outstandingGrAmount + row.pendingPrAmount,
          }))}
        />
      </div>

      <DashboardTransactionTable title="Largest Transactions" rows={data.transactions} />
    </div>
  );
}
