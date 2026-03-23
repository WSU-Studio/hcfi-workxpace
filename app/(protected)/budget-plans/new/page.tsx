'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function NewBudgetPlanPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fiscalYears, setFiscalYears] = useState<{ year: number }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [approvalSchemas, setApprovalSchemas] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  const [formData, setFormData] = useState({
    fiscalYear: new Date().getFullYear(),
    originOffice: 'HQ',
    departmentId: '',
    projectId: '',
    subject: '',
    description: '',
    approvalSchemaId: '',
  });
  const [allocations, setAllocations] = useState<Record<number, number>>(
    Object.fromEntries([...Array(12)].map((_, i) => [i + 1, 0]))
  );
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/budget-plans/options')
      .then((r) => r.json())
      .then((data) => {
        setFiscalYears(data.fiscalYears || []);
        setDepartments(data.departments || []);
        setProjects(data.projects || []);
        setApprovalSchemas(data.approvalSchemas || []);
        if (data.fiscalYears?.[0]) setFormData((p) => ({ ...p, fiscalYear: data.fiscalYears[0].year }));
        if (data.departments?.[0]) setFormData((p) => ({ ...p, departmentId: data.departments[0].id }));
        if (data.projects?.[0]) setFormData((p) => ({ ...p, projectId: data.projects[0].id }));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const copyToAll = (val: number) => {
    setAllocations(Object.fromEntries([...Array(12)].map((_, i) => [i + 1, val])));
  };

  const splitEvenly = (total: number) => {
    const each = Math.round((total / 12) * 100) / 100;
    setAllocations(Object.fromEntries([...Array(12)].map((_, i) => [i + 1, each])));
  };

  const totalAlloc = Object.values(allocations).reduce((a, b) => a + b, 0);
  const schemasForDept = approvalSchemas.filter((s) => s.departmentId === formData.departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.departmentId || !formData.subject) {
      setError('Fill required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/budget-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          allocations: Object.entries(allocations).map(([month, allocation]) => ({ month: Number(month), allocation })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed');
        return;
      }
      router.push('/budget-plans');
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Budget Plan</h1>
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block mb-1.5 font-medium">Fiscal Year *</label>
              <Select
                value={formData.fiscalYear}
                onChange={(e) => setFormData((p) => ({ ...p, fiscalYear: Number(e.target.value) }))}
                required
              >
                {fiscalYears.map((fy) => (
                  <option key={fy.year} value={fy.year}>{fy.year}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 font-medium">Origin Office</label>
              <Input
                type="text"
                value={formData.originOffice}
                onChange={(e) => setFormData((p) => ({ ...p, originOffice: e.target.value }))}
                placeholder="HQ"
                required
              />
            </div>
            <div>
              <label className="block mb-1.5 font-medium">Department *</label>
              <Select
                value={formData.departmentId}
                onChange={(e) => setFormData((p) => ({ ...p, departmentId: e.target.value }))}
                required
              >
                <option value="">-</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 font-medium">Project</label>
              <Select
                value={formData.projectId}
                onChange={(e) => setFormData((p) => ({ ...p, projectId: e.target.value }))}
              >
                <option value="">-</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Subject *</label>
            <Input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Monthly Printer Rental"
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={4}
            />
          </div>

          <div>
            <label className="block mb-1.5 font-medium">Approver Scheme</label>
            <Select
              value={formData.approvalSchemaId}
              onChange={(e) => setFormData((p) => ({ ...p, approvalSchemaId: e.target.value }))}
            >
              <option value="">-</option>
              {schemasForDept.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <h3 className="font-medium mb-3">Monthly Allocation</h3>
            <div className="flex gap-2 mb-3">
              <Input
                type="number"
                className="w-30"
                placeholder="9"
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) copyToAll(v);
                }}
              />
              <button type="button" onClick={() => copyToAll(parseFloat(String(Object.values(allocations)[0])) || 0)} className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Copy to all
              </button>
              <button type="button" onClick={() => splitEvenly(totalAlloc || 0)} className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Split evenly
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {MONTH_NAMES.map((name, i) => (
                <div key={name}>
                  <label className="block text-xs text-gray-500 mb-1">{name}</label>
                  <input
                    type="number"
                    value={allocations[i + 1] || 0}
                    onChange={(e) => setAllocations((p) => ({ ...p, [i + 1]: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">Total: {totalAlloc.toLocaleString('id-ID')}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/budget-plans" className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <X className="w-4 h-4" />
              Cancel
            </Link>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
