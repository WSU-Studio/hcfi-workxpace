'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import ButtonLink from '@/components/ui/ButtonLink';
import Button from '@/components/ui/Button';

export default function NewRolePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ roleCode: '', roleName: '', description: '' });
  const [errors, setErrors] = useState<{ roleCode?: string; roleName?: string; description?: string; general?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workspace-management/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((p) => ({ ...p, general: data.error ?? 'Failed' }));
        return;
      }
      router.push('/workspace-management/role');
    } catch {
      setErrors((p) => ({ ...p, general: 'Failed' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">New Role (Job Position)</h1>
      {errors.general && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{errors.general}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">Code <span className="text-red-500">*</span></label>
            <Input
              name="roleCode"
              value={formData.roleCode}
              onChange={(e) => setFormData((p) => ({ ...p, roleCode: e.target.value }))}
              placeholder="FM"
              required
            />
            {errors.roleCode && <p className="mt-1 text-sm text-red-600">{errors.roleCode}</p>}
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Name <span className="text-red-500">*</span></label>
            <Input
              name="roleName"
              value={formData.roleName}
              onChange={(e) => setFormData((p) => ({ ...p, roleName: e.target.value }))}
              placeholder="Finance Manager"
              required
            />
            {errors.roleName && <p className="mt-1 text-sm text-red-600">{errors.roleName}</p>}
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
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
