'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import RichTextContent from '@/components/ui/RichTextContent';
import Input from '@/components/ui/Input';

export default function ReviewPaymentRequestPage() {
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
    fiscalYear?: number;
    originOffice?: string | null;
    amount: number;
    totalAmount?: number;
    vatAmount?: number;
    whtAmount?: number;
    invoiceAmount?: number;
    currency: string;
    lineItems?: {
      item: string;
      qty: number;
      unitPrice: number;
      subtotal?: number;
      deduction?: number;
      total: number;
    }[];
    payeeName: string;
    paymentPurpose: string | null;
    canReview?: boolean;
    project?: { code: string; name: string } | null;
    budgetRequest: {
      code: string;
      subject: string;
      status: string;
      grandTotal: number;
    } | null;
    department: { name: string };
    approvalSchema?: {
      approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
    } | null;
    histories?: { id: string; action: string; timestamp: string; user: { name: string | null } | null }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    fetch(`/api/payment-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payment-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) router.push(`/payment-requests/${id}`);
      else alert('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (mode: 'revision' | 'decline') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payment-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          declineReason: declineReason.trim() || undefined,
        }),
      });
      if (res.ok) {
        setIsDeclineModalOpen(false);
        router.push(`/payment-requests/${id}`);
      } else alert('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const orderedLevels = [...(data.approvalSchema?.approvalLevels || [])].sort((a, b) => a.stepOrder - b.stepOrder);
  const completedSteps =
    data.status === 'Approved' ? orderedLevels.length : data.status === 'Reviewed' ? 1 : 0;
  const approveHistories = (data.histories || []).filter((h) => h.action === 'approve');
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
      <Link href={`/payment-requests/${id}`} className="text-blue-600 hover:underline">
        ← Back
      </Link>
      <h1 className="text-2xl font-semibold">Review Payment Request</h1>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Approval here only records status in Workxpace. Finance team executes payment and journal in Confins according to their procedures.
        prosedur mereka.
      </div>

      <Card className="space-y-4">
        <h3 className="font-medium">Request information</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <span className="text-gray-500">ID:</span> {data.code}
          </div>
          <div>
            <span className="text-gray-500">Request Date:</span> {formatDate(data.requestDate)}
          </div>
          <div>
            <span className="text-gray-500">Department:</span> {data.department?.name ?? '-'}
          </div>
          <div>
            <span className="text-gray-500">Fiscal Year:</span> {data.fiscalYear ?? '-'}
          </div>
          <div>
            <span className="text-gray-500">Origin Office:</span> {data.originOffice ?? '-'}
          </div>
          <div>
            <span className="text-gray-500">Project:</span>{' '}
            {data.project ? `${data.project.code} — ${data.project.name}` : '-'}
          </div>
          <div>
            <span className="text-gray-500">Status:</span>{' '}
            <span
              className={`rounded px-2 py-0.5 text-sm ${
                data.status === 'Approved'
                  ? 'bg-green-100 text-green-800'
                  : data.status === 'Reviewed'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {data.status}
            </span>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Subject:</span>
            <p className="font-medium">{data.subject}</p>
          </div>
          <div>
            <span className="text-gray-500">Grand total:</span>{' '}
            <span className="font-semibold">
              {formatCurrency(data.amount)} {data.currency}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Payee:</span> {data.payeeName}
          </div>
          {data.paymentPurpose ? (
            <div className="md:col-span-2">
              <span className="text-gray-500">Payment purpose:</span>
              <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.paymentPurpose}</p>
            </div>
          ) : null}

          {data.budgetRequest ? (
            <div className="space-y-1 text-sm text-gray-700 p-2 rounded-lg border border-slate-200 bg-slate-50 md:col-span-2">
              <span className="text-gray-500">Related budget request:</span>
              <p className="font-medium">
                {data.budgetRequest.code} — {data.budgetRequest.subject}
              </p>
              <p className="text-sm text-gray-600">
                Grand total BR: {formatCurrency(data.budgetRequest.grandTotal)} · Status: {data.budgetRequest.status}
              </p>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <span className="text-gray-500">Description:</span>
            {data.description ? <RichTextContent value={data.description} className="mt-1" /> : <p className="mt-1">-</p>}
          </div>
          
          <div className="md:col-span-2">
            <span className="text-gray-500">Notes:</span>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.notes || '-'}</p>
          </div>
        </div>
      </Card>

      {data.lineItems && data.lineItems.length > 0 ? (
        <Card className="space-y-3">
          <h3 className="font-medium">Items</h3>
          <Table>
            <thead>
              <TableHeaderRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableHeaderRow>
            </thead>
            <tbody>
              {data.lineItems.map((li, index) => (
                <TableBodyRow key={`${li.item}-${index}`}>
                  <TableCell>{li.item}</TableCell>
                  <TableCell className="text-right">{li.qty}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(li.unitPrice ?? 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(li.total ?? 0))}</TableCell>
                </TableBodyRow>
              ))}
              <TableBodyRow className="bg-gray-50 font-medium">
                <TableCell colSpan={3} className="text-right">
                  Transaction
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    Number(data.totalAmount ?? data.lineItems.reduce((s, l) => s + Number(l.total ?? 0), 0))
                  )}
                </TableCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableCell colSpan={3} className="text-right">
                  VAT
                </TableCell>
                <TableCell className="text-right">{formatCurrency(Number(data.vatAmount ?? 0))}</TableCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableCell colSpan={3} className="text-right">
                  Invoice
                </TableCell>
                <TableCell className="text-right">{formatCurrency(Number(data.invoiceAmount ?? 0))}</TableCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableCell colSpan={3} className="text-right">
                  WHT
                </TableCell>
                <TableCell className="text-right">({formatCurrency(Number(data.whtAmount ?? 0))})</TableCell>
              </TableBodyRow>
              <TableBodyRow className="font-semibold">
                <TableCell colSpan={3} className="text-right">
                  Grand total
                </TableCell>
                <TableCell className="text-right">{formatCurrency(data.amount)}</TableCell>
              </TableBodyRow>
            </tbody>
          </Table>
        </Card>
      ) : null}

      <Card collapsible header={<h3 className="font-medium">Approval escalation</h3>}>
        {orderedLevels.length ? (
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
              {orderedLevels.map((level, index) => {
                const isCompleted = index < completedSteps;
                const stepStatusLabel = !isCompleted
                  ? 'Pending'
                  : level.levelType === 'Reviewer'
                    ? 'Reviewed'
                    : 'Approved';
                return (
                  <TableBodyRow key={level.stepOrder}>
                    <TableCell>{level.stepOrder}</TableCell>
                    <TableCell>{level.role?.roleName ?? '-'}</TableCell>
                    <TableCell>{level.levelType}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                          stepStatusLabel === 'Pending'
                            ? 'bg-gray-100 text-gray-700'
                            : stepStatusLabel === 'Reviewed'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {stepStatusLabel}
                      </span>
                    </TableCell>
                  </TableBodyRow>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-gray-500">No approval schema — implicit one-level approval.</p>
        )}
      </Card>

      {approveHistories.length > 0 ? (
        <Card collapsible header={<h3 className="font-medium">Approval history</h3>}>
          <ul className="space-y-2 text-sm">
            {approveHistories.map((h) => (
              <li key={h.id} className="flex justify-between gap-2 border-b border-gray-100 pb-2 last:border-0">
                <span>{h.user?.name ?? '-'}</span>
                <span className="text-gray-500">{formatDateTime(h.timestamp)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
        {data.canReview ? (
          <>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Processing…' : 'Approve / Next step'}
            </button>
            <button
              type="button"
              onClick={() => setIsDeclineModalOpen(true)}
              disabled={isSubmitting}
              className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              Revision / Decline
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-600">You are not eligible to review at this step.</p>
        )}
        <Link
          href={`/payment-requests/${id}`}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </Link>
      </Card>

      {isDeclineModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Revision or Decline</h2>
            <p className="mt-2 text-sm text-slate-600">Provide a reason (optional but recommended).</p>
            <Input
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason"
              className="mt-4"
            />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeclineModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecline('revision')}
                disabled={isSubmitting}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-60"
              >
                Request revision
              </button>
              <button
                type="button"
                onClick={() => handleDecline('decline')}
                disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
