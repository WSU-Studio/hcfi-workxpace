import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Styling field teks standar aplikasi — gunakan untuk input & search. */
export const inputFieldClassName =
  'w-full rounded-lg border border-gray-400 px-4 py-2 transition-all duration-300 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, type = 'text', ...props }, ref) {
  return <input ref={ref} type={type} className={cn(inputFieldClassName, className)} {...props} />;
});

export default Input;
