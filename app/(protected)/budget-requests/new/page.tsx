'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

export default function NewBudgetRequestPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<{ id: string; code: string; subject: string; departmentId: string }[]>([]);
  const [approvalSchemas, setApprovalSchemas] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  const [formData, setFormData] = useState({
    budgetPlanId: '',
    subject: '',
    description: '',
    notes: '',
    approvalSchemaId: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/budget-requests')
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.plans || []);
      });
    fetch('/api/workspace-management/approval-schema')
      .then((r) => r.json())
      .then((data) => {
        setApprovalSchemas(data.schemas?.filter((s: { type: string }) => s.type === 'BudgetRequest') || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handlePlanSelect = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setFormData((p) => ({
      ...p,
      budgetPlanId: planId,
      subject: plan ? `${plan.subject} - Request` : p.subject,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.budgetPlanId || !formData.subject) {
      setError('Select budget plan and enter subject');
      return;
    }
    setIsSubmitting(true);
    try {
      const plan = plans.find((p) => p.id === formData.budgetPlanId);
      const res = await fetch('/api/budget-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fiscalYear: new Date().getFullYear(),
          departmentId: plan?.departmentId,
          lineItems: [],
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed');
        return;
      }
      const data = await res.json();
      router.push(`/budget-requests/${data.id}`);
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Create Budget Request</h1>
      {plans.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          No approved budget plans. Create and approve a budget plan first.
        </div>
      )}
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Budget Plan (Approved) *</label>
            <select
              value={formData.budgetPlanId}
              onChange={(e) => handlePlanSelect(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-white"
              required
            >
              <option value="">- Select -</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.code} - {p.subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Approval Scheme</label>
            <select
              value={formData.approvalSchemaId}
              onChange={(e) => setFormData((p) => ({ ...p, approvalSchemaId: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">-</option>
              {approvalSchemas.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/budget-requests" className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <X className="w-4 h-4" />
              Cancel
            </Link>
            <button type="submit" disabled={isSubmitting || plans.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
