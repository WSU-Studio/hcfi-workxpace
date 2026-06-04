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
    <div className={cn(baseCardClass, 'print:border-gray-300 print:hover:shadow-none print:rounded-md', className)}>
      <button 
        type="button"
        aria-label={isCollapsed ? 'Expand card' : 'Collapse card'}
        className="flex min-h-6 items-center justify-between gap-3 cursor-pointer hover:text-blue-500 transition-colors duration-200 w-full group"
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-expanded={!isCollapsed}
      >
        <div className="min-h-6 min-w-0 flex-1 flex items-center">{headerContent}</div>
        <div
          className={cn(
            'shrink-0 rounded-md p-1 text-gray-500 transition-colors print:hidden',
            'group-hover:bg-blue-100/50 group-hover:text-blue-500',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 cursor-pointer',
          )}
        >
          <ChevronDown
            className={cn(
              'size-4 shrink-0 transition-transform duration-200',
              isCollapsed && '-rotate-90',
            )}
            aria-hidden
          />
        </div>
      </button>
      {hasBody && (
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out',
            isCollapsed
              ? 'pointer-events-none mt-0 grid-rows-[0fr] opacity-0'
              : 'mt-4 grid-rows-[1fr] opacity-100',
            // Saat print, paksa body card terbuka penuh tanpa peduli state collapsed
            'print:pointer-events-auto print:mt-4 print:!grid-rows-[1fr] print:!opacity-100',
          )}
          aria-hidden={isCollapsed}
        >
          <div className="overflow-hidden print:overflow-visible">{bodyContent}</div>
        </div>
      )}
    </div>
  );
};

export default Card;
