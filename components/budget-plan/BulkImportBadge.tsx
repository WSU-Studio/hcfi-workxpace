import { cn } from '@/lib/utils';

export interface BulkImportBadgeProps {
  className?: string;
}

export default function BulkImportBadge({ className }: BulkImportBadgeProps) {
  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded-lg text-xs whitespace-nowrap border bg-violet-100 text-violet-800 border-violet-200',
        className,
      )}
    >
      Imported
    </span>
  );
}
