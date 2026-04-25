'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ButtonLink from '@/components/ui/ButtonLink';
import Button from '@/components/ui/Button';

export default function NewOriginOfficePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    officeType: '',
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/workspace-management/origin-office', {
        method: 'POST',
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

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">New Origin Office</h1>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Code *</label>
            <Input
              value={formData.code}
              onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="11"
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Name *</label>
            <Input
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="DKI JAKARTA"
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Address</label>
            <Input
              value={formData.address}
              onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
              placeholder="Office address"
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Office Type</label>
            <Input
              value={formData.officeType}
              onChange={(event) => setFormData((prev) => ({ ...prev, officeType: event.target.value }))}
              placeholder="BRANCH / HO / CG"
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
