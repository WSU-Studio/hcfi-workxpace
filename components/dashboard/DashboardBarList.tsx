import Card from '@/components/ui/Card';
import { formatIdr, formatPercent } from '@/lib/dashboard/format';
import { cn } from '@/lib/utils';

export type DashboardBarListItem = {
  label: string;
  actual: number;
  secondary?: number | null;
};

type DashboardBarListProps = {
  title: string;
  subtitle?: string;
  items: DashboardBarListItem[];
  emptyLabel?: string;
  valueMode?: 'amount' | 'percent';
};

export default function DashboardBarList({
  title,
  subtitle,
  items,
  emptyLabel = 'No data for the selected period.',
  valueMode = 'amount',
}: DashboardBarListProps) {
  const max = Math.max(...items.map((item) => item.actual), 0);

  return (
    <Card className="h-full space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => {
            const width = max > 0 ? Math.max(4, (item.actual / max) * 100) : 0;
            return (
              <li key={`${item.label}-${index}`} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-700">{item.label}</span>
                  <span className="shrink-0 tabular-nums font-medium text-gray-900">
                    {valueMode === 'percent' ? formatPercent(item.actual) : formatIdr(item.actual)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn('h-full rounded-full bg-blue-500', item.actual > (item.secondary ?? Infinity) && 'bg-rose-500')}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
