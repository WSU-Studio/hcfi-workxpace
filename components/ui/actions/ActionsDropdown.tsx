'use client';

import { useRef, useState } from 'react';
import { LucideIcon, MoreVertical } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';
import IconActionButton from '@/components/ui/actions/IconActionButton';

export type DropdownAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void | boolean | Promise<void | boolean>;
  variant?: 'default' | 'danger';
  closeOnSelect?: boolean;
};

interface ActionsDropdownProps {
  actions: DropdownAction[];
  triggerAriaLabel?: string;
  className?: string;
  menuClassName?: string;
}

export default function ActionsDropdown({
  actions,
  triggerAriaLabel = 'Open row actions',
  className,
  menuClassName,
}: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(wrapperRef, () => setIsOpen(false));

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <IconActionButton aria-label={triggerAriaLabel} onClick={() => setIsOpen((prev) => !prev)}>
        <MoreVertical className="h-4 w-4" />
      </IconActionButton>

      {isOpen && (
        <Card className={cn('absolute right-8 top-0 z-20 !p-2', menuClassName)}>
          {actions.map((action) => {
            const Icon = action.icon;
            const actionClassName =
              action.variant === 'danger'
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-50';

            return (
              <button
                key={action.label}
                type="button"
                onClick={async () => {
                  const shouldClose = await action.onSelect();
                  if (shouldClose === false) return;
                  if (action.closeOnSelect !== false) {
                    setIsOpen(false);
                  }
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                  actionClassName
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}
