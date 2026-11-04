'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ButtonLink from '@/components/ui/ButtonLink';
import SearchableSelect, { type SearchableSelectOption } from '@/components/ui/SearchableSelect';

type UserOption = {
  id: string;
  label: string;
  name: string;
  employeeId: string;
};

export default function NewApprovalDelegationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    delegatorUserId: '',
    delegateUserId: '',
    startDate: '',
    endDate: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/approval-delegation/users')
      .then((res) => res.json())
      .then((data) => {
        const list = (data.users || []) as Array<{
          id: string;
          label: string;
          name: string;
          employeeId: string;
        }>;
        setUsers(list);
      })
      .catch(() => setUsers([]));
  }, []);

  const options: SearchableSelectOption[] = useMemo(
    () => users.map((user) => ({ value: user.id, label: user.label })),
    [users],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.delegatorUserId || !formData.delegateUserId) {
      setError('Delegator and delegate are required');
      return;
    }
    if (formData.delegatorUserId === formData.delegateUserId) {
      setError('Delegator and delegate must be different users');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required');
      return;
    }
    if (formData.endDate < formData.startDate) {
      setError('End date must be on or after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/approval-delegation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create delegation');
        return;
      }
      router.push('/approval-delegation');
    } catch {
      setError('Failed to create approval delegation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Create Approval Delegation</h1>
      {error ? <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div> : null}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <SearchableSelect
            label="Delegator (who is substituted) *"
            options={options}
            value={formData.delegatorUserId}
            onChange={(value) => setFormData((prev) => ({ ...prev, delegatorUserId: value }))}
            placeholder="Select user"
            required
          />
          <SearchableSelect
            label="Delegate (who acts as substitute) *"
            options={options}
            value={formData.delegateUserId}
            onChange={(value) => setFormData((prev) => ({ ...prev, delegateUserId: value }))}
            placeholder="Select user"
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-1.5 font-medium">Start date *</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block mb-1.5 font-medium">End date *</label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional reason for this delegation"
            />
          </div>
          <p className="text-sm text-gray-600">
            During the selected period the delegate fully substitutes the delegator for approval
            (role and Specific PIC). The delegator cannot approve until the period ends or this
            delegation is cancelled.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <ButtonLink href="/approval-delegation" variant="outline">
              <X className="w-4 h-4" />
              Cancel
            </ButtonLink>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Create Delegation'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
