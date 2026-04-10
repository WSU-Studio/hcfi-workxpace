'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ScanSearch } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  details: { status?: string; declineReason?: string } | null;
  user: { name: string | null } | null;
};

export default function BudgetRequestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<{
    id: string;
    code: string;
    subject: string;
    description: string | null;
    status: string;
    notes: string | null;
    requestDate: string;
    requestorId?: string | null;
    fiscalYear: number;
    totalAmount?: number;
    vatAmount?: number;
    whtAmount?: number;
    invoiceAmount?: number;
    grandTotal?: number;
    budgetPlan: { code: string; subject: string };
    department: { name: string };
    lineItems: { item: string; qty: number; unitPrice: number; subtotal?: number; deduction?: number; total: number }[];
    allocations: { year: number; month: number; allocation: number }[];
    approvalSchema?: {
      approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
    } | null;
    histories?: HistoryEntry[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/budget-requests/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const transactionAmount = data.lineItems?.reduce((s, l) => s + Number(l.total ?? 0), 0) ?? 0;
  const vatAmount = Number(data.vatAmount ?? 0);
  const whtAmount = Number(data.whtAmount ?? 0);
  const invoiceAmount = Number(data.invoiceAmount ?? transactionAmount + vatAmount);
  const grandTotal = Number(data.grandTotal ?? invoiceAmount - whtAmount);
  const allocationsTotal = data.allocations?.reduce((sum, allocation) => sum + Number(allocation.allocation ?? 0), 0) ?? 0;
  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/budget-requests" className="text-blue-600 hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">{data.subject}</h1>

      <Card className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><span className="text-gray-500">ID:</span> {data.code}</div>
          <div><span className="text-gray-500">Request Date:</span> {formatDate(data.requestDate)}</div>
          <div><span className="text-gray-500">Budget Plan:</span> {data.budgetPlan?.code} - {data.budgetPlan?.subject}</div>
          <div><span className="text-gray-500">Department:</span> {data.department?.name ?? '-'}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {data.fiscalYear}</div>
          <div>
            <span className="text-gray-500">Status:</span>{' '}
            <span
              className={`rounded px-2 py-0.5 text-sm ${
                data.status === 'Approved'
                  ? 'bg-green-100 text-green-800'
                  : data.status === 'Pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {data.status}
            </span>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Description:</span>
            <p className="mt-1 text-gray-700 whitespace-pre-wrap">{data.description || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Notes:</span>
            <p className="mt-1 text-gray-700 whitespace-pre-wrap">{data.notes || '-'}</p>
          </div>
        </div>
      </Card>

      <Card collapsible collapsed header={<h3 className="font-medium">Request Allocation</h3>}>
        <div className="space-y-4">
          <Card collapsible collapsed 
          className="bg-orange-50/80"
          header={<h3 className="font-medium">Dev Only: Allocate Budget Per Month (only visible in dev mode)</h3>}>
            <Table>
              <thead>
                <TableHeaderRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Allocation</TableHead>
                </TableHeaderRow>
              </thead>
              <tbody>
                {(data.allocations || []).map((allocation) => (
                  <TableBodyRow key={`${allocation.year}-${allocation.month}`}>
                    <TableCell>{MONTH_NAMES[allocation.month - 1]} {allocation.year}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(allocation.allocation ?? 0))}</TableCell>
                  </TableBodyRow>
                ))}
                <TableBodyRow className="bg-gray-50 font-medium">
                  <TableCell>Total Allocation</TableCell>
                  <TableCell className="text-right">{formatCurrency(allocationsTotal)}</TableCell>
                </TableBodyRow>
              </tbody>
            </Table>
          </Card>

          {data.lineItems?.length ? (
            <Table>
              <thead>
                <TableHeaderRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Deduction</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableHeaderRow>
              </thead>
              <tbody>
                {data.lineItems.map((li, index) => (
                  <TableBodyRow key={`${li.item}-${index}`}>
                    <TableCell>{li.item}</TableCell>
                    <TableCell className="text-right">{li.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(li.unitPrice ?? 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(li.subtotal ?? li.qty * Number(li.unitPrice ?? 0)))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(li.deduction ?? 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(li.total ?? 0))}</TableCell>
                  </TableBodyRow>
                ))}
                <TableBodyRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={5} className="text-right">Transaction Amount</TableCell>
                  <TableCell className="text-right">{formatCurrency(transactionAmount)}</TableCell>
                </TableBodyRow>
                <TableBodyRow>
                  <TableCell colSpan={5} className="text-right">VAT / PPN</TableCell>
                  <TableCell className="text-right">{formatCurrency(vatAmount)}</TableCell>
                </TableBodyRow>
                <TableBodyRow>
                  <TableCell colSpan={5} className="text-right">Invoice Amount</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoiceAmount)}</TableCell>
                </TableBodyRow>
                <TableBodyRow>
                  <TableCell colSpan={5} className="text-right">WHT / PPh</TableCell>
                  <TableCell className="text-right">({formatCurrency(whtAmount)})</TableCell>
                </TableBodyRow>
                <TableBodyRow className="bg-green-200/60 hover:bg-green-200/80 text-base font-semibold">
                  <TableCell colSpan={5} className="text-right">Grandtotal</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
                </TableBodyRow>
              </tbody>
            </Table>
          ) : null}
        </div>
      </Card>

      <Card collapsible header={<h3 className="font-medium">Action & Approval Escalation</h3>}>
        <div className="space-y-4">
          {data.approvalSchema?.approvalLevels?.length ? (
            <Table>
              <thead>
                <TableHeaderRow>
                  <TableHead>#</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableHeaderRow>
              </thead>
              <tbody>
                {data.approvalSchema.approvalLevels.map((level) => (
                  <TableBodyRow key={level.stepOrder}>
                    <TableCell>{level.stepOrder}</TableCell>
                    <TableCell>{level.role?.roleName ?? '-'}</TableCell>
                    <TableCell>{level.levelType}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {data.status === 'Approved' ? 'Completed' : 'Pending'}
                      </span>
                    </TableCell>
                  </TableBodyRow>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500">No approval escalation schema configured.</p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            {data.status !== 'Approved' ? (
              <Link href={`/budget-requests/${id}/review`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                <ScanSearch className="h-4 w-4" />
                Review
              </Link>
            ) : null}
          </div>
        </div>
      </Card>

      <Card collapsible collapsed header={<h3 className="font-medium">Activity History</h3>}>
        {data.histories?.length ? (
          <div className="space-y-2">
            {data.histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <p>
                  <span className="font-medium">{history.user?.name || 'Unknown User'}</span>{' '}
                  <span className="text-gray-700">{history.action.toLowerCase()}</span>{' '}
                  <span className="text-gray-500">on {formatDateTime(history.timestamp)}</span>
                </p>
                {history.details?.status ? <p className="text-gray-600">Status: {history.details.status}</p> : null}
                {history.details?.declineReason ? <p className="text-gray-600">Reason: {history.details.declineReason}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No history yet.</p>
        )}
      </Card>
    </div>
  );
}
