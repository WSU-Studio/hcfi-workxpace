'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import ButtonLink from '@/components/ui/ButtonLink';
import Button from '@/components/ui/Button';
import { areConfinsIdentityFieldsLocked } from '@/lib/workspace-master-ui-policy';

interface User {
  id: string;
  name: string;
}

export default function EditDepartmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [identityLocked, setIdentityLocked] = useState(areConfinsIdentityFieldsLocked('department'));
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    headId: '',
    divisionId: '',
  });
  const [errors, setErrors] = useState<{
    code?: string;
    name?: string;
    description?: string;
    headId?: string;
    general?: string;
  }>({});
  const [divisions, setDivisions] = useState<Array<{ id: string; code: string; name: string }>>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/workspace-management/department/${id}`).then((r) => r.json()),
      fetch('/api/workspace-management/department/fetch-users').then((r) => r.json()),
    ])
      .then(([deptData, usersData]) => {
        const d = deptData.department;
        if (d) {
          setFormData({
            code: d.code,
            name: d.name,
            description: d.description ?? '',
            headId: d.headId ?? '',
            divisionId: d.divisionId ?? '',
          });
        }
        if (typeof deptData.identityFieldsLocked === 'boolean') {
          setIdentityLocked(deptData.identityFieldsLocked);
        }
        setUsers(usersData?.users ?? []);
        setDivisions(deptData.divisions ?? []);
      })
      .catch(() => setErrors({ general: 'Failed to load' }))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    try {
      const payload = identityLocked
        ? {
            description: formData.description,
            headId: formData.headId,
            divisionId: formData.divisionId,
          }
        : formData;

      const res = await fetch(`/api/workspace-management/department/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((p) => ({
          ...p,
          code: data.error?.includes('code') ? data.error : undefined,
          name: data.error?.includes('name') ? data.error : undefined,
          description: data.error?.includes('description') ? data.error : undefined,
          headId: data.error?.includes('headId') ? data.error : undefined,
          general: data.error,
        }));
        return;
      }
      router.push('/workspace-management/department');
    } catch {
      setErrors((p) => ({ ...p, general: 'Failed' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Edit Department</h1>
      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{errors.general}</div>
      )}
      {identityLocked && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm">
          Code and name come from Confins and cannot be changed here. You can still update division,
          description, and department head.
        </div>
      )}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">
              Code {!identityLocked && <span className="text-red-500">*</span>}
            </label>
            <Input
              name="code"
              value={formData.code}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
              required={!identityLocked}
              disabled={identityLocked}
              readOnly={identityLocked}
            />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
          </div>
          <div>
            <label className="block mb-1.5 font-medium">
              Name {!identityLocked && <span className="text-red-500">*</span>}
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required={!identityLocked}
              disabled={identityLocked}
              readOnly={identityLocked}
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
            <label className="block mb-1.5 font-medium">Division</label>
            <Select
              name="divisionId"
              value={formData.divisionId}
              onChange={(e) => setFormData((p) => ({ ...p, divisionId: e.target.value }))}
            >
              <option value="">-</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.code} — {division.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Department Head</label>
            <Select
              name="headId"
              value={formData.headId}
              onChange={(e) => setFormData((p) => ({ ...p, headId: e.target.value }))}
            >
              <option value="">-</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <ButtonLink href="/workspace-management/department" variant="outline">
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
