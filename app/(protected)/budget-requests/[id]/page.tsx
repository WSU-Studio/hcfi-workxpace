'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

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
    budgetPlan: { code: string; subject: string };
    department: { name: string };
    lineItems: { item: string; qty: number; unitPrice: number; total: number }[];
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

  const grandTotal = data.lineItems?.reduce((s, l) => s + Number(l.total ?? 0), 0) ?? 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{data.code}</h1>
        <div className="flex gap-2">
          <Link href={`/budget-requests/${id}/review`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Review
          </Link>
          <Link href="/budget-requests" className="px-4 py-2 border rounded-lg hover:bg-gray-50">Back</Link>
        </div>
      </div>
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Subject</label>
            <p className="font-medium">{data.subject}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Status</label>
            <p>
              <span className={`px-2 py-0.5 rounded text-sm ${data.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                {data.status}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Budget Plan</label>
            <p>{data.budgetPlan?.code} - {data.budgetPlan?.subject}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Department</label>
            <p>{data.department?.name ?? '-'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Request Date</label>
            <p>{formatDate(data.requestDate)}</p>
          </div>
        </div>
        {data.description && (
          <div>
            <label className="text-sm text-gray-500">Description</label>
            <p className="whitespace-pre-wrap">{data.description}</p>
          </div>
        )}
        {data.notes && (
          <div>
            <label className="text-sm text-gray-500">Notes</label>
            <p>{data.notes}</p>
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
    </div>
  );
}
