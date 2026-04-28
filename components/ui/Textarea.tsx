import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const textareaFieldClassName =
  'w-full rounded-lg border border-gray-400 px-2.5 py-2 transition-all duration-300 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, required = false, value, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      value={value}
      className={cn(textareaFieldClassName, className)}
      required={required}
      aria-required={required}
      aria-invalid={required && !value ? 'true' : undefined}
      {...props}
    />
  );
});

export default Textarea;
