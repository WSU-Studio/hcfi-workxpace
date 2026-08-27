import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Card from '../ui/Card';

type Tone = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';

const toneMap: Record<Tone, string> = {
  slate: 'bg-slate-50 text-slate-600 ring-slate-100',
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
};

export type DashboardKpiCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
};

export default function DashboardKpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'blue',
}: DashboardKpiCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg p-2 ring-1 ring-inset', toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 truncate text-lg font-semibold tabular-nums text-gray-900" title={value}>
            {value}
          </p>
          {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
        </div>
      </div>
    </Card>
  );
}
