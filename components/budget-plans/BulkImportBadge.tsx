import { cn } from '@/lib/utils';

export interface BulkImportBadgeProps {
  className?: string;
}

export default function BulkImportBadge({ className }: BulkImportBadgeProps) {
  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded-lg text-xs whitespace-nowrap border bg-sky-100 text-sky-800 border-sky-200',
        className,
      )}
    >
      Imported
    </span>
  );
}
