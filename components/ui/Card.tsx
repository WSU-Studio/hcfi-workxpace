'use client';

import { useState, Children, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  /** When collapsible, use this for the always-visible top row; otherwise the first child is treated as the header. */
  header?: ReactNode;
  className?: string;
  collapsible?: boolean;
  /** When true with collapsible, the card starts collapsed on first paint. */
  collapsed?: boolean;
}

const baseCardClass =
  'bg-white p-4 rounded-lg border border-gray-200 transition-all duration-300 hover:border-blue-500 hover:shadow-md';

const Card = ({
  children,
  header,
  collapsible,
  collapsed: initialCollapsed = false,
  className = '',
}: CardProps) => {
  const [isCollapsed, setIsCollapsed] = useState(
    () => Boolean(collapsible && initialCollapsed),
  );

  if (!collapsible) {
    return <div className={cn(baseCardClass, className)}>{children}</div>;
  }

  const childArray = Children.toArray(children);
  const headerContent = header ?? childArray[0];
  const bodyContent = header ? children : childArray.slice(1);
  const hasBody = Children.count(bodyContent) > 0;

  return (
    <div className={cn(baseCardClass, className)}>
      <div className="flex min-h-6 items-center justify-between gap-3">
        <div className="min-h-6 min-w-0 flex-1 flex items-center">{headerContent}</div>
        <button
          type="button"
          className={cn(
            'shrink-0 rounded-md p-1 text-gray-500 transition-colors',
            'hover:bg-gray-100 hover:text-gray-800',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
          )}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand card' : 'Collapse card'}
          onClick={() => setIsCollapsed((prev) => !prev)}
        >
          <ChevronDown
            className={cn(
              'size-4 shrink-0 transition-transform duration-200',
              isCollapsed && '-rotate-90',
            )}
            aria-hidden
          />
        </button>
      </div>
      {hasBody && (
        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out',
            isCollapsed
              ? 'pointer-events-none mt-0 max-h-0 opacity-0'
              : 'mt-4 max-h-[min(10000px,100vh)] opacity-100',
          )}
          aria-hidden={isCollapsed}
        >
          {bodyContent}
        </div>
      )}
    </div>
  );
};

export default Card;
