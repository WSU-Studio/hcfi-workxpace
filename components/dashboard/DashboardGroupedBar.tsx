import Card from '@/components/ui/Card';
import { formatCompactIdr, formatIdr } from '@/lib/dashboard/format';
import { cn } from '@/lib/utils';

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
  yAxisLabel?: string;
  showYAxis?: boolean;
  legendPosition?: 'top' | 'bottom';
  titleClassName?: string;
};

function niceCeil(value: number): number {
  if (!(value > 0)) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const mantissa = value / exp;
  const nice = mantissa <= 1 ? 1 : mantissa <= 2 ? 2 : mantissa <= 5 ? 5 : 10;
  return nice * exp;
}

function yAxisTicks(maxValue: number, count = 5): number[] {
  const top = niceCeil(maxValue);
  return Array.from({ length: count }, (_, index) => (top * index) / (count - 1));
}

function Legend({ series }: { series: DashboardGroupedSeries[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {series.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default function DashboardGroupedBar({
  title,
  subtitle,
  categories,
  series,
  yAxisLabel,
  showYAxis = false,
  legendPosition = 'top',
  titleClassName,
}: DashboardGroupedBarProps) {
  const max = Math.max(...series.flatMap((item) => item.values), 0);
  const ticks = yAxisTicks(max);
  const scaleMax = ticks[ticks.length - 1] ?? 1;

  return (
    <Card className="h-full space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={cn('text-sm font-semibold text-gray-900', titleClassName)}>{title}</h3>
          {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
        </div>
        {legendPosition === 'top' ? <Legend series={series} /> : null}
      </div>
      {categories.length === 0 || max <= 0 ? (
        <p className="text-sm text-gray-500">No data for the selected period.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            {showYAxis ? (
              <div className="flex flex-col items-end">
                {yAxisLabel ? (
                  <span className="mb-1 text-[10px] font-medium text-gray-400">{yAxisLabel}</span>
                ) : null}
                <div className="flex h-44 flex-col justify-between text-right text-[10px] tabular-nums text-gray-400">
                  {[...ticks].reverse().map((tick) => (
                    <span key={tick}>{formatCompactIdr(tick)}</span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="min-w-0 flex-1 overflow-x-auto pb-1">
              <div className="relative h-44">
                {showYAxis
                  ? ticks.map((tick) => (
                      <div
                        key={`grid-${tick}`}
                        className="absolute inset-x-0 border-t border-gray-100"
                        style={{ bottom: `${(tick / scaleMax) * 100}%` }}
                      />
                    ))
                  : null}
                <div className="relative flex h-full items-stretch gap-2">
                  {categories.map((category, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex h-full min-w-[3.25rem] flex-1 items-end justify-center gap-0.5"
                    >
                      {series.map((item) => {
                        const value = item.values[index] ?? 0;
                        const height = scaleMax > 0 ? (value / scaleMax) * 100 : 0;
                        return (
                          <div
                            key={item.key}
                            title={`${item.label}: ${formatIdr(value)}`}
                            className="w-2.5 rounded-t-sm"
                            style={{
                              height: value > 0 ? `${Math.max(4, height)}%` : '0px',
                              backgroundColor: item.color,
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                {categories.map((category, index) => (
                  <span
                    key={`${category}-label-${index}`}
                    className="min-w-[3.25rem] flex-1 truncate text-center text-[10px] text-gray-500"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {legendPosition === 'bottom' ? (
            <div className="flex justify-center">
              <Legend series={series} />
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
