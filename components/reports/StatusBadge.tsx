import { cn } from '@/lib/utils';

const TONE_BY_STATUS: Record<string, string> = {
  Approved: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Reviewed: 'bg-sky-100 text-sky-800 ring-sky-200',
  Pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  Revision: 'bg-orange-100 text-orange-800 ring-orange-200',
  Declined: 'bg-red-100 text-red-800 ring-red-200',
  Draft: 'bg-gray-100 text-gray-700 ring-gray-200',
};

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

/** Badge status approval generik. Reusable lintas modul (plan, request, dll.). */
export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const tone = TONE_BY_STATUS[status] ?? 'bg-gray-100 text-gray-700 ring-gray-200';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tone,
        className,
      )}
    >
      {status}
    </span>
  );
}
