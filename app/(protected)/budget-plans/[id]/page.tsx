'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getApprovalStepProgress, type BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import RichTextContent from '@/components/ui/RichTextContent';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import { Download, Lock, Pencil, Printer, ScanSearch } from 'lucide-react';
import BulkImportBadge from '@/components/budget-plan/BulkImportBadge';
import RequestCountBadge from '@/components/budget-plan/RequestCountBadge';
import Tooltip from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type PlanDetail = {
  requestorId?: string | null;
  requestorName?: string | null;
  code: string;
  subject: string;
  description: string | null;
  fiscalYear: number;
  originOffice: string | null;
  status: string;
  importedViaBulk?: boolean;
  requestDate: string;
  coaId?: string | null;
  opexType?: string | null;
  department: { name: string };
  project: { name: string } | null;
  allocations: { month: number; allocation: unknown; realization?: number; outstanding?: number }[];
  category?: { id: string; name: string } | null;
  categoryKeyIndex?: { id: string; name: string } | null;
  costCenter?: { id: string; name: string } | null;
  opexAllocation?: { id: string; name: string } | null;
  supportingDocs?: unknown;
  approvalSchema?: {
    approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
  } | null;
  budgetRequestCount?: number;
};
type OriginOfficeOption = {
  code: string;
  name: string;
  isActive: boolean;
};

interface EditWarningModalProps {
  isOpen: boolean;
  planSubject?: string;
  onCancel: () => void;
  onContinue: () => void;
}

const EditWarningModal = ({ isOpen, planSubject, onCancel, onContinue }: EditWarningModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Do you want to edit budget plan?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The status of the budget plan
          {planSubject ? <span className="font-medium text-slate-800"> &quot;{planSubject}&quot;</span> : ''} will be reverted to
          the initial status and needs to go through the approval process again.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

function normalizeSupportingDocs(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
        return item.url;
      }
      return null;
    })
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

// function ReadonlyField({ label, value }: { label: string; value: string }) {
//   return (
//     <div>
//       <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
//       <p className="min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">{value || '-'}</p>
//     </div>
//   );
// }

