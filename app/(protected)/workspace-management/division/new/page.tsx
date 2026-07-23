'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import ButtonLink from '@/components/ui/ButtonLink';
import Button from '@/components/ui/Button';
import DepartmentMembershipChecklist from '../components/DepartmentMembershipChecklist';

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  divisionId?: string | null;
}

export default function NewDivisionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    departmentIds: [] as string[],
  });
  const [errors, setErrors] = useState<{ code?: string; name?: string; general?: string }>({});

  useEffect(() => {
    fetch('/api/workspace-management/department')
      .then((res) => (res.ok ? res.json() : { departments: [] }))
      .then((data) => setDepartments(data.departments ?? []))
      .catch(() => setDepartments([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workspace-management/division', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({
          code: data.error?.toLowerCase?.().includes('code') ? data.error : undefined,
          general: data.error ?? 'Failed',
        });
        return;
      }
      router.push('/workspace-management/division');
    } catch {
      setErrors({ general: 'Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">New Division</h1>
      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{errors.general}</div>
      )}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Code <span className="text-red-500">*</span></label>
            <Input
              name="code"
              value={formData.code}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
              placeholder="TECH"
              required
            />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Name <span className="text-red-500">*</span></label>
            <Input
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Technology Division"
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Departments</label>
            <p className="mb-2 text-xs text-gray-500">
              Select departments that belong to this division. One department maps to one division.
            </p>
            <DepartmentMembershipChecklist
              departments={departments}
              selectedIds={formData.departmentIds}
              onChange={(departmentIds) => setFormData((p) => ({ ...p, departmentIds }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <ButtonLink href="/workspace-management/division" variant="outline">
              <X className="w-4 h-4" />
              Cancel
            </ButtonLink>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
