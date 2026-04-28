import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const selectFieldClassName =
  'h-10 w-full rounded-lg border border-gray-400 bg-white px-2.5 transition-all duration-300 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

const redonlyFieldClassName =
  'h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 transition-all duration-300 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer pointer-events-none';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  readonly?: boolean;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, required = false, value, readonly = false, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      value={value}
      className={cn(selectFieldClassName, className, readonly ? redonlyFieldClassName : '')}
      required={required}
      aria-required={required}
      aria-invalid={required && !value ? 'true' : undefined}
      {...props}
    />
  );
});

export default Select;
