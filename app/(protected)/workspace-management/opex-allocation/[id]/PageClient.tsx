'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

type OpexAllocation = { id: string; name: string; isActive: boolean };

export default function OpexAllocationDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;
  const [opexAllocation, setOpexAllocation] = useState<OpexAllocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canEdit = Boolean(session?.user?.access?.activityAccess?.editOpexAllocation);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/opex-allocation/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setOpexAllocation(data.opexAllocation))
      .catch(() => setOpexAllocation(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!opexAllocation) return <div className="text-red-500">Opex allocation not found</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/workspace-management/opex-allocation"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <h1 className="text-2xl font-semibold">Opex Allocation Detail</h1>
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{opexAllocation.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Status</label>
          <p className="text-gray-700">{opexAllocation.isActive ? 'Active' : 'Inactive'}</p>
        </div>
        {canEdit && (
          <div className="pt-4">
            <Link
              href={`/workspace-management/opex-allocation/${id}/edit`}
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
