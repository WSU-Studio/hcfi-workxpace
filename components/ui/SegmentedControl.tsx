'use client';

import { cn } from '@/lib/utils';

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
};

/**
 * Compact segmented switcher. Single responsibility: pick one option from a
 * small, fixed set. Does not own filter state or fetching.
 */
export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex h-10 w-full min-w-0 items-center rounded-md border border-gray-400 bg-slate-50 overflow-hidden hover:border-blue-600 transition-all duration-200',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 h-[calc(100%-0px)] first:rounded-l-[0.25rem] last:rounded-r-[0.25rem] px-2 text-sm font-medium transition-all duration-200',
              'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
              selected
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-blue-200/70 hover:text-blue-600',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
