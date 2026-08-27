import Card from '@/components/ui/Card';
import { formatPercent } from '@/lib/dashboard/format';

type DashboardGaugeProps = {
  title: string;
  subtitle?: string;
  percent: number | null;
};

export default function DashboardGauge({ title, subtitle, percent }: DashboardGaugeProps) {
  const value = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  const tone = percent == null ? 'text-gray-500' : percent > 100 ? 'text-rose-600' : percent >= 80 ? 'text-amber-600' : 'text-emerald-600';
  const bar = percent == null ? 'bg-gray-300' : percent > 100 ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <Card className="h-full space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      <div className="space-y-3">
        <p className={`text-3xl font-semibold tabular-nums ${tone}`}>{formatPercent(percent)}</p>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>0%</span>
          <span>Target 100%</span>
        </div>
      </div>
    </Card>
  );
}
