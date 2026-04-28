import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const selectFieldClassName =
  'h-10 w-full rounded-lg border border-gray-400 bg-white px-2.5 transition-all duration-300 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, required = false, value, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      value={value}
      className={cn(selectFieldClassName, className)}
      required={required}
      aria-required={required}
      aria-invalid={required && !value ? 'true' : undefined}
      {...props}
    />
  );
});

export default Select;
