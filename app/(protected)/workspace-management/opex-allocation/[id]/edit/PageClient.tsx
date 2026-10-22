'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ButtonLink from '@/components/ui/ButtonLink';

export default function EditOpexAllocationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', isActive: true });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/opex-allocation/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.opexAllocation) {
          setFormData({
            name: data.opexAllocation.name,
            isActive: data.opexAllocation.isActive !== false,
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspace-management/opex-allocation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
      router.push('/workspace-management/opex-allocation');
    } catch {
      setError('Failed to update opex allocation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Edit Opex Allocation</h1>
      {error ? <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div> : null}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            Active
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <ButtonLink href="/workspace-management/opex-allocation" variant="outline">
              <X className="w-4 h-4" />
              Cancel
            </ButtonLink>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
