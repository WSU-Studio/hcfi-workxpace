import Card from '@/components/ui/Card';
import { formatIdr } from '@/lib/dashboard/format';

export type DashboardGroupedSeries = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

type DashboardGroupedBarProps = {
  title: string;
  subtitle?: string;
  categories: string[];
  series: DashboardGroupedSeries[];
};

export default function DashboardGroupedBar({
  title,
  subtitle,
  categories,
  series,
}: DashboardGroupedBarProps) {
  const max = Math.max(
    ...series.flatMap((item) => item.values),
    0,
  );

  return (
    <Card className="h-full space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      {categories.length === 0 || max <= 0 ? (
        <p className="text-sm text-gray-500">No data for the selected period.</p>
      ) : (
        <div className="flex h-56 items-end gap-2 overflow-x-auto pb-6">
          {categories.map((category, index) => (
            <div key={`${category}-${index}`} className="flex min-w-[3.25rem] flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end justify-center gap-0.5">
                {series.map((item) => {
                  const value = item.values[index] ?? 0;
                  const height = max > 0 ? (value / max) * 100 : 0;
                  return (
                    <div
                      key={item.key}
                      title={`${item.label}: ${formatIdr(value)}`}
                      className="w-2.5 rounded-t-sm"
                      style={{ height: `${Math.max(value > 0 ? 4 : 0, height)}%`, backgroundColor: item.color }}
                    />
                  );
                })}
              </div>
              <span className="max-w-full truncate text-[10px] text-gray-500">{category}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
