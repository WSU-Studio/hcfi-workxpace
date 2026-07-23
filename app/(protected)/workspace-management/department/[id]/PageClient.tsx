'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { canShowMasterEdit } from '@/lib/workspace-master-ui-policy';

interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive?: boolean;
  head?: { name: string } | null;
  division?: { code: string; name: string } | null;
}

export default function DepartmentDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;
  const [department, setDepartment] = useState<Department | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canEditDepartment = canShowMasterEdit(
    'department',
    Boolean(session?.user?.access?.activityAccess?.editDepartment)
  );

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/department/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setDepartment(data.department))
      .catch(() => setDepartment(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!department) {
    return (
      <div className="space-y-4">
        <p className="text-red-500">Department not found</p>
        <Link href="/workspace-management/department" className="text-blue-600 hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/workspace-management/department"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <h1 className="text-2xl font-semibold">Department Detail</h1>
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Code</label>
          <p className="font-medium">{department.code}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{department.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Description</label>
          <p className="text-gray-700">{department.description || '-'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Division</label>
          <p className="font-medium">
            {department.division ? `${department.division.code} — ${department.division.name}` : '-'}
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Head</label>
          <p className="font-medium">{department.head?.name ?? '-'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Status</label>
          <p className="font-medium">{department.isActive !== false ? 'Active' : 'Inactive'}</p>
        </div>
        {canEditDepartment && (
          <div className="pt-4">
            <Link
              href={`/workspace-management/department/${id}/edit`}
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
