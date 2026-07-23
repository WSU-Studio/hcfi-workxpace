'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

type CostCenter = { id: string; name: string; description: string | null };

export default function CostCenterDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;
  const [costCenter, setCostCenter] = useState<CostCenter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canEditCostCenter = Boolean(session?.user?.access?.activityAccess?.editCostCenter);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/cost-center/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCostCenter(data.costCenter))
      .catch(() => setCostCenter(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!costCenter) return <div className="text-red-500">Cost center not found</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/workspace-management/cost-center" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <h1 className="text-2xl font-semibold">Cost Center Detail</h1>
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{costCenter.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Description</label>
          <p className="text-gray-700">{costCenter.description || '-'}</p>
        </div>
        {canEditCostCenter && (
          <div className="pt-4">
            <Link href={`/workspace-management/cost-center/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Edit
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
