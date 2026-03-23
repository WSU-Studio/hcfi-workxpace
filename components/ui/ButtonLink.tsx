import Link from 'next/link';
import { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { buttonBaseClassName, buttonVariantClassName, type ButtonVariant } from '@/components/ui/Button';

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

/**
 * Link yang tampak seperti Button — untuk navigasi (Cancel, Back, dll).
 * Menerima children (termasuk icon + teks).
 */
export default function ButtonLink({ children, className, variant = 'outline', ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonBaseClassName, buttonVariantClassName[variant], className)} {...props}>
      {children}
    </Link>
  );
}
