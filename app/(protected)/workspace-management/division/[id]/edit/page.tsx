'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import ButtonLink from '@/components/ui/ButtonLink';
import Button from '@/components/ui/Button';
import DepartmentMembershipChecklist from '../../components/DepartmentMembershipChecklist';

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  divisionId?: string | null;
}

export default function EditDivisionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    departmentIds: [] as string[],
  });
  const [errors, setErrors] = useState<{ code?: string; general?: string }>({});

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/division/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const d = data.division;
        if (d) {
          setFormData({
            code: d.code,
            name: d.name,
            description: d.description ?? '',
            departmentIds: (d.departments ?? []).map((dept: { id: string }) => dept.id),
          });
        }
        setDepartments(data.departments ?? []);
      })
      .catch(() => setErrors({ general: 'Failed to load' }))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspace-management/division/${id}`, {
        method: 'PUT',
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

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Edit Division</h1>
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
              currentDivisionId={id}
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
