import Card from '@/components/ui/Card';
import { formatIdr, formatPercent } from '@/lib/dashboard/format';
import { ratioPercent } from '@/lib/dashboard/metrics';

type DashboardProportionDonutProps = {
  title: string;
  subtitle?: string;
  realized: number;
  remaining: number;
  total: number;
  realizedLabel?: string;
  remainingLabel?: string;
  totalLabel?: string;
  realizedColor?: string;
  remainingColor?: string;
};

export default function DashboardProportionDonut({
  title,
  subtitle,
  realized,
  remaining,
  total,
  realizedLabel = 'Realisasi',
  remainingLabel = 'Sisa Anggaran',
  totalLabel = 'Total Budget',
  realizedColor = '#22c55e',
  remainingColor = '#3b82f6',
}: DashboardProportionDonutProps) {
  const remainingSlice = Math.max(0, remaining);
  const ringTotal = realized + remainingSlice;
  const realizedShare = ratioPercent(realized, total);
  const remainingShare = ratioPercent(remaining, total);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const realizedLength = ringTotal > 0 ? (realized / ringTotal) * circumference : 0;
  const remainingLength = ringTotal > 0 ? (remainingSlice / ringTotal) * circumference : 0;
  const overspent = remaining < 0;

  return (
    <Card className="h-full space-y-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {total <= 0 && realized <= 0 ? (
        <p className="text-sm text-gray-500">No data for the selected period.</p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <svg viewBox="0 0 140 140" className="h-44 w-44 shrink-0">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="16" />
              {remainingLength > 0 ? (
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={remainingColor}
                  strokeWidth="16"
                  strokeDasharray={`${remainingLength} ${circumference - remainingLength}`}
                  strokeDashoffset={-realizedLength}
                  transform="rotate(-90 70 70)"
                />
              ) : null}
              {realizedLength > 0 ? (
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={realizedColor}
                  strokeWidth="16"
                  strokeDasharray={`${realizedLength} ${circumference - realizedLength}`}
                  strokeDashoffset={0}
                  transform="rotate(-90 70 70)"
                />
              ) : null}
              <text
                x="70"
                y="66"
                textAnchor="middle"
                className={overspent ? 'fill-rose-600' : 'fill-gray-900'}
                fontSize="18"
                fontWeight="700"
              >
                {formatPercent(realizedShare, 1)}
              </text>
              <text x="70" y="84" textAnchor="middle" className="fill-gray-500" fontSize="10">
                {realizedLabel}
              </text>
            </svg>
            <ul className="min-w-0 flex-1 space-y-3">
              <li className="flex items-start justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-gray-700">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: realizedColor }} />
                  {realizedLabel}
                </span>
                <span className="text-right tabular-nums text-gray-900">
                  {formatIdr(realized)} ({formatPercent(realizedShare, 1)})
                </span>
              </li>
              <li className="flex items-start justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-gray-700">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: overspent ? '#e11d48' : remainingColor }}
                  />
                  {remainingLabel}
                </span>
                <span className={`text-right tabular-nums ${overspent ? 'text-rose-600' : 'text-gray-900'}`}>
                  {formatIdr(remaining)} ({formatPercent(remainingShare, 1)})
                </span>
              </li>
            </ul>
          </div>
          <p className="text-right text-xs font-medium text-gray-500">
            {totalLabel}: <span className="tabular-nums text-gray-900">{formatIdr(total)}</span>
          </p>
        </>
      )}
    </Card>
  );
}
