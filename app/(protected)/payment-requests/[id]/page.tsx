'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Pencil, ScanSearch } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import RichTextContent from '@/components/ui/RichTextContent';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';

type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  details: { status?: string; declineReason?: string | null } | null;
  user: { name: string | null } | null;
};

interface EditWarningModalProps {
  isOpen: boolean;
  requestSubject?: string;
  onCancel: () => void;
  onContinue: () => void;
}

const EditWarningModal = ({ isOpen, requestSubject, onCancel, onContinue }: EditWarningModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Edit payment request?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Status akan dikembalikan dan approval dimulai ulang.
          {requestSubject ? <span className="font-medium text-slate-800"> &quot;{requestSubject}&quot;</span> : ''}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
      <p className="min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
        {value || '-'}
      </p>
    </div>
  );
}

export default function PaymentRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session } = useSession();
  const [isEditWarningOpen, setIsEditWarningOpen] = useState(false);
  const [data, setData] = useState<{
    id: string;
    code: string;
    subject: string;
    description: string | null;
    status: string;
    notes: string | null;
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
    requestorId?: string | null;
    requestorName?: string | null;
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
    histories?: HistoryEntry[];
    canReview?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/payment-requests/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!data) return <div className="text-gray-600">Not found</div>;

  const canEditAsRequestor = !!session?.user?.id && data.requestorId === session.user.id;
  const orderedLevels = [...(data.approvalSchema?.approvalLevels || [])].sort((a, b) => a.stepOrder - b.stepOrder);
  const completedSteps =
    data.status === 'Approved' ? orderedLevels.length : data.status === 'Reviewed' ? 1 : 0;

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
      <Link href="/payment-requests" className="text-blue-600 hover:underline">
        ← Back
      </Link>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Skema approval ini berjalan di Workxpace. Eksekusi pembayaran dan pembukuan dilakukan terpisah di Confins oleh tim
        finance.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{data.subject}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canEditAsRequestor ? (
            data.status === 'Approved' ? (
              <button
                type="button"
                onClick={() => setIsEditWarningOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            ) : (
              <Link
                href={`/payment-requests/${id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            )
          ) : null}
        </div>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <span className="text-gray-500">ID:</span> {data.code}
          </div>
          <div>
            <span className="text-gray-500">Request Date:</span> {formatDate(data.requestDate)}
          </div>
          <div>
            <span className="text-gray-500">Requestor:</span> {data.requestorName ?? '-'}
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
            <span className="text-gray-500">Grand total:</span>{' '}
            <span className="font-medium">
              {formatCurrency(data.amount)} {data.currency}
            </span>
          </div>
        </div>

        {data.lineItems && data.lineItems.length > 0 ? (
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h3 className="font-medium">Items</h3>
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
                    <TableCell className="text-right">
                      {formatCurrency(Number(li.subtotal ?? li.qty * Number(li.unitPrice ?? 0)))}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(li.deduction ?? 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(li.total ?? 0))}</TableCell>
                  </TableBodyRow>
                ))}
                <TableBodyRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={5} className="text-right">
                    Transaction amount
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      Number(data.totalAmount ?? data.lineItems.reduce((s, l) => s + Number(l.total ?? 0), 0))
                    )}
                  </TableCell>
                </TableBodyRow>
                <TableBodyRow>
                  <TableCell colSpan={5} className="text-right">
                    VAT / PPN
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(data.vatAmount ?? 0))}</TableCell>
                </TableBodyRow>
                <TableBodyRow>
                  <TableCell colSpan={5} className="text-right">
                    Invoice amount
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(data.invoiceAmount ?? 0))}</TableCell>
                </TableBodyRow>
                <TableBodyRow>
                  <TableCell colSpan={5} className="text-right">
                    WHT / PPh
                  </TableCell>
                  <TableCell className="text-right">({formatCurrency(Number(data.whtAmount ?? 0))})</TableCell>
                </TableBodyRow>
                <TableBodyRow className="bg-green-200/60 font-semibold">
                  <TableCell colSpan={5} className="text-right">
                    Grand total
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(data.amount)}</TableCell>
                </TableBodyRow>
              </tbody>
            </Table>
          </div>
        ) : null}

        <ReadonlyField label="Penerima pembayaran" value={data.payeeName} />
        {data.paymentPurpose ? <ReadonlyField label="Tujuan pembayaran" value={data.paymentPurpose} /> : null}
        {data.description ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Deskripsi</p>
            <RichTextContent value={data.description} className="mt-1" />
          </div>
        ) : null}
        {data.notes ? <ReadonlyField label="Catatan" value={data.notes} /> : null}

        {data.budgetRequest ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Budget request terkait</p>
            <p className="mt-1 text-sm text-slate-700">
              {data.budgetRequest.code} — {data.budgetRequest.subject}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              BR total (grand): {formatCurrency(data.budgetRequest.grandTotal)} · Status BR: {data.budgetRequest.status}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Tidak ada budget request yang dipilih.</p>
        )}
      </Card>

      <Card collapsible header={<h3 className="font-medium">Approval escalation</h3>}>
        <div className="space-y-4">
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
            <p className="text-sm text-gray-500">Tidak ada skema approval — persetujuan oleh selain pemohon.</p>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            {data.canReview ? (
              <Link
                href={`/payment-requests/${id}/review`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <ScanSearch className="h-4 w-4" />
                Review
              </Link>
            ) : null}
          </div>
        </div>
      </Card>

      {data.histories && data.histories.length > 0 ? (
        <Card collapsible header={<h3 className="font-medium">Activity history</h3>}>
          <ul className="space-y-3 text-sm">
            {data.histories.map((h) => (
              <li key={h.id} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-gray-900">{h.action}</span>
                  <span className="text-gray-500">{formatDateTime(h.timestamp)}</span>
                </div>
                <p className="text-gray-600">{h.user?.name ?? 'System'}</p>
                {h.details?.declineReason ? (
                  <p className="mt-1 text-red-700">Reason: {String(h.details.declineReason)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <EditWarningModal
        isOpen={isEditWarningOpen}
        requestSubject={data.subject}
        onCancel={() => setIsEditWarningOpen(false)}
        onContinue={() => {
          setIsEditWarningOpen(false);
          router.push(`/payment-requests/${id}/edit`);
        }}
      />
    </div>
  );
}
