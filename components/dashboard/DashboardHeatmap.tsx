import Card from '@/components/ui/Card';
import { formatPercent } from '@/lib/dashboard/format';
import type { DashboardHeatmapCell } from '@/types/dashboard';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function cellColor(percent: number | null): string {
  if (percent == null) return 'bg-gray-100 text-gray-400';
  if (percent > 100) return 'bg-rose-600 text-white';
  if (percent >= 90) return 'bg-amber-500 text-white';
  if (percent >= 70) return 'bg-sky-500 text-white';
  if (percent > 0) return 'bg-emerald-500 text-white';
  return 'bg-gray-100 text-gray-400';
}

type DashboardHeatmapProps = {
  title: string;
  subtitle?: string;
  cells: DashboardHeatmapCell[];
};

export default function DashboardHeatmap({ title, subtitle, cells }: DashboardHeatmapProps) {
  const departments = [...new Set((cells ?? []).map((cell) => cell.departmentName))];
  const lookup = new Map((cells ?? []).map((cell) => [`${cell.departmentName}-${cell.month}`, cell.utilizationPercent]));

  return (
    <Card className="h-full space-y-4 overflow-x-auto">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {departments.length === 0 ? (
        <p className="text-sm text-gray-500">No department utilization to plot.</p>
      ) : (
        <table className="w-full min-w-max border-separate border-spacing-1 text-[10px]">
          <thead>
            <tr>
              <th className="px-0 py-1 text-left text-[10px] font-medium text-gray-500">Department</th>
              {MONTHS.map((label, index) => (
                <th key={label + index} className="px-0 py-1 font-medium text-gray-500">
                  <span className="text-[10px] block text-center">{label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => (
              <tr key={department}>
                <td className="text-[10px] truncate px-0 py-1 text-gray-700 line-clamp-2">{department}</td>
                {MONTHS.map((_, index) => {
                  const percent = lookup.get(`${department}-${index + 1}`) ?? null;
                  return (
                    <td key={`${department}-${index}`} className="p-0 w-7">
                      <div
                        className={`flex h-7 w-7 text-[9px] font-medium items-center justify-center rounded-md tabular-nums ${cellColor(percent)}`}
                        title={`${department} M${index + 1}: ${formatPercent(percent)}`}
                      >
                        {percent == null ? '–' : Math.round(percent)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
