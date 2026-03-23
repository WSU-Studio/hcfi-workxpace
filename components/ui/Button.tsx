import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'danger';

/** Shared base + variant styles for Button & ButtonLink */
export const buttonBaseClassName = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer';
export const buttonVariantClassName: Record<ButtonVariant, string> = {
  default: 'bg-blue-600 text-white hover:bg-blue-700',
  outline: 'border border-gray-400 hover:bg-gray-50',
  ghost: 'hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export default function Button({ children, className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonBaseClassName, buttonVariantClassName[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
