'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { Division } from '@/types/division';

export default function DivisionDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;
  const [division, setDivision] = useState<Division | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canEdit = Boolean(session?.user?.access?.activityAccess?.editDivision);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/division/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setDivision(data.division))
      .catch(() => setDivision(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!division) {
    return (
      <div className="space-y-4">
        <p className="text-red-500">Division not found</p>
        <Link href="/workspace-management/division" className="text-blue-600 hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/workspace-management/division"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <h1 className="text-2xl font-semibold">Division Detail</h1>
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Code</label>
          <p className="font-medium">{division.code}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{division.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Description</label>
          <p className="text-gray-700">{division.description || '-'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Departments</label>
          {division.departments && division.departments.length > 0 ? (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-gray-800">
              {division.departments.map((dept) => (
                <li key={dept.id}>
                  <Link
                    href={`/workspace-management/department/${dept.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {dept.code} — {dept.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-medium">—</p>
          )}
        </div>
        {canEdit && (
          <div className="pt-4">
            <Link
              href={`/workspace-management/division/${id}/edit`}
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
