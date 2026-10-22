'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ButtonLink from '@/components/ui/ButtonLink';

export default function NewOpexAllocationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', isActive: true });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workspace-management/opex-allocation', {
        method: 'POST',
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
      setError('Failed to create opex allocation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">New Opex Allocation</h1>
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
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
