import Card from '@/components/ui/Card';
import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
  TableScroll,
} from '@/components/ui/Table';
import { formatIdr } from '@/lib/dashboard/format';
import { formatDate } from '@/lib/utils';
import type { DashboardTransaction } from '@/types/dashboard';

type DashboardTransactionTableProps = {
  title: string;
  subtitle?: string;
  rows: DashboardTransaction[];
};

export default function DashboardTransactionTable({
  title,
  subtitle,
  rows,
}: DashboardTransactionTableProps) {
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      <TableScroll>
        <Table>
          <thead>
            <TableHeaderRow className="text-[13px]">
              <TableHead>Date</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>BR / GR</TableHead>
              <TableHead>GL</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <TableEmptyRow colSpan={7}>No transactions in this period.</TableEmptyRow>
            ) : (
              rows.map((row) => (
                <TableBodyRow key={row.id} className="text-xs">
                  <TableCell className="whitespace-nowrap">{row.date ? formatDate(row.date) : '—'}</TableCell>
                  <TableCell>{row.departmentName ?? '—'}</TableCell>
                  <TableCell>{row.vendorName ?? '—'}</TableCell>
                  <TableCell className="max-w-xs truncate">{row.description ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.budgetRequestCode}</TableCell>
                  <TableCell className="max-w-[10rem] truncate">{row.glAccount ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIdr(row.amount)}</TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </TableScroll>
    </Card>
  );
}
