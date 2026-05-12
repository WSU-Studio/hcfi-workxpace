import { CheckCircle2, FileText, ListChecks, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { BudgetRealizationResponse } from '@/types/budget-realization';

export interface RealizationStatsOverviewProps {
  totals: BudgetRealizationResponse['totals'];
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'blue',
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'sky';
}) => {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  }[tone];

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`rounded-lg p-2 ring-1 ring-inset ${toneClasses}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
        <div className="mt-0.5 truncate text-lg font-semibold text-gray-900 tabular-nums" title={value}>
          {value}
        </div>
        {hint && <div className="text-xs text-gray-500">{hint}</div>}
      </div>
    </div>
  );
};

/** Ringkasan metrik atas tabel realisasi. */
export default function RealizationStatsOverview({ totals }: RealizationStatsOverviewProps) {
  const planTotal = Number(totals.planTotal);
  const requestedTotal = Number(totals.requestedTotal);
  const overallUtil = planTotal > 0 ? (requestedTotal / planTotal) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={FileText}
        label="Budget Plans"
        value={String(totals.planCount)}
        hint={`${totals.approvedPlanCount} approved`}
        tone="blue"
      />
      <StatCard
        icon={CheckCircle2}
        label="Plans with Request"
        value={String(totals.plansWithRequest)}
        hint={
          totals.planCount > 0
            ? `${((totals.plansWithRequest / totals.planCount) * 100).toFixed(0)}% coverage`
            : undefined
        }
        tone="emerald"
      />
      <StatCard
        icon={Wallet}
        label="Plan Total"
        value={formatCurrency(planTotal)}
        tone="sky"
      />
      <StatCard
        icon={ListChecks}
        label="Requested Total"
        value={formatCurrency(requestedTotal)}
        hint={planTotal > 0 ? `${overallUtil.toFixed(1)}% of plan` : 'No plan total'}
        tone="amber"
      />
    </div>
  );
}
