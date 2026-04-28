'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getApprovalStepProgress, type BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import { Pencil, ScanSearch } from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type PlanDetail = {
  requestorId?: string | null;
  code: string;
  subject: string;
  description: string | null;
  fiscalYear: number;
  originOffice: string | null;
  status: string;
  requestDate: string;
  coaId?: string | null;
  opexType?: string | null;
  department: { name: string };
  project: { name: string } | null;
  allocations: { month: number; allocation: unknown }[];
  category?: { id: string; name: string } | null;
  categoryKeyIndex?: { id: string; name: string } | null;
  costCenter?: { id: string; name: string } | null;
  opexAllocation?: { id: string; name: string } | null;
  supportingDocs?: unknown;
  approvalSchema?: {
    approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
  } | null;
};
type OriginOfficeOption = {
  code: string;
  name: string;
  isActive: boolean;
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

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
      <p className="min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">{value || '-'}</p>
    </div>
  );
}

export default function BudgetPlanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [originOffices, setOriginOffices] = useState<OriginOfficeOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<{ id: string; accountCode: string; accountName: string }[]>([]);
  const [histories, setHistories] = useState<BudgetPlanHistoryEntry[]>([]);
  const [reviewMeta, setReviewMeta] = useState<{ canReview: boolean; nextStepOrder: number | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          return;
        }
        const data = await r.json();
        setPlan(data?.plan ?? null);
        setOriginOffices(data?.originOffices || []);
        setAccountOptions(data?.accountOptions || []);
        setHistories(data?.histories || []);
        setReviewMeta(data?.reviewMeta ?? null);
      })
      .catch(() => {
        setLoadError('Network error');
        setPlan(null);
        setOriginOffices([]);
        setReviewMeta(null);
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
  const opexType = plan.opexType || '-';
  const canEdit = !!session?.user?.id && plan.requestorId === session.user.id;
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
      <Link href="/budget-plans" className="text-blue-600 hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">{plan.subject}</h1>
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-gray-500">ID:</span> {plan.code}</div>
          <div><span className="text-gray-500">Request Date:</span> {formatDate(plan.requestDate)}</div>
          <div><span className="text-gray-500">Department:</span> {plan.department?.name}</div>
          <div><span className="text-gray-500">Project:</span> {plan.project?.name ?? '-'}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {plan.fiscalYear}</div>
          <div><span className="text-gray-500">Origin Office:</span> {originOfficeLabel}</div>
          <div className="col-span-2">
            <span className="text-gray-500">Status:</span>{' '}
            <span className={`px-2 py-0.5 rounded text-sm ${plan.status === 'Approved' ? 'bg-green-100' : plan.status === 'Pending' ? 'bg-yellow-100' : 'bg-gray-100'}`}>{plan.status}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Description:</span>
            <p className="mt-1 text-gray-700">{plan.description || '-'}</p>
          </div>
          <div className="col-span-2">
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
      >
        <div>
          <Table>
            <thead>
              <TableHeaderRow>
                <TableHead className="text-left">Month</TableHead>
                <TableHead className="text-right">Allocation</TableHead>
              </TableHeaderRow>
            </thead>
            <tbody>
              {(plan.allocations || []).map((a) => (
                <TableBodyRow key={a.month}>
                  <TableCell>{MONTH_NAMES[a.month - 1]}</TableCell>
                  <TableCell>{formatCurrency(Number(a.allocation ?? 0))}</TableCell>
                </TableBodyRow>
              ))}
              <TableBodyRow className="font-medium bg-gray-50">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell>{formatCurrency(total)}</TableCell>
              </TableBodyRow>
            </tbody>
          </Table>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h3 className="font-medium">Classification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
        </div>
      </Card>

      <div>
        {plan.approvalSchema?.approvalLevels?.length ? (
          <Card
            collapsible
            header={<h3 className="font-medium">Approval Escalation</h3>}
          >
            <Table>
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

            {canEdit || reviewMeta?.canReview ? (
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-100">
                {canEdit ? (
                  <Link href={`/budget-plans/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Pencil className="w-5 h-5" />Edit
                  </Link>
                ) : null}
                {reviewMeta?.canReview ? (
                  <Link href={`/budget-plans/${id}/review`} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <ScanSearch className="w-5 h-5" />Review
                  </Link>
                ) : null}
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>

      <Card
        collapsible
        collapsed
        header={<h3 className="font-medium">Activity History</h3>}
      >
        {histories.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm">
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
  );
}
