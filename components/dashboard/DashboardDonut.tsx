import Card from '@/components/ui/Card';
import { formatIdr, formatPercent } from '@/lib/dashboard/format';

const COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#e11d48', '#64748b'];

type Slice = { label: string; actual: number };

type DashboardDonutProps = {
  title: string;
  subtitle?: string;
  items: Slice[];
};

export default function DashboardDonut({ title, subtitle, items }: DashboardDonutProps) {
  const total = items.reduce((sum, item) => sum + item.actual, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card className="h-full space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {items.length === 0 || total <= 0 ? (
        <p className="text-sm text-gray-500">No data for the selected period.</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="14" />
            {items.map((item, index) => {
              const length = (item.actual / total) * circumference;
              const circle = (
                <circle
                  key={`${item.label}-${index}`}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth="14"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  transform="rotate(-90 60 60)"
                />
              );
              offset += length;
              return circle;
            })}
            <text x="60" y="58" textAnchor="middle" className="fill-gray-900 text-[11px] font-semibold">
              {formatPercent((items[0]?.actual / total) * 100, 0)}
            </text>
            <text x="60" y="72" textAnchor="middle" className="fill-gray-500 text-[8px]">
              top share
            </text>
          </svg>
          <ul className="min-w-0 flex-1 space-y-2">
            {items.slice(0, 6).map((item, index) => (
              <li key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-gray-700">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-gray-900">{formatIdr(item.actual)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
