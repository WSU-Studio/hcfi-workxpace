'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ButtonLink from '@/components/ui/ButtonLink';
import { defaultActivityAccess, defaultMenuAccess } from '@/lib/default-access';
import { UserAccessPayload } from '@/types/user-management';
import AccessControlSection, { activityAccessItems, menuAccessItems } from '../../components/AccessControlSection';

const initialAccess: UserAccessPayload = {
  menuAccess: defaultMenuAccess,
  activityAccess: defaultActivityAccess,
};

export default function UserAccessControlPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;
  const [username, setUsername] = useState('');
  const [access, setAccess] = useState<UserAccessPayload>(initialAccess);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user-management/${userId}/access`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load access control');
        return response.json();
      })
      .then((data) => {
        setUsername(data.user?.name ?? '');
        setAccess({
          menuAccess: { ...defaultMenuAccess, ...(data.menuAccess ?? {}) },
          activityAccess: { ...defaultActivityAccess, ...(data.activityAccess ?? {}) },
        });
      })
      .catch(() => setError('Failed to load access control'))
      .finally(() => setIsLoading(false));
  }, [userId]);

  const updateMenuAccess = (key: string, value: boolean) => {
    setAccess((prev) => ({
      ...prev,
      menuAccess: { ...prev.menuAccess, [key]: value },
    }));
  };

  const updateActivityAccess = (key: string, value: boolean) => {
    setAccess((prev) => ({
      ...prev,
      activityAccess: { ...prev.activityAccess, [key]: value },
    }));
  };

  const save = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/user-management/${userId}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(access),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Failed to save access control');
        return;
      }
      router.push('/user-management');
      router.refresh();
    } catch {
      setError('Failed to save access control');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            className="mb-1 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            onClick={() => router.push('/user-management')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </button>
          <h1 className="text-2xl font-semibold">Access Control</h1>
          <p className="text-sm text-gray-500">{username}</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">{error}</div>}

      <Card className="space-y-6 p-6">
        <AccessControlSection
          title="Menu Access"
          items={menuAccessItems}
          access={access.menuAccess}
          onChange={updateMenuAccess}
        />

        <AccessControlSection
          title="Activity Access"
          items={activityAccessItems}
          access={access.activityAccess}
          onChange={updateActivityAccess}
          columns={3}
        />

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <ButtonLink href="/user-management" variant="outline">Cancel</ButtonLink>
          <Button type="button" onClick={save} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Access'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
