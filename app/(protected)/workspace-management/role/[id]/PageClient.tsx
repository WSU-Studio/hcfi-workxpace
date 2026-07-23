'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';

interface RoleDetail {
  id: string;
  roleCode: string;
  roleName: string;
  description: string | null;
}

export default function RoleDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canEditRole = Boolean(session?.user?.access?.activityAccess?.editRole);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/role/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setRole(data))
      .catch(() => setRole(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!role) return <div className="text-red-500">Role not found</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/workspace-management/role" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-2xl font-semibold">Role Detail</h1>

      <Card className="space-y-4 p-6">
        <div>
          <label className="text-sm text-gray-500">Code</label>
          <p className="font-medium">{role.roleCode}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{role.roleName}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Description</label>
          <p className="text-gray-700">{role.description || '-'}</p>
        </div>

        {canEditRole && (
          <div className="pt-4">
            <Link href={`/workspace-management/role/${id}/edit`} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Edit
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
