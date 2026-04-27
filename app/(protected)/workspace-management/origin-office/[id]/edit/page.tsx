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

export default function EditOriginOfficePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    officeType: '',
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/origin-office/${id}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.originOffice) {
          setError('Origin office not found');
          return;
        }
        const office = payload.originOffice;
        setFormData({
          code: office.code,
          name: office.name,
          address: office.address ?? '',
          officeType: office.officeType ?? '',
          isActive: Boolean(office.isActive),
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
      const response = await fetch(`/api/workspace-management/origin-office/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'Failed');
        return;
      }
      router.push('/workspace-management/origin-office');
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Edit Origin Office</h1>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Code *</label>
            <Input
              value={formData.code}
              onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Name *</label>
            <Input
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Address</label>
            <Input
              value={formData.address}
              onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Office Type</label>
            <Input
              value={formData.officeType}
              onChange={(event) => setFormData((prev) => ({ ...prev, officeType: event.target.value }))}
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
            <ButtonLink href="/workspace-management/origin-office" variant="outline">
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
