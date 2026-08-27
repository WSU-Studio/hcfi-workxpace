import Card from '@/components/ui/Card';
import type { DashboardAlert } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const tone: Record<DashboardAlert['severity'], string> = {
  critical: 'border-rose-200 bg-rose-50 text-rose-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
};

type DashboardAlertsProps = {
  title?: string;
  alerts: DashboardAlert[];
};

export default function DashboardAlerts({ title = 'Budget alerts', alerts }: DashboardAlertsProps) {
  return (
    <Card className="h-full space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-500">No exceptions for the selected period.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert, index) => (
            <li key={`${alert.id}-${index}`} className={cn('rounded-lg border px-3 py-2', tone[alert.severity])}>
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs opacity-80">{alert.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
