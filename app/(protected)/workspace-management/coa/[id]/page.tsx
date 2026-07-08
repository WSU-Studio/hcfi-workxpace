'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import type { Coa } from '@/types/coa';

export default function CoaDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;
  const [coa, setCoa] = useState<Coa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canEditCoa = Boolean(session?.user?.access?.activityAccess?.editCoa);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/coa/${id}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setCoa(payload.coa))
      .catch(() => setCoa(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!coa) {
    return (
      <div className="space-y-4">
        <p className="text-red-500">COA not found</p>
        <Link href="/workspace-management/coa" className="text-blue-600 hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/workspace-management/coa"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <h1 className="text-2xl font-semibold">COA Detail</h1>
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Account Code</label>
          <p className="font-medium">{coa.accountCode}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Account Name</label>
          <p className="font-medium">{coa.accountName}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Description</label>
          <p className="text-gray-700">{coa.description || '-'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Status</label>
          <p className="font-medium">{coa.isActive ? 'Active' : 'Inactive'}</p>
        </div>
        {canEditCoa && (
          <div className="pt-4">
            <Link
              href={`/workspace-management/coa/${id}/edit`}
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
