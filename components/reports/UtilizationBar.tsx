import { cn } from '@/lib/utils';

export interface UtilizationBarProps {
  /** Persentase utilisasi. null = belum terdefinisi (plan = 0). */
  percent: number | null;
  /** Lebar visual maksimum dalam class Tailwind. Default w-32. */
  className?: string;
  /** Tampilkan label angka di sebelah kanan. Default true. */
  showLabel?: boolean;
}

const formatPercent = (n: number): string => `${n.toFixed(0)}%`;

const pickToneClasses = (percent: number | null) => {
  if (percent === null) return { bar: 'bg-gray-300', text: 'text-gray-500' };
  if (percent === 0) return { bar: 'bg-gray-200', text: 'text-gray-500' };
  if (percent > 100) return { bar: 'bg-red-500', text: 'text-red-700' };
  if (percent >= 80) return { bar: 'bg-amber-500', text: 'text-amber-700' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-700' };
};

/** Bar visual + label persentase. Reusable untuk laporan apa pun yang butuh ratio. */
export default function UtilizationBar({ percent, className, showLabel = true }: UtilizationBarProps) {
  const tone = pickToneClasses(percent);
  const widthPct = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  const label = percent === null ? '—' : formatPercent(percent);

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'relative h-2 w-32 overflow-hidden rounded-full bg-gray-100',
          className,
        )}
        role="progressbar"
        aria-valuenow={percent ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={percent === null ? 'No plan total' : `Utilization ${label}`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', tone.bar)}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('w-12 text-right text-xs font-semibold tabular-nums', tone.text)}>
          {label}
        </span>
      )}
    </div>
  );
}
