import { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full', className)} {...props} />;
}

export function TableHeaderRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-gray-400', className)} {...props} />;
}

export function TableBodyRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-gray-400 hover:bg-gray-50', className)} {...props} />;
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-3 print:py-2 text-left font-medium text-gray-900', className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 print:py-2', className)} {...props} />;
}

/** Baris kosong / pesan “tidak ada data” */
export function TableEmptyRow({ colSpan, children, className }: { colSpan: number; children: ReactNode; className?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('py-8 text-center text-gray-500', className)}>
        {children}
      </td>
    </tr>
  );
}
