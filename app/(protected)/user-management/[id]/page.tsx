'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import { formatDate } from '@/lib/utils';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  isActive: boolean;
  createdAt: string;
  role: { roleCode: string; roleName: string } | null;
  department: { code: string; name: string } | null;
}

export default function UserDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canEditUser = Boolean(session?.user?.access?.activityAccess?.editUser);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/user-management/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpin />;
  if (!user) return <div className="text-red-500">User not found</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col items-start justify-between">
        <Link href="/user-management" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900">
        ← Back
        </Link>

        <h1 className="text-2xl font-semibold">User Detail</h1>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">{user.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Email</label>
          <p className="font-medium">{user.email}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Employee ID</label>
          <p className="font-medium">{user.employeeId}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Role</label>
          <p className="font-medium">{user.role ? `${user.role.roleCode} - ${user.role.roleName}` : '-'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Department</label>
          <p className="font-medium">{user.department ? `${user.department.code} - ${user.department.name}` : '-'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Status</label>
          <p className="font-medium">
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Date added</label>
          <p className="font-medium">{formatDate(user.createdAt)}</p>
        </div>

        {canEditUser && (
          <div className="flex flex-wrap gap-3 pt-4">
            <Link href={`/user-management/${id}/edit`} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Edit
            </Link>
            <Link href={`/user-management/${id}/access-control`} className="rounded-lg border border-gray-400 px-4 py-2 hover:bg-gray-50">
              Access control
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
