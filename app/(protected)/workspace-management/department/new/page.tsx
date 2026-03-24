'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import ButtonLink from '@/components/ui/ButtonLink';
import Button from '@/components/ui/Button';

interface User {
  id: string;
  name: string;
}

export default function NewDepartmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    headId: '',
  });
  const [errors, setErrors] = useState<{ code?: string; name?: string; description?: string; headId?: string; general?: string }>({});

  useEffect(() => {
    fetch('/api/workspace-management/department/fetch-users')
      .then((res) => res.ok && res.json())
      .then((data) => setUsers(data?.users ?? []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workspace-management/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((p) => ({ ...p, code: data.error?.includes('code') ? data.error : undefined, name: data.error?.includes('name') ? data.error : undefined, description: data.error?.includes('description') ? data.error : undefined, headId: data.error?.includes('headId') ? data.error : undefined, general: data.error }));
        return;
      }
      router.push('/workspace-management/department');
    } catch {
      setErrors((p) => ({ ...p, general: 'Failed' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">New Department</h1>
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
              placeholder="IT"
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
              placeholder="IT Department"
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
            <label className="block mb-1.5 font-medium">Department Head</label>
            <Select
              name="headId"
              value={formData.headId}
              onChange={(e) => setFormData((p) => ({ ...p, headId: e.target.value }))}
            >
              <option value="">-</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
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
