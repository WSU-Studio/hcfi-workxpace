'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import ButtonLink from '@/components/ui/ButtonLink';

export default function EditRolePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ roleCode: '', roleName: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/role/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((role) => {
        if (role) setFormData({ roleCode: role.roleCode, roleName: role.roleName, description: role.description ?? '' });
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspace-management/role/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed');
        return;
      }
      router.push('/workspace-management/role');
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Edit Role (Job Position)</h1>
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Code <span className="text-red-500">*</span></label>
            <Input
              name="roleCode"
              value={formData.roleCode}
              onChange={(e) => setFormData((p) => ({ ...p, roleCode: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Name <span className="text-red-500">*</span></label>
            <Input
              name="roleName"
              value={formData.roleName}
              onChange={(e) => setFormData((p) => ({ ...p, roleName: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <ButtonLink href="/workspace-management/role" variant="outline">
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
