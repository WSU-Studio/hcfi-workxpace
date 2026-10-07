'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ButtonLink from '@/components/ui/ButtonLink';
import Button from '@/components/ui/Button';

export default function EditCoaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    description: '',
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/coa/${id}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.coa) {
          setError('COA not found');
          return;
        }
        const coa = payload.coa;
        setFormData({
          accountCode: coa.accountCode,
          accountName: coa.accountName,
          description: coa.description ?? '',
          isActive: Boolean(coa.isActive),
        });
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/workspace-management/coa/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'Failed');
        return;
      }
      router.push('/workspace-management/coa');
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Edit Account</h1>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Account Code *</label>
            <Input
              value={formData.accountCode}
              onChange={(event) => setFormData((prev) => ({ ...prev, accountCode: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Account Name *</label>
            <Input
              value={formData.accountName}
              onChange={(event) => setFormData((prev) => ({ ...prev, accountName: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Description</label>
            <Input
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Status</label>
            <Select
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, isActive: event.target.value === 'active' }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <ButtonLink href="/workspace-management/coa" variant="outline">
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
