'use client';

import { ReactNode, useId, useState } from 'react';
import { cn } from '@/lib/utils';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

const placementClassName: Record<TooltipPlacement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  className?: string;
  tooltipClassName?: string;
  disabled?: boolean;
}

export default function Tooltip({
  content,
  children,
  placement = 'top',
  className,
  tooltipClassName,
  disabled = false,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  if (disabled || content == null || content === '') {
    return <>{children}</>;
  }

  const show = () => setIsOpen(true);
  const hide = () => setIsOpen(false);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span aria-describedby={isOpen ? tooltipId : undefined} className="inline-flex">
        {children}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg transition-opacity duration-150',
          placementClassName[placement],
          isOpen ? 'opacity-100' : 'opacity-0',
          tooltipClassName,
        )}
      >
        {content}
      </span>
    </span>
  );
}
