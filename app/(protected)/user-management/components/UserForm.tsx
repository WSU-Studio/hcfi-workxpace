'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import ButtonLink from '@/components/ui/ButtonLink';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { UserFormData } from '@/types/user-management';

interface UserFormProps {
  userId?: string;
}

interface OptionItem {
  id: string;
  label: string;
}

const initialForm: UserFormData = {
  name: '',
  email: '',
  employeeId: '',
  password: '',
  roleId: '',
  departmentId: '',
  isActive: true,
};

export default function UserForm({ userId }: UserFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<OptionItem[]>([]);
  const [departments, setDepartments] = useState<OptionItem[]>([]);
  const [formData, setFormData] = useState<UserFormData>(initialForm);

  const pageTitle = useMemo(() => (userId ? 'Edit User' : 'New User'), [userId]);

  useEffect(() => {
    const fetchOptions = async () => {
      const response = await fetch('/api/user-management');
      const data = await response.json();
      setRoles((data.roles ?? []).map((item: { id: string; roleCode: string; roleName: string }) => ({ id: item.id, label: `${item.roleCode} - ${item.roleName}` })));
      setDepartments((data.departments ?? []).map((item: { id: string; code: string; name: string }) => ({ id: item.id, label: `${item.code} - ${item.name}` })));
      return data;
    };

    const fetchData = async () => {
      try {
        const data = await fetchOptions();
        if (!userId) return;

        const res = await fetch(`/api/user-management/${userId}`);
        if (!res.ok) {
          setError('Failed to load user');
          return;
        }

        const user = await res.json();
        setFormData({
          name: user.name ?? '',
          email: user.email ?? '',
          employeeId: user.employeeId ?? '',
          password: '',
          roleId: user.roleId ?? data.roles?.[0]?.id ?? '',
          departmentId: user.departmentId ?? data.departments?.[0]?.id ?? '',
          isActive: user.isActive !== false,
        });
      } catch {
        setError('Failed to load form');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const onChange = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...formData };
      if (userId && !formData.password.trim()) delete payload.password;

      const response = await fetch(userId ? `/api/user-management/${userId}` : '/api/user-management', {
        method: userId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Failed to save user');
        return;
      }
      router.push('/user-management');
      router.refresh();
    } catch {
      setError('Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{pageTitle}</h1>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
              <Input value={formData.name} onChange={(e) => onChange('name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
              <Input type="email" value={formData.email} onChange={(e) => onChange('email', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employee ID <span className="text-red-500">*</span></label>
              <Input value={formData.employeeId} onChange={(e) => onChange('employeeId', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Password {!userId && <span className="text-red-500">*</span>}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => onChange('password', e.target.value)}
                required={!userId}
                minLength={!userId ? 6 : undefined}
                placeholder={userId ? 'Leave empty to keep current password' : 'Min 6 characters'}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role <span className="text-red-500">*</span></label>
              <Select value={formData.roleId} onChange={(e) => onChange('roleId', e.target.value)} required>
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Department <span className="text-red-500">*</span></label>
              <Select value={formData.departmentId} onChange={(e) => onChange('departmentId', e.target.value)} required>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => onChange('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            User active
          </label>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <ButtonLink href="/user-management" variant="outline">Cancel</ButtonLink>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : userId ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
