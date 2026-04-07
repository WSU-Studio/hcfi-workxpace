'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus } from 'lucide-react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { formatDate } from '@/lib/utils';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import UserActions from './components/UserActions';
import { UserListItem } from '@/types/user-management';

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const canCreateUser = Boolean(session?.user?.access?.activityAccess?.createUser);
  const canEditUser = Boolean(session?.user?.access?.activityAccess?.editUser);
  const canDeleteUser = Boolean(session?.user?.access?.activityAccess?.deleteUser);

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const fetchUsers = async () => {
    const res = await fetch('/api/user-management');
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    const list = data.users ?? [];
    setUsers(list);
    setFilteredUsers(list);
  };

  useEffect(() => {
    fetchUsers()
      .catch(() => {
        setError('Failed to load users');
        setUsers([]);
        setFilteredUsers([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredUsers(users);
    } else {
      const kw = searchKeyword.trim().toLowerCase();
      setFilteredUsers(
        users.filter((user) =>
          [
            user.name,
            user.email,
            user.employeeId,
            user.role?.roleName ?? '',
            user.role?.roleCode ?? '',
            user.department?.name ?? '',
            user.department?.code ?? '',
          ].some((value) => value.toLowerCase().includes(kw))
        )
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, users]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      inactive: users.filter((u) => !u.isActive).length,
    }),
    [users]
  );

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-gray-500">Kelola data user dan pengaturan hak akses aplikasi.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Users</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Active</p>
          <p className="text-2xl font-semibold text-emerald-600">{stats.active}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Inactive</p>
          <p className="text-2xl font-semibold text-amber-600">{stats.inactive}</p>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="Search user, role, department..."
        />
        {canCreateUser && (
          <Link href="/user-management/new" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add User
          </Link>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">{error}</div>}

      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentUsers.length === 0 ? (
              <TableEmptyRow colSpan={8}>{searchKeyword.trim() ? 'No users match your search' : 'No users yet'}</TableEmptyRow>
            ) : (
              currentUsers.map((user, index) => (
                <TableBodyRow key={user.id}>
                  <TableCell>{startIndex + index + 1}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{user.employeeId}</TableCell>
                  <TableCell>{user.role ? `${user.role.roleCode} - ${user.role.roleName}` : '-'}</TableCell>
                  <TableCell>{user.department ? `${user.department.code} - ${user.department.name}` : '-'}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <UserActions
                      userId={user.id}
                      sessionUserId={session?.user?.id}
                      canEditUser={canEditUser}
                      canDeleteUser={canDeleteUser}
                      onDelete={fetchUsers}
                    />
                  </TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredUsers.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
