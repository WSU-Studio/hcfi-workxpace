import Card from '@/components/ui/Card';
import { formatIdr } from '@/lib/dashboard/format';

export type WaterfallStep = {
  label: string;
  value: number;
  kind: 'start' | 'delta' | 'total';
};

type DashboardWaterfallProps = {
  title: string;
  subtitle?: string;
  steps: WaterfallStep[];
};

export default function DashboardWaterfall({ title, subtitle, steps }: DashboardWaterfallProps) {
  const running: number[] = [];
  let cursor = 0;
  for (const step of steps) {
    if (step.kind === 'start' || step.kind === 'total') {
      cursor = step.value;
      running.push(0);
    } else {
      running.push(step.value >= 0 ? cursor : cursor + step.value);
      cursor += step.value;
    }
  }
  const max = Math.max(...steps.map((step) => Math.abs(step.value)), cursor, 1);

  return (
    <Card className="h-full space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {steps.length === 0 ? (
        <p className="text-sm text-gray-500">No waterfall data.</p>
      ) : (
        <div className="flex h-56 items-end gap-3 overflow-x-auto pb-6">
          {steps.map((step, index) => {
            const height = (Math.abs(step.value) / max) * 100;
            const offset = (running[index] / max) * 100;
            const color =
              step.kind === 'start'
                ? 'bg-slate-700'
                : step.kind === 'total'
                  ? 'bg-blue-600'
                  : step.value < 0
                    ? 'bg-emerald-500'
                    : 'bg-rose-500';
            return (
              <div key={step.label} className="flex min-w-[4.5rem] flex-1 flex-col items-center">
                <div className="relative flex h-44 w-full items-end justify-center">
                  <div
                    className={`w-8 rounded-t-sm ${color}`}
                    style={{ height: `${Math.max(6, height)}%`, marginBottom: `${Math.max(0, offset)}%` }}
                    title={`${step.label}: ${formatIdr(step.value)}`}
                  />
                </div>
                <span className="mt-2 max-w-full truncate text-center text-[10px] text-gray-500">{step.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
