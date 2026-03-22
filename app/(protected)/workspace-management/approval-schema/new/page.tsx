'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Role {
  id: string;
  roleCode: string;
  roleName: string;
}

interface Level {
  levelType: string;
  roleId: string;
}

export default function NewApprovalSchemaPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'BudgetPlan',
    period: 'Unlimited',
    departmentId: '',
  });
  const [levels, setLevels] = useState<Level[]>([{ levelType: 'Reviewer', roleId: '' }]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/workspace-management/approval-schema')
      .then((r) => r.json())
      .then((data) => {
        setDepartments(data.departments || []);
        setRoles(data.roles || []);
      });
  }, []);

  const addLevel = () => setLevels((p) => [...p, { levelType: 'Reviewer', roleId: '' }]);
  const removeLevel = (i: number) => setLevels((p) => p.filter((_, idx) => idx !== i));
  const updateLevel = (i: number, field: keyof Level, value: string) => {
    setLevels((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.departmentId) {
      setError('Select department');
      return;
    }
    if (levels.some((l) => !l.roleId)) {
      setError('Select job position for each level');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workspace-management/approval-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, levels }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed');
        return;
      }
      router.push('/workspace-management/approval-schema');
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New Approval Scheme</h1>
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
              placeholder="Primary Scheme for Budget Plan"
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Type <span className="text-red-500">*</span></label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
            >
              <option value="BudgetPlan">Budget Plan</option>
              <option value="BudgetRequest">Budget Request</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Period</label>
            <select
              value={formData.period}
              onChange={(e) => setFormData((p) => ({ ...p, period: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
            >
              <option value="Unlimited">Unlimited</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Department <span className="text-red-500">*</span></label>
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData((p) => ({ ...p, departmentId: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
              required
            >
              <option value="">-</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">Scheme</label>
              <button type="button" onClick={addLevel} className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Add Level
              </button>
            </div>
            <div className="space-y-3">
              {levels.map((l, i) => (
                <div key={i} className="flex gap-3 items-center p-3 border rounded-lg">
                  <span className="text-sm text-gray-500 w-16">Level {i + 1}</span>
                  <select
                    value={l.levelType}
                    onChange={(e) => updateLevel(i, 'levelType', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Reviewer">Reviewer</option>
                    <option value="Approver">Approver</option>
                  </select>
                  <select
                    value={l.roleId}
                    onChange={(e) => updateLevel(i, 'roleId', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg bg-white"
                    required
                  >
                    <option value="">Job Position</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.roleName}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeLevel(i)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/workspace-management/approval-schema" className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
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
