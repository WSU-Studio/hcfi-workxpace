import {
  AlertTriangle,
  Gauge,
  Landmark,
  Receipt,
  Target,
  TrendingUp,
  Wallet,
  Waves,
} from 'lucide-react';
import DashboardAlerts from '@/components/dashboard/DashboardAlerts';
import DashboardBarList from '@/components/dashboard/DashboardBarList';
import DashboardDonut from '@/components/dashboard/DashboardDonut';
import DashboardGauge from '@/components/dashboard/DashboardGauge';
import DashboardGroupedBar from '@/components/dashboard/DashboardGroupedBar';
import DashboardKpiCard from '@/components/dashboard/DashboardKpiCard';
import DashboardTransactionTable from '@/components/dashboard/DashboardTransactionTable';
import { formatIdr, formatPercent, formatSignedPercent } from '@/lib/dashboard/format';
import type { DashboardSummaryResponse } from '@/types/dashboard';

type PersonaProps = { data: DashboardSummaryResponse };

export default function DepartmentDashboard({ data }: PersonaProps) {
  const { kpis } = data;
  const expenseTypes = [
    ...new Set((data.byExpenseTypeMonth ?? []).flatMap((row) => row.slices.map((slice) => slice.label))),
  ];
  const typeColors = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#64748b'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <DashboardKpiCard icon={Landmark} label="Total Budget" value={formatIdr(kpis.totalBudget)} hint="SUM GR approved amount" tone="slate" />
        <DashboardKpiCard icon={Target} label="Plan YTD" value={formatIdr(kpis.planYtd)} hint="Through selected period" tone="blue" />
        <DashboardKpiCard icon={Wallet} label="Actual YTD" value={formatIdr(kpis.actualYtd)} hint="Paid / origin amount" tone="emerald" />
        <DashboardKpiCard
          icon={Waves}
          label="Remaining Budget"
          value={formatIdr(kpis.remainingBudget)}
          hint="Budget − Actual YTD"
          tone={kpis.remainingBudget < 0 ? 'rose' : 'violet'}
        />
        <DashboardKpiCard
          icon={Gauge}
          label="Budget Utilization"
          value={formatPercent(kpis.budgetUtilizationPercent)}
          hint="Actual / Budget"
          tone="amber"
        />
        <DashboardKpiCard
          icon={TrendingUp}
          label="Plan Achievement"
          value={formatPercent(kpis.planAchievementPercent)}
          hint={`Variance ${formatIdr(kpis.planVariance)}`}
          tone="blue"
        />
        <DashboardKpiCard
          icon={AlertTriangle}
          label="Outstanding GR"
          value={String(kpis.outstandingGrCount)}
          hint={formatIdr(kpis.outstandingGrAmount)}
          tone="rose"
        />
        <DashboardKpiCard
          icon={Receipt}
          label="Payment Requests Paid"
          value={formatIdr(kpis.paymentRequestsPaid)}
          hint="Proxy from data-mart actuals"
          tone="emerald"
        />
        <DashboardKpiCard
          icon={TrendingUp}
          label="Monthly OPEX Run Rate"
          value={kpis.monthlyRunRate == null ? '—' : formatIdr(kpis.monthlyRunRate)}
          hint="Actual YTD / elapsed months"
        />
        <DashboardKpiCard
          icon={Target}
          label="FY Forecast"
          value={formatIdr(kpis.fyForecastRecommended)}
          hint={`Run-rate ${kpis.fyForecastRunRate == null ? '—' : formatIdr(kpis.fyForecastRunRate)}`}
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardGroupedBar
            title="Budget vs Plan vs Actual"
            subtitle="Monthly composition for the selected window"
            categories={data.monthly.map((row) => row.label)}
            series={[
              { key: 'budget', label: 'Budget', color: '#334155', values: data.monthly.map((row) => row.budget) },
              { key: 'plan', label: 'Plan', color: '#2563eb', values: data.monthly.map((row) => row.plan) },
              { key: 'actual', label: 'Actual', color: '#0d9488', values: data.monthly.map((row) => row.actual) },
            ]}
          />
        </div>
        <DashboardGauge
          title="Budget Utilization"
          subtitle={`Cut-off month ${data.cutOffMonth}`}
          percent={kpis.budgetUtilizationPercent}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardDonut title="OPEX by Expense Category" items={data.byCategory} />
        <DashboardBarList title="Top Vendors by OPEX" items={data.byVendor} />
        <DashboardBarList title="OPEX by Activity" items={data.byActivity} />
        <DashboardGroupedBar
          title="OPEX by Expense Type"
          subtitle="Stacked by month"
          categories={data.byExpenseTypeMonth.map((row) => row.label)}
          series={expenseTypes.map((type, index) => ({
            key: type,
            label: type,
            color: typeColors[index % typeColors.length],
            values: data.byExpenseTypeMonth.map(
              (row) => row.slices.find((slice) => slice.label === type)?.actual ?? 0,
            ),
          }))}
        />
      </div>

      <DashboardAlerts alerts={data.alerts} />
      <DashboardTransactionTable
        title="Transaction Detail"
        subtitle={`Plan variance ${formatSignedPercent(kpis.momVariancePercent)} MoM`}
        rows={data.transactions}
      />
    </div>
  );
}
