'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReviewBudgetPlanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [plan, setPlan] = useState<{
    code: string;
    subject: string;
    description: string | null;
    fiscalYear: number;
    originOffice: string | null;
    status: string;
    requestDate: string;
    department: { name: string };
    project: { name: string } | null;
    allocations: { month: number; allocation: unknown }[];
    approvalSchema?: { approvalLevels: { stepOrder: number; levelType: string; role: { roleName: string } }[] };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/budget-plans/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPlan(data?.plan))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!confirm('Approve this budget plan?')) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' }),
      });
      if (res.ok) router.push(`/budget-plans/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;
  if (!plan) return <div className="text-red-500">Not found</div>;

  const total = plan.allocations?.reduce((s, a) => s + Number(a.allocation ?? 0), 0) ?? 0;

  return (
    <div className="max-w-4xl space-y-6">
      <Link href={`/budget-plans/${id}`} className="text-blue-600 hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">Review Budget Plan</h1>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">ID:</span> {plan.code}</div>
          <div><span className="text-gray-500">Request Date:</span> {formatDate(plan.requestDate)}</div>
          <div><span className="text-gray-500">Fiscal Year:</span> {plan.fiscalYear}</div>
          <div><span className="text-gray-500">Department:</span> {plan.department?.name}</div>
          <div><span className="text-gray-500">Origin Office:</span> {plan.originOffice || '-'}</div>
        </div>
        <div>
          <span className="text-gray-500">Subject:</span>
          <p className="font-medium">{plan.subject}</p>
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
                <th className="text-left py-2 px-3">#</th>
                <th className="text-left py-2 px-3">Month</th>
                <th className="text-right py-2 px-3">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {(plan.allocations || []).map((a, i) => (
                <tr key={a.month} className="border-b">
                  <td className="py-2 px-3">{i + 1}</td>
                  <td className="py-2 px-3">{MONTH_NAMES[a.month - 1]}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(Number(a.allocation ?? 0))}</td>
                </tr>
              ))}
              <tr className="font-medium bg-gray-50">
                <td colSpan={2} className="py-2 px-3">Total</td>
                <td className="py-2 px-3 text-right">{formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {plan.approvalSchema?.approvalLevels?.length ? (
          <div>
            <h3 className="font-medium mb-2">Approval Escalation</h3>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-left py-2 px-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {plan.approvalSchema.approvalLevels.map((l, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3">{l.stepOrder}</td>
                    <td className="py-2 px-3">{l.role?.roleName}</td>
                    <td className="py-2 px-3">{l.levelType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {plan.status === 'Draft' && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href={`/budget-plans/${id}`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</Link>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Approve'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
