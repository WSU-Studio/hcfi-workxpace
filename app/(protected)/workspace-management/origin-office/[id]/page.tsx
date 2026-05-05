'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import type { OriginOffice } from '@/types/origin-office';

export default function OriginOfficeDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;
  const [originOffice, setOriginOffice] = useState<OriginOffice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canEditOriginOffice = Boolean(session?.user?.access?.activityAccess?.editOriginOffice);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/origin-office/${id}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setOriginOffice(payload.originOffice))
      .catch(() => setOriginOffice(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!originOffice) {
    return (
      <div className="space-y-4">
        <p className="text-red-500">Origin office not found</p>
        <Link href="/workspace-management/origin-office" className="text-blue-600 hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/workspace-management/origin-office"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <h1 className="text-2xl font-semibold">Origin Office Detail</h1>
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Code</label>
          <p className="font-medium">{originOffice.code}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{originOffice.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Office Type</label>
          <p className="font-medium">{originOffice.officeType || '-'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Address</label>
          <p className="font-medium">{originOffice.address || '-'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Status</label>
          <p className="font-medium">{originOffice.isActive ? 'Active' : 'Inactive'}</p>
        </div>
        {canEditOriginOffice && (
          <div className="pt-4">
            <Link
              href={`/workspace-management/origin-office/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
