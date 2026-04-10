'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';

type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  details: { status?: string; declineReason?: string } | null;
  user: { name: string | null } | null;
};

export default function ReviewBudgetRequestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<{
    id: string;
    code: string;
    subject: string;
    description: string | null;
    notes: string | null;
    status: string;
    requestDate: string;
    fiscalYear: number;
    canReview?: boolean;
    category?: string | null;
    coa?: string | null;
    type?: string | null;
    opexAllocation?: string | null;
    budgetPlan: {
      code: string;
      subject: string;
      category?: { name: string } | null;
      costCenter?: { name: string } | null;
      categoryKeyIndex?: { name: string } | null;
      opexAllocation?: { name: string } | null;
    };
    department: { name: string };
    lineItems: { item: string; qty: number; unitPrice: number; subtotal?: number; deduction?: number; total: number }[];
    histories?: HistoryEntry[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/budget-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-requests/${id}/approve`, { method: 'POST' });
      if (res.ok) router.push(`/budget-requests/${id}`);
      else alert('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const transactionAmount = data.lineItems?.reduce((sum, li) => sum + Number(li.total ?? 0), 0) ?? 0;
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
      <Link href={`/budget-requests/${id}`} className="text-blue-600 hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">Review Budget Request</h1>

      <Card className="space-y-4">
        <h3 className="font-medium">Header Information</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><span className="text-gray-500">ID:</span> {data.code}</div>
          <div><span className="text-gray-500">Request Date:</span> {formatDate(data.requestDate)}</div>
          <div><span className="text-gray-500">Budget Plan:</span> {data.budgetPlan?.code} - {data.budgetPlan?.subject}</div>
          <div><span className="text-gray-500">Department:</span> {data.department?.name ?? '-'}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {data.fiscalYear}</div>
          <div>
            <span className="text-gray-500">Status:</span>{' '}
            <span className={`rounded px-2 py-0.5 text-sm ${data.status === 'Approved' ? 'bg-green-100 text-green-800' : data.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
              {data.status}
            </span>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Subject:</span>
            <p className="font-medium">{data.subject}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Description:</span>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.description || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Notes:</span>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.notes || '-'}</p>
          </div>
        </div>
      </Card>

      <Card collapsible header={<h3 className="font-medium">Items</h3>}>
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
            {data.lineItems.map((li, i) => (
              <TableBodyRow key={`${li.item}-${i}`}>
                <TableCell>{li.item}</TableCell>
                <TableCell className="text-right">{li.qty}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.unitPrice ?? 0))}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.subtotal ?? Number(li.unitPrice ?? 0) * li.qty))}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.deduction ?? 0))}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(li.total ?? 0))}</TableCell>
              </TableBodyRow>
            ))}
            <TableBodyRow className="bg-gray-50 font-medium">
              <TableCell colSpan={5} className="text-right">Transaction Amount</TableCell>
              <TableCell className="text-right">{formatCurrency(transactionAmount)}</TableCell>
            </TableBodyRow>
          </tbody>
        </Table>
      </Card>

      <Card collapsible header={<h3 className="font-medium">Classification</h3>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Cost Center</p>
            <p className="min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">{data.budgetPlan?.costCenter?.name ?? '-'}</p>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Category</p>
            <p className="min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">{data.budgetPlan?.category?.name ?? '-'}</p>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Category Key Index</p>
            <p className="min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">{data.budgetPlan?.categoryKeyIndex?.name ?? '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-gray-700">Kode Akun</p>
            <p className="min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">{data.coa || '-'}</p>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Type</p>
            <p className="min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">{data.opexAllocation || data.type || '-'}</p>
          </div>
        </div>
      </Card>

      {data.canReview ? (
        <div className="flex justify-end gap-3">
          <Link href={`/budget-requests/${id}`} className="rounded-lg border px-4 py-2 hover:bg-gray-50">Cancel</Link>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSubmitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : data.status === 'Pending' ? 'Final approve' : 'Approve'}
          </button>
        </div>
      ) : data.status !== 'Approved' ? (
        <p className="text-sm text-gray-500">You are not assigned to review this request at the current step.</p>
      ) : null}

      <Card collapsible header={<h3 className="font-medium">Budget Request History</h3>}>
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
