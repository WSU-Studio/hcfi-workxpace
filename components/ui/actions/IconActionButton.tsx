'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const iconActionButtonClassName =
  'rounded p-1 text-gray-600 transition-colors hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

type IconActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconActionButton({ className, type = 'button', ...props }: IconActionButtonProps) {
  return <button type={type} className={cn(iconActionButtonClassName, 'cursor-pointer', className)} {...props} />;
}
