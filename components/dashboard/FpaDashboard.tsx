import { Flame, Gauge, Landmark, TrendingUp, Wallet } from 'lucide-react';
import DashboardAlerts from '@/components/dashboard/DashboardAlerts';
import DashboardBarList from '@/components/dashboard/DashboardBarList';
import DashboardGroupedBar from '@/components/dashboard/DashboardGroupedBar';
import DashboardKpiCard from '@/components/dashboard/DashboardKpiCard';
import DashboardPareto from '@/components/dashboard/DashboardPareto';
import DashboardScatter from '@/components/dashboard/DashboardScatter';
import DashboardWaterfall from '@/components/dashboard/DashboardWaterfall';
import { formatIdr, formatPercent, formatSignedPercent } from '@/lib/dashboard/format';
import type { DashboardSummaryResponse } from '@/types/dashboard';

type PersonaProps = { data: DashboardSummaryResponse };

export default function FpaDashboard({ data }: PersonaProps) {
  const { kpis } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <DashboardKpiCard icon={Landmark} label="Total Budget" value={formatIdr(kpis.totalBudget)} tone="slate" />
        <DashboardKpiCard icon={Wallet} label="Actual YTD" value={formatIdr(kpis.actualYtd)} tone="emerald" />
        <DashboardKpiCard
          icon={TrendingUp}
          label="Forecast vs Budget"
          value={formatIdr(kpis.forecastVsBudget)}
          hint="Recommended forecast − budget"
          tone={kpis.forecastVsBudget > 0 ? 'rose' : 'emerald'}
        />
        <DashboardKpiCard
          icon={Gauge}
          label="Monthly Run Rate"
          value={kpis.monthlyRunRate == null ? '—' : formatIdr(kpis.monthlyRunRate)}
        />
        <DashboardKpiCard
          icon={Flame}
          label="Burn Rate"
          value={formatPercent(kpis.burnRatePercent)}
          hint="Annualized pace vs budget"
          tone="amber"
        />
        <DashboardKpiCard
          icon={TrendingUp}
          label="MoM Variance"
          value={formatIdr(kpis.momVariance)}
          hint={formatSignedPercent(kpis.momVariancePercent)}
        />
        <DashboardKpiCard
          icon={Landmark}
          label="Plan Variance"
          value={formatIdr(kpis.planVariance)}
          hint="Actual − Plan YTD"
        />
        <DashboardKpiCard
          icon={Wallet}
          label="Top-5 Vendor Concentration"
          value={formatPercent(kpis.topVendorConcentrationPercent)}
          tone="violet"
        />
      </div>

      <DashboardWaterfall
        title="Budget Waterfall"
        subtitle="Approved budget to remaining after actuals"
        steps={[
          { label: 'Budget', value: kpis.totalBudget, kind: 'start' },
          { label: 'Actual YTD', value: -kpis.actualYtd, kind: 'delta' },
          { label: 'Remaining', value: kpis.remainingBudget, kind: 'total' },
          { label: 'Forecast', value: kpis.fyForecastRecommended, kind: 'total' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPareto
          title="Vendor Spend Concentration"
          subtitle="Bars = spend; dots = cumulative %"
          items={data.paretoVendors}
        />
        <DashboardScatter title="Cost Driver Analysis" items={data.costDrivers} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardBarList title="GL Account Analysis" items={data.byGlAccount} />
        <DashboardGroupedBar
          title="Monthly OPEX Trend"
          categories={data.monthly.map((row) => row.label)}
          series={[
            { key: 'actual', label: 'Actual', color: '#0d9488', values: data.monthly.map((row) => row.actual) },
            { key: 'plan', label: 'Plan', color: '#2563eb', values: data.monthly.map((row) => row.plan) },
          ]}
        />
      </div>

      <DashboardGroupedBar
        title="Variance Analysis"
        subtitle="Plan vs actual vs budget by month"
        categories={data.monthly.map((row) => row.label)}
        series={[
          { key: 'planVar', label: 'Actual − Plan', color: '#d97706', values: data.monthly.map((row) => row.actual - row.plan) },
          { key: 'budgetVar', label: 'Actual − Budget', color: '#e11d48', values: data.monthly.map((row) => row.actual - row.budget) },
        ]}
      />

      <DashboardAlerts title="Exception Dashboard" alerts={data.alerts} />
    </div>
  );
}
