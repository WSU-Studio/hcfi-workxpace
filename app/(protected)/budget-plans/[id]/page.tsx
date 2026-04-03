'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Statuses where the review screen (classification, escalation, history) stays relevant after workflow completes. */
const REVIEW_NAV_STATUSES = new Set(['Draft', 'Reviewed', 'Approved', 'Revision', 'Declined', 'Pending']);

export default function BudgetPlanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [plan, setPlan] = useState<{
    code: string;
    subject: string;
    description: string | null;
    fiscalYear: number;
    originOffice: string | null;
    status: string;
    department: { name: string };
    project: { name: string } | null;
    allocations: { month: number; allocation: unknown }[];
  } | null>(null);
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
          return;
        }
        const data = await r.json();
        setPlan(data?.plan ?? null);
      })
      .catch(() => {
        setLoadError('Network error');
        setPlan(null);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (loadError) return <div className="text-red-500">{loadError}</div>;
  if (!plan) return <div className="text-red-500">Not found</div>;

  const total = plan.allocations?.reduce((s, a) => s + Number(a.allocation ?? 0), 0) ?? 0;

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/budget-plans" className="text-blue-600 hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">{plan.subject}</h1>
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-gray-500">ID:</span> {plan.code}</div>
          <div><span className="text-gray-500">Department:</span> {plan.department?.name}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {plan.fiscalYear}</div>
          <div><span className="text-gray-500">Origin Office:</span> {plan.originOffice || '-'}</div>
          <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded text-sm ${plan.status === 'Approved' ? 'bg-green-100' : plan.status === 'Pending' ? 'bg-yellow-100' : 'bg-gray-100'}`}>{plan.status}</span></div>
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
        <div className="flex flex-wrap gap-3 pt-4">
          {plan.status === 'Draft' && (
            <Link href={`/budget-plans/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Edit
            </Link>
          )}
          {REVIEW_NAV_STATUSES.has(plan.status) ? (
            <Link href={`/budget-plans/${id}/review`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              {plan.status === 'Draft' || plan.status === 'Reviewed' ? 'Review' : 'View review & history'}
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
