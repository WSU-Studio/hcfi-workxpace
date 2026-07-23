import { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Horizontal scroll shell — pair with sticky list columns on small screens. */
export function TableScroll({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-x-auto', className)} {...props} />;
}

/**
 * Sticky left columns for list tables.
 * Fixed min-widths keep `left` offsets aligned while the rest of the row scrolls.
 * - BP/BR/PR: index → createdAt → id (edge shadow)
 * - User list: index → name (edge shadow)
 * - Master (Division/Department): index → code → name (edge shadow)
 */
export const stickyListCol = {
  index: {
    head: 'sticky left-0 z-20 min-w-12 w-12 bg-white print:static',
    cell: 'sticky left-0 z-10 min-w-12 w-12 bg-white group-hover:bg-gray-50 print:static',
  },
  createdAt: {
    head: 'sticky left-12 z-20 min-w-[8.5rem] w-[8.5rem] bg-white whitespace-nowrap print:static',
    cell: 'sticky left-12 z-10 min-w-[8.5rem] w-[8.5rem] bg-white whitespace-nowrap group-hover:bg-gray-50 print:static',
  },
  id: {
    head: 'sticky left-[11.5rem] z-20 min-w-[9rem] bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] print:static print:shadow-none',
    cell: 'sticky left-[11.5rem] z-10 min-w-[9rem] bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] group-hover:bg-gray-50 print:static print:shadow-none',
  },
  name: {
    head: 'sticky left-12 z-20 min-w-[14rem] w-[14rem] bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] print:static print:shadow-none',
    cell: 'sticky left-12 z-10 min-w-[14rem] w-[14rem] bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] group-hover:bg-gray-50 print:static print:shadow-none',
  },
  /** Second sticky col after # (e.g. master Code). */
  code: {
    head: 'sticky left-12 z-20 min-w-[6.5rem] w-[6.5rem] bg-white whitespace-nowrap print:static',
    cell: 'sticky left-12 z-10 min-w-[6.5rem] w-[6.5rem] bg-white whitespace-nowrap group-hover:bg-gray-50 print:static',
  },
  /** Third sticky col after # + Code (e.g. master Name) — edge shadow. */
  nameAfterCode: {
    head: 'sticky left-[9.5rem] z-20 min-w-[12rem] w-[12rem] bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] print:static print:shadow-none',
    cell: 'sticky left-[9.5rem] z-10 min-w-[12rem] w-[12rem] bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] group-hover:bg-gray-50 print:static print:shadow-none',
  },
  /** Report tables: first sticky date column (no leading #). */
  date: {
    head: 'sticky left-0 z-20 min-w-[7rem] w-[7rem] bg-gray-50 whitespace-nowrap print:static',
    cell: 'sticky left-0 z-10 min-w-[7rem] w-[7rem] bg-white whitespace-nowrap group-hover:bg-gray-50 print:static',
  },
  /** Report tables: second sticky label after date — edge shadow. */
  labelAfterDate: {
    head: 'sticky left-[7rem] z-20 min-w-[14rem] w-[14rem] bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] print:static print:shadow-none',
    cell: 'sticky left-[7rem] z-10 min-w-[14rem] w-[14rem] bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] group-hover:bg-gray-50 print:static print:shadow-none',
  },
} as const;

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full', className)} {...props} />;
}

export function TableHeaderRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-gray-400 [&_th]:align-top', className)} {...props} />;
}

export function TableBodyRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('group border-b border-gray-400 hover:bg-gray-50 [&_td]:align-top', className)}
      {...props}
    />
  );
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