export default function BudgetPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session } = useSession();
  const [isEditWarningOpen, setIsEditWarningOpen] = useState(false);
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [originOffices, setOriginOffices] = useState<OriginOfficeOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<{ id: string; accountCode: string; accountName: string }[]>([]);
  const [histories, setHistories] = useState<BudgetPlanHistoryEntry[]>([]);
  const [reviewMeta, setReviewMeta] = useState<{ canReview: boolean; nextStepOrder: number | null } | null>(null);
  const [editMeta, setEditMeta] = useState<{
    canEdit: boolean;
    editLockReason: string | null;
    budgetRequestCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const printableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoadError(null);
    fetch(`/api/budget-plans/${id}`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setLoadError(typeof body?.error === 'string' ? body.error : `Could not load plan (${r.status})`);
          setPlan(null);
          setOriginOffices([]);
          setAccountOptions([]);
          setHistories([]);
          setReviewMeta(null);
          setEditMeta(null);
          return;
        }
        const data = await r.json();
        setPlan(data?.plan ?? null);
        setOriginOffices(data?.originOffices || []);
        setAccountOptions(data?.accountOptions || []);
        setHistories(data?.histories || []);
        setReviewMeta(data?.reviewMeta ?? null);
        setEditMeta(data?.editMeta ?? null);
      })
      .catch(() => {
        setLoadError('Network error');
        setPlan(null);
        setOriginOffices([]);
        setReviewMeta(null);
        setEditMeta(null);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const accountLabel = useMemo(() => {
    if (!plan?.coaId) return '-';
    const a = accountOptions.find((x) => x.id === plan.coaId);
    return a ? `${a.accountCode} - ${a.accountName}` : plan.coaId;
  }, [plan?.coaId, accountOptions]);
  const supportingDocUrls = useMemo(
    () => normalizeSupportingDocs(plan?.supportingDocs),
    [plan?.supportingDocs]
  );
  const originOfficeLabel = useMemo(() => {
    if (!plan?.originOffice) return '-';
    const office = originOffices.find((item) => item.code === plan.originOffice);
    return office ? `${office.code} - ${office.name}` : plan.originOffice;
  }, [plan?.originOffice, originOffices]);

  if (isLoading) return <LoadingSpin />;
  if (loadError) return <div className="text-red-500">{loadError}</div>;
  if (!plan) return <div className="text-red-500">Not found</div>;

  const total = plan.allocations?.reduce((s, a) => s + Number(a.allocation ?? 0), 0) ?? 0;
  const canViewRealization = Boolean(
    session?.user?.access?.menuAccess?.viewBudgetPlanRealization,
  );
  const totalRealization =
    plan.allocations?.reduce((s, a) => s + Number(a.realization ?? 0), 0) ?? 0;
  const totalOutstanding = total - totalRealization;
  const opexType = plan.opexType || '-';
  const isRequestor = !!session?.user?.id && plan.requestorId === session.user.id;
  // Server is the source of truth (factors in: requestor + no BR issued).
  // Fallback to legacy client-side rule if API hasn't responded yet.
  const canEdit = editMeta ? editMeta.canEdit : isRequestor;
  const editLocked = isRequestor && editMeta?.canEdit === false;
  const editLockReason = editMeta?.editLockReason ?? null;
  const budgetRequestCount = editMeta?.budgetRequestCount ?? plan.budgetRequestCount ?? 0;
  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

  const handleDownloadPdf = async () => {
    if (!printableRef.current || isExporting) return;
    setIsExporting(true);
    document.documentElement.setAttribute('data-exporting', 'pdf');
    const toastId = toast.loading('Menyiapkan PDF...');

    // Safety net: kalau apapun macet, attribute & state pasti ter-reset
    // setelah 70 detik supaya layar tidak ter-freeze (sidebar/header sembunyi
    // karena CSS rule [data-exporting='pdf']).
    const safetyTimer = window.setTimeout(() => {
      document.documentElement.removeAttribute('data-exporting');
      setIsExporting(false);
      toast.error('Generate PDF timeout. Coba lagi.', { id: toastId });
    }, 70_000);

    try {
      const { renderPdfFromElement } = await import('@/lib/pdf/inline-computed-colors');
      const filename = `${plan.code}_${slugify(plan.subject) || 'budget-plan'}.pdf`;
      await renderPdfFromElement(printableRef.current, { filename, timeoutMs: 60_000 });
      toast.success('PDF berhasil di-download.', { id: toastId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat PDF';
      toast.error(msg, { id: toastId });
    } finally {
      window.clearTimeout(safetyTimer);
      document.documentElement.removeAttribute('data-exporting');
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/budget-plans" className="text-blue-600 hover:underline">← Back</Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="inline-flex items-center gap-2"
            aria-label="Print budget plan detail"
            disabled={isExporting}
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </Button>
          <Button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Download budget plan detail as PDF"
            aria-busy={isExporting}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" aria-hidden />
            {isExporting ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      <div ref={printableRef} className="space-y-6">
      <div className="min-w-0">
        <p className="hidden text-xs uppercase tracking-wide text-gray-500 print:block">Budget Plan</p>
        <h1 className="text-2xl font-semibold">{plan.subject}</h1>
        <p className="hidden text-sm text-gray-600 print:block">
          {plan.code} · FY {plan.fiscalYear} · {plan.department?.name}
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:gap-y-2">
          <div><span className="text-gray-500">ID:</span> {plan.code}</div>
          <div><span className="text-gray-500">Request Date:</span> {formatDate(plan.requestDate)}</div>
          <div><span className="text-gray-500">Requestor:</span> {plan.requestorName ?? '-'}</div>
          <div><span className="text-gray-500">Department:</span> {plan.department?.name}</div>
          <div><span className="text-gray-500">Project:</span> {plan.project?.name ?? '-'}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {plan.fiscalYear}</div>
          <div><span className="text-gray-500">Origin Office:</span> {originOfficeLabel}</div>
          <div className="col-span-2">
            <span className="text-gray-500">Status:</span>{' '}
            <span className={`px-2 py-0.5 rounded text-sm ${plan.status === 'Approved' ? 'bg-green-100' : plan.status === 'Pending' ? 'bg-yellow-100' : 'bg-gray-100'}`}>{plan.status}</span>
            {plan.importedViaBulk ? (
              <span className="ml-2 inline-flex align-middle">
                <BulkImportBadge />
              </span>
            ) : null}
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Description:</span>
            <RichTextContent value={plan.description} className="mt-1" />
          </div>
          <div className="col-span-2 print:hidden">
            <span className="text-gray-500">Supporting Documents:</span>
            {supportingDocUrls.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {supportingDocUrls.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Document {index + 1}
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-gray-700">-</p>
            )}
          </div>
        </div>
      </Card>

      <Card
        collapsible
        collapsed
        header={<h3 className="font-medium">Monthly Allocation</h3>}
        className="print:break-inside-avoid print:text-sm"
      >
        <div>
          <Table>
            <thead>
              <TableHeaderRow>
                <TableHead className="text-left">Month</TableHead>
                <TableHead className="text-right">Allocation</TableHead>
                {canViewRealization ? (
                  <>
                    <TableHead className="text-right">Realization</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </>
                ) : null}
              </TableHeaderRow>
            </thead>
            <tbody>
              {(plan.allocations || []).map((a) => (
                <TableBodyRow key={a.month}>
                  <TableCell>{MONTH_NAMES[a.month - 1]}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(a.allocation ?? 0))}</TableCell>
                  {canViewRealization ? (
                    <>
                      <TableCell className="text-right">{formatCurrency(Number(a.realization ?? 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(a.outstanding ?? 0))}</TableCell>
                    </>
                  ) : null}
                </TableBodyRow>
              ))}
              <TableBodyRow className="font-medium bg-gray-50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                {canViewRealization ? (
                  <>
                    <TableCell className="text-right">{formatCurrency(totalRealization)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalOutstanding)}</TableCell>
                  </>
                ) : null}
              </TableBodyRow>
            </tbody>
          </Table>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h3 className="font-medium">Classification</h3>

          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-500">Cost Center:</span> {plan.costCenter?.name ?? ''}</div>
            <div><span className="text-gray-500">Category:</span> {plan.category?.name ?? ''}</div>
            <div><span className="text-gray-500">Category Key Index:</span> {plan.categoryKeyIndex?.name ?? ''}</div>
            <div><span className="text-gray-500">Kode Akun:</span> {accountLabel}</div>
            <div><span className="text-gray-500">Type:</span> {opexType}</div>
            <div><span className="text-gray-500">Opex Allocation:</span> {plan.opexAllocation?.name ?? ''}</div>
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReadonlyField label="Cost Center" value={plan.costCenter?.name ?? ''} />
            <ReadonlyField label="Category" value={plan.category?.name ?? ''} />
            <ReadonlyField label="Category Key Index" value={plan.categoryKeyIndex?.name ?? ''} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <ReadonlyField label="Kode Akun" value={accountLabel} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReadonlyField label="Type" value={opexType} />
            {plan.opexType === 'OPEX' ? (
              <ReadonlyField label="Opex Allocation" value={plan.opexAllocation?.name ?? ''} />
            ) : null}
          </div> */}
        </div>
      </Card>

      <div className="print:break-before-page print:text-sm">
        {plan.approvalSchema?.approvalLevels?.length ? (
          <Card
            collapsible
            header={<h3 className="font-medium">Approval Escalation</h3>}
          >
            <Table className="print:hidden">
              <thead>
                <TableHeaderRow>
                  <TableHead>#</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated At</TableHead>
                </TableHeaderRow>
              </thead>
              <tbody>
                {plan.approvalSchema.approvalLevels.map((l, i) => {
                  const stepProgress = getApprovalStepProgress(l.levelType, histories);
                  return (
                    <TableBodyRow key={i}>
                      <TableCell>{l.stepOrder}</TableCell>
                      <TableCell>{l.role?.roleName ?? '-'}</TableCell>
                      <TableCell>{l.levelType}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            stepProgress.statusLabel === 'Pending'
                              ? 'bg-gray-100 text-gray-700'
                              : stepProgress.statusLabel === 'Approved' || stepProgress.statusLabel === 'Reviewed'
                                ? 'bg-green-100 text-green-800'
                                : stepProgress.statusLabel === 'Revision'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {stepProgress.statusLabel}
                        </span>
                      </TableCell>
                      <TableCell>{stepProgress.timestampLabel}</TableCell>
                    </TableBodyRow>
                  );
                })}
              </tbody>
            </Table>

            <div className="hidden print:block">
              {(() => {
                const approvalLevels = plan.approvalSchema!.approvalLevels;
                return (
                  <div className="overflow-x-auto -mx-2 px-2 print:overflow-visible print:mx-0 print:px-0">
                    <div
                      className="grid min-w-full overflow-hidden rounded-lg border border-gray-300 bg-white"
                      style={{
                        gridTemplateColumns: `repeat(${approvalLevels.length}, minmax(140px, 1fr))`,
                      }}
                    >
                      {approvalLevels.map((l, i) => {
                        const stepProgress = getApprovalStepProgress(l.levelType, histories);
                        const isApproved =
                          stepProgress.statusLabel === 'Approved' || stepProgress.statusLabel === 'Reviewed';
                        const isPending = stepProgress.statusLabel === 'Pending';
                        const isRevision = stepProgress.statusLabel === 'Revision';
                        const stampLabel = isApproved
                          ? stepProgress.statusLabel === 'Reviewed'
                            ? 'Accept'
                            : 'Accept'
                          : isPending
                            ? ''
                            : isRevision
                              ? ''
                              : '';
                        const stampToneClass = isApproved
                          ? 'border-2 border-blue-400 text-blue-500'
                          : isPending
                            ? ''
                            : isRevision
                              ? ''
                              : '';
                        const isLastCol = i === approvalLevels.length - 1;
                        const colBorder = isLastCol ? '' : 'border-r border-gray-300';
                        return (
                          <div
                            key={i}
                            className={`flex flex-col text-sm print:break-inside-avoid ${colBorder}`}
                          >
                            <div className="flex min-h-[3.5rem] items-center border-b border-gray-300 px-2 py-2 font-medium text-gray-800">
                              {l.role?.roleName ?? '-'}
                            </div>
                            <div className="flex min-h-[3.5rem] items-center border-b border-gray-300 px-2 py-2 text-gray-700">
                              {stepProgress.actorName ?? <span className="text-gray-300">—</span>}
                            </div>
                            <div className="flex min-h-[4rem] items-center border-b border-gray-300 px-2 py-2">
                              <span
                                className={`inline-flex items-center rounded-full h-12 w-12 justify-center text-xs font-semibold tracking-narrow opacity-90 ${stampToneClass}`}
                              >
                                {stampLabel}
                              </span>
                            </div>
                            <div className="flex min-h-[2.5rem] items-center px-2 py-2 text-xs text-gray-500">
                              {stepProgress.timestampLabel}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {canEdit || editLocked || reviewMeta?.canReview ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  {budgetRequestCount > 0 ? (
                    <RequestCountBadge count={budgetRequestCount} />
                  ) : null}
                  {editLocked ? (
                    <Tooltip content={editLockReason ?? 'Locked: budget requests have been issued'}>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                        <Lock className="h-3.5 w-3.5" />
                        Locked from edit
                      </span>
                    </Tooltip>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {canEdit ? (
                    plan.status === 'Approved' ? (
                      <button
                        type="button"
                        onClick={() => setIsEditWarningOpen(true)}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 cursor-pointer"
                      >
                        <Pencil className="w-5 h-5" />
                        Edit
                      </button>
                    ) : (
                      <Link href={`/budget-plans/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Pencil className="w-5 h-5" />Edit
                      </Link>
                    )
                  ) : null}
                  {reviewMeta?.canReview ? (
                    <Link href={`/budget-plans/${id}/review`} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                      <ScanSearch className="w-5 h-5" />Review
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>

      <Card
        collapsible
        collapsed
        className="print:hidden"
        header={<h3 className="font-medium">Activity History</h3>}
      >
        {histories.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm print:px-0 print:pt-0 print:pb-2 print:bg-transparent print:border-b print:border-gray-200">
                <p>
                  <span className="font-medium">{history.user?.name || 'Unknown User'}</span>{' '}
                  <span className="text-gray-700">{history.action.toLowerCase()}</span>{' '}
                  <span className="text-gray-500">on {formatDateTime(history.timestamp)}</span>
                </p>
                {history.details?.status ? <p className="text-gray-600">Status: {history.details.status}</p> : null}
                {history.details?.declineReason ? <p className="text-gray-600">Reason: {history.details.declineReason}</p> : null}
                {(history.details?.allocationAdjustmentNote || history.details?.currentState?.allocationAdjustmentNote) ? (
                  <p className="text-amber-700">
                    {history.details?.allocationAdjustmentNote || history.details?.currentState?.allocationAdjustmentNote}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>
      <EditWarningModal
        isOpen={isEditWarningOpen}
        planSubject={plan.subject}
        onCancel={() => setIsEditWarningOpen(false)}
        onContinue={() => {
          setIsEditWarningOpen(false);
          router.push(`/budget-plans/${id}/edit`);
        }}
      />
    </div>
  );
}
