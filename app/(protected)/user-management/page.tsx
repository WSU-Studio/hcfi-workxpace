'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, RefreshCw } from 'lucide-react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import { formatDate } from '@/lib/utils';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import UserActions from './components/UserActions';
import { UserListItem } from '@/types/user-management';

const STATUS_FILTERS = ['All', 'Active', 'Inactive'] as const;
const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'role-asc', label: 'Role (A-Z)' },
  { value: 'role-desc', label: 'Role (Z-A)' },
  { value: 'department-asc', label: 'Department (A-Z)' },
  { value: 'department-desc', label: 'Department (Z-A)' },
] as const;

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('createdAt-desc');

  const canCreateUser = Boolean(session?.user?.access?.activityAccess?.createUser);
  const canEditUser = Boolean(session?.user?.access?.activityAccess?.editUser);
  const canDeleteUser = Boolean(session?.user?.access?.activityAccess?.deleteUser);
  const canChangeAccess = Boolean(session?.user?.access?.activityAccess?.changeAccess);
  const canSyncFromConfins = canEditUser || canChangeAccess;

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

  const runConfinsSync = async () => {
    setSyncMessage(null);
    setIsSyncing(true);
    try {
      const res = await fetch('/api/user-management/sync-confins', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data.error ?? 'Sync from Confins failed');
        return;
      }

      const summary = data.summary as
        | {
            totalUsers: number;
            matchedInConfins: number;
            updated: number;
            unchanged: number;
            notInConfins: number;
          }
        | undefined;

      setSyncMessage(
        summary
          ? `Sync selesai: ${summary.updated} user diperbarui dari Confins (${summary.matchedInConfins}/${summary.totalUsers} match, ${summary.notInConfins} tidak ada di Confins).`
          : 'Sync from Confins berhasil.',
      );
      await fetchUsers();
    } catch {
      setSyncMessage('Sync from Confins failed');
    } finally {
      setIsSyncing(false);
    }
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
    const kw = searchKeyword.trim().toLowerCase();
    const [sortField, sortDirection] = sortBy.split('-') as [string, 'asc' | 'desc'];

    const sortedAndFiltered = [...users]
      .filter((user) => {
        const matchesKeyword =
          !kw ||
          [
            user.name,
            user.email,
            user.employeeId,
            user.role?.roleName ?? '',
            user.role?.roleCode ?? '',
            user.department?.name ?? '',
            user.department?.code ?? '',
          ].some((value) => value.toLowerCase().includes(kw));
        const matchesStatus =
          statusFilter === 'All' || (statusFilter === 'Active' ? user.isActive : !user.isActive);
        return matchesKeyword && matchesStatus;
      })
      .sort((a, b) => {
        let compare = 0;

        if (sortField === 'name') {
          compare = (a.name ?? '').localeCompare(b.name ?? '');
        } else if (sortField === 'role') {
          compare = (a.role?.roleName ?? '').localeCompare(b.role?.roleName ?? '');
        } else if (sortField === 'department') {
          compare = (a.department?.name ?? '').localeCompare(b.department?.name ?? '');
        } else {
          compare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        return sortDirection === 'asc' ? compare : -compare;
      });

    setFilteredUsers(sortedAndFiltered);
    setCurrentPage(1);
  }, [searchKeyword, users, statusFilter, sortBy]);

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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Search user, role, department..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
            className="h-10 rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === 'All' ? 'All statuses' : status}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as (typeof SORT_OPTIONS)[number]['value'])}
            className="h-10 rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSyncFromConfins && (
            <Button
              type="button"
              variant="outline"
              onClick={runConfinsSync}
              disabled={isSyncing}
              title="Update employee ID and department from Confins for users whose email exists in Confins"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync from Confins'}
            </Button>
          )}

          {canCreateUser && (
            <Link href="/user-management/new" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Add User
            </Link>
          )}
        </div>
      </div>

      {syncMessage && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {syncMessage}
        </div>
      )}

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
                    <div className="flex flex-col">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-700 -mt-1">{user.email}</p>
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
                      canChangeAccess={canChangeAccess}
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
