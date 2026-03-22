'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EditBudgetPlanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fiscalYears, setFiscalYears] = useState<{ year: number }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [approvalSchemas, setApprovalSchemas] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  const [formData, setFormData] = useState({
    fiscalYear: 0,
    originOffice: '',
    departmentId: '',
    projectId: '',
    subject: '',
    description: '',
    approvalSchemaId: '',
  });
  const [allocations, setAllocations] = useState<Record<number, number>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/budget-plans/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.plan;
        if (p) {
          setFormData({
            fiscalYear: p.fiscalYear,
            originOffice: p.originOffice || '',
            departmentId: p.departmentId,
            projectId: p.projectId || '',
            subject: p.subject,
            description: p.description || '',
            approvalSchemaId: p.approvalSchemaId || '',
          });
          const allocs: Record<number, number> = {};
          (p.allocations || []).forEach((a: { month: number; allocation: unknown }) => {
            allocs[a.month] = Number(a.allocation ?? 0);
          });
          setAllocations(allocs);
        }
        setFiscalYears(data.fiscalYears || []);
        setDepartments(data.departments || []);
        setProjects(data.projects || []);
        setApprovalSchemas(data.approvalSchemas || []);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const copyToAll = (val: number) => setAllocations(Object.fromEntries([...Array(12)].map((_, i) => [i + 1, val])));
  const totalAlloc = Object.values(allocations).reduce((a, b) => a + b, 0);
  const splitEvenly = () => setAllocations(Object.fromEntries([...Array(12)].map((_, i) => [i + 1, Math.round((totalAlloc / 12) * 100) / 100])));
  const schemasForDept = approvalSchemas.filter((s) => s.departmentId === formData.departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          allocations: Object.entries(allocations).map(([month, allocation]) => ({ month: Number(month), allocation })),
        }),
      });
      if (!res.ok) {
        setError('Failed');
        return;
      }
      router.push(`/budget-plans/${id}`);
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit Budget Plan</h1>
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 font-medium">Fiscal Year *</label>
              <select
                value={formData.fiscalYear}
                onChange={(e) => setFormData((p) => ({ ...p, fiscalYear: Number(e.target.value) }))}
                className="w-full px-4 py-2 border rounded-lg bg-white"
                required
              >
                {fiscalYears.map((fy) => (
                  <option key={fy.year} value={fy.year}>{fy.year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 font-medium">Department *</label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData((p) => ({ ...p, departmentId: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg bg-white"
                required
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
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
              rows={4}
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Approver Scheme</label>
            <select
              value={formData.approvalSchemaId}
              onChange={(e) => setFormData((p) => ({ ...p, approvalSchemaId: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">-</option>
              {schemasForDept.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <h3 className="font-medium mb-3">Monthly Allocation</h3>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => copyToAll(parseFloat(String(Object.values(allocations)[0])) || 0)} className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Copy to all
              </button>
              <button type="button" onClick={splitEvenly} className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Split evenly
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {MONTH_NAMES.map((_, i) => (
                <div key={i}>
                  <label className="block text-xs text-gray-500 mb-1">{MONTH_NAMES[i]}</label>
                  <input
                    type="number"
                    value={allocations[i + 1] ?? 0}
                    onChange={(e) => setAllocations((p) => ({ ...p, [i + 1]: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href={`/budget-plans/${id}`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</Link>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
