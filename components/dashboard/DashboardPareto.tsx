import Card from '@/components/ui/Card';
import { formatIdr, formatPercent } from '@/lib/dashboard/format';
import type { DashboardParetoPoint } from '@/types/dashboard';

type DashboardParetoProps = {
  title: string;
  subtitle?: string;
  items: DashboardParetoPoint[];
};

export default function DashboardPareto({ title, subtitle, items }: DashboardParetoProps) {
  const max = Math.max(...items.map((item) => item.actual), 0);

  return (
    <Card className="h-full space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No vendor concentration data.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="grid grid-cols-[minmax(0,1fr)_5.5rem_4rem] items-center gap-2 text-xs">
              <div>
                <p className="truncate text-gray-700">{item.label}</p>
                <div className="relative mt-1 h-2 rounded-full bg-gray-100">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-blue-500"
                    style={{ width: `${max > 0 ? (item.actual / max) * 100 : 0}%` }}
                  />
                  <div
                    className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-violet-600"
                    style={{ left: `calc(${item.cumulativePercent}% - 4px)` }}
                  />
                </div>
              </div>
              <span className="text-right tabular-nums text-gray-900">{formatIdr(item.actual)}</span>
              <span className="text-right tabular-nums text-violet-700">{formatPercent(item.cumulativePercent, 0)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
