import { Search } from 'lucide-react';
import Input, { InputProps } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<InputProps, 'type'> {
  /** Lebar wrapper, default `w-80` */
  containerClassName?: string;
}

/**
 * Input pencarian dengan ikon Search di kiri; padding kiri input otomatis `pl-10`.
 */
export default function SearchInput({ containerClassName, className, placeholder = 'Search...', ...props }: SearchInputProps) {
  return (
    <div className={cn('relative w-80', containerClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
      <Input type="search" placeholder={placeholder} className={cn('pl-10 pr-4', className)} {...props} />
    </div>
  );
}
