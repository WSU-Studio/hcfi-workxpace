import Card from '@/components/ui/Card';
import { formatIdr } from '@/lib/dashboard/format';
import type { DashboardCostDriverPoint } from '@/types/dashboard';

type DashboardScatterProps = {
  title: string;
  subtitle?: string;
  items: DashboardCostDriverPoint[];
};

export default function DashboardScatter({ title, subtitle, items }: DashboardScatterProps) {
  const maxX = Math.max(...items.map((item) => item.volume), 1);
  const maxY = Math.max(...items.map((item) => item.costPerUnit ?? 0), 1);

  return (
    <Card className="h-full space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No cost-driver metric on the selected rows.</p>
      ) : (
        <div className="relative h-56 rounded-lg border border-gray-100 bg-slate-50">
          <span className="absolute bottom-2 left-2 text-[10px] text-gray-500">Volume →</span>
          <span className="absolute left-2 top-2 text-[10px] text-gray-500">Cost / unit</span>
          {items.map((item, index) => {
            const x = (item.volume / maxX) * 88 + 6;
            const y = 88 - ((item.costPerUnit ?? 0) / maxY) * 76;
            return (
              <div
                key={`${item.label}-${index}`}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 shadow-sm"
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${item.label}: ${formatIdr(item.actual)} / vol ${item.volume.toFixed(1)}`}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
