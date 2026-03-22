'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

export default function ReviewBudgetRequestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<{
    id: string;
    code: string;
    subject: string;
    description: string | null;
    status: string;
    budgetPlan: { code: string; subject: string };
    department: { name: string };
    lineItems: { item: string; qty: number; unitPrice: number; total: number }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/budget-requests/${id}`)
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

  const grandTotal = data.lineItems?.reduce((s, l) => s + Number(l.total ?? 0), 0) ?? 0;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Review Budget Request - {data.code}</h1>
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Subject</label>
            <p className="font-medium">{data.subject}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Budget Plan</label>
            <p>{data.budgetPlan?.code} - {data.budgetPlan?.subject}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Department</label>
            <p>{data.department?.name ?? '-'}</p>
          </div>
        </div>
        {data.description && (
          <div>
            <label className="text-sm text-gray-500">Description</label>
            <p className="whitespace-pre-wrap">{data.description}</p>
          </div>
        )}
      </Card>
      {data.lineItems && data.lineItems.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Line Items</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Unit Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((li, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{li.item}</td>
                  <td className="text-right py-2">{li.qty}</td>
                  <td className="text-right py-2">{Number(li.unitPrice).toLocaleString()}</td>
                  <td className="text-right py-2">{Number(li.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-medium">
                <td colSpan={3} className="py-2 text-right">Grand Total</td>
                <td className="text-right py-2">{grandTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
      {data.status !== 'Approved' && (
        <div className="flex justify-end gap-3">
          <Link href={`/budget-requests/${id}`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</Link>
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Approving...' : 'Approve'}
          </button>
        </div>
      )}
    </div>
  );
}
