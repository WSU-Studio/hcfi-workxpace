'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getApprovalStepProgress, type BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Statuses where the review screen (classification, escalation, history) stays relevant after workflow completes. */
const REVIEW_NAV_STATUSES = new Set(['Draft', 'Reviewed', 'Approved', 'Revision', 'Declined', 'Pending']);

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
  approvalSchema?: {
    approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } | null }[];
  } | null;
};

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
  const [accountOptions, setAccountOptions] = useState<{ id: string; accountCode: string; accountName: string }[]>([]);
  const [histories, setHistories] = useState<BudgetPlanHistoryEntry[]>([]);
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
          setAccountOptions([]);
          setHistories([]);
          return;
        }
        const data = await r.json();
        setPlan(data?.plan ?? null);
        setAccountOptions(data?.accountOptions || []);
        setHistories(data?.histories || []);
      })
      .catch(() => {
        setLoadError('Network error');
        setPlan(null);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const accountLabel = useMemo(() => {
    if (!plan?.coaId) return '-';
    const a = accountOptions.find((x) => x.id === plan.coaId);
    return a ? `${a.accountCode} - ${a.accountName}` : plan.coaId;
  }, [plan?.coaId, accountOptions]);

  if (isLoading) return <LoadingSpin />;
  if (loadError) return <div className="text-red-500">{loadError}</div>;
  if (!plan) return <div className="text-red-500">Not found</div>;

  const total = plan.allocations?.reduce((s, a) => s + Number(a.allocation ?? 0), 0) ?? 0;
  const opexType = plan.opexType || '-';
  const canEdit = !!session?.user?.id && plan.requestorId === session.user.id;

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/budget-plans" className="text-blue-600 hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">{plan.subject}</h1>
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">ID:</span> {plan.code}</div>
          <div><span className="text-gray-500">Request Date:</span> {formatDate(plan.requestDate)}</div>
          <div><span className="text-gray-500">Department:</span> {plan.department?.name}</div>
          <div><span className="text-gray-500">Project:</span> {plan.project?.name ?? '-'}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {plan.fiscalYear}</div>
          <div><span className="text-gray-500">Origin Office:</span> {plan.originOffice || '-'}</div>
          <div className="col-span-2">
            <span className="text-gray-500">Status:</span>{' '}
            <span className={`px-2 py-0.5 rounded text-sm ${plan.status === 'Approved' ? 'bg-green-100' : plan.status === 'Pending' ? 'bg-yellow-100' : 'bg-gray-100'}`}>{plan.status}</span>
          </div>
        </div>
        <div>
          <span className="text-gray-500">Description:</span>
          <p className="mt-1 text-gray-700">{plan.description || '-'}</p>
        </div>
        <div>
          <h3 className="font-medium mb-2">Monthly Allocation</h3>
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-2 px-3">Month</th>
                <th className="text-right py-2 px-3">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {(plan.allocations || []).map((a) => (
                <tr key={a.month} className="border-b">
                  <td className="py-2 px-3">{MONTH_NAMES[a.month - 1]}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(Number(a.allocation ?? 0))}</td>
                </tr>
              ))}
              <tr className="font-medium bg-gray-50">
                <td className="py-2 px-3">Total</td>
                <td className="py-2 px-3 text-right">{formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>
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

        {plan.approvalSchema?.approvalLevels?.length ? (
          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-medium mb-2">Approval Escalation</h3>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {plan.approvalSchema.approvalLevels.map((l, i) => {
                  const stepProgress = getApprovalStepProgress(l.levelType, histories);
                  return (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-3">{l.stepOrder}</td>
                      <td className="py-2 px-3">{l.role?.roleName ?? '-'}</td>
                      <td className="py-2 px-3">{l.levelType}</td>
                      <td className="py-2 px-3">
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
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-700">{stepProgress.timestampLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
          {canEdit ? (
            <Link href={`/budget-plans/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Edit
            </Link>
          ) : null}
          {REVIEW_NAV_STATUSES.has(plan.status) ? (
            <Link href={`/budget-plans/${id}/review`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              {plan.status === 'Draft' || plan.status === 'Reviewed' ? 'Review' : 'View review & history'}
            </Link>
          ) : null}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-medium mb-3">Activity History</h3>
        {histories.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <p>
                  <span className="font-medium">{history.user?.name || 'Unknown User'}</span>{' '}
                  <span className="text-gray-700">{history.action.toLowerCase()}</span>{' '}
                  <span className="text-gray-500">on {formatDate(history.timestamp)}</span>
                </p>
                {history.details?.status ? <p className="text-gray-600">Status: {history.details.status}</p> : null}
                {history.details?.declineReason ? <p className="text-gray-600">Reason: {history.details.declineReason}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
