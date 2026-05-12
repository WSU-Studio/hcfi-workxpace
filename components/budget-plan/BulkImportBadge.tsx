import { cn } from '@/lib/utils';

export interface BulkImportBadgeProps {
  className?: string;
}

export default function BulkImportBadge({ className }: BulkImportBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-inset ring-violet-200',
        className,
      )}
    >
      Bulk import
    </span>
  );
}
