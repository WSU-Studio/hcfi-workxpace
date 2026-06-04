import { cn } from '@/lib/utils';

export interface RequestCountBadgeProps {
  count: number;
  /**
   * When true, the "No request" placeholder is rendered for `count === 0`.
   * Default `false` — the component renders nothing if there are no requests,
   * so callers in dense UIs (e.g. status cells) don't get noisy placeholders.
   */
  showEmpty?: boolean;
  className?: string;
}

export default function RequestCountBadge({
  count,
  showEmpty = false,
  className,
}: RequestCountBadgeProps) {
  if (count <= 0) {
    if (!showEmpty) return null;
    return (
      <span className={cn('text-xs text-gray-400', className)}>No request</span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200',
        className,
      )}
    >
      {count} request{count > 1 ? 's' : ''}
    </span>
  );
}
