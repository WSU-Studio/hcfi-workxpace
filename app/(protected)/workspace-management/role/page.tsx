'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import RoleActions from './components/RoleActions';

interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  description: string | null;
}

export default function RolePage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [filtered, setFiltered] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemsPerPage = 10;
  const canCreateRole = Boolean(session?.user?.access?.activityAccess?.createRole);
  const canEditRole = Boolean(session?.user?.access?.activityAccess?.editRole);
  const canDeleteRole = Boolean(session?.user?.access?.activityAccess?.deleteRole);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRoles = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    fetch('/api/workspace-management/role')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRoles(list);
        setFiltered(list);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) setFiltered(roles);
    else {
      const kw = searchKeyword.toLowerCase();
      setFiltered(roles.filter((r) => r.roleName?.toLowerCase().includes(kw) || r.roleCode?.toLowerCase().includes(kw)));
    }
    setCurrentPage(1);
  }, [searchKeyword, roles]);

  const refetch = () => {
    fetch('/api/workspace-management/role')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setRoles(Array.isArray(data) ? data : []);
        setFiltered(Array.isArray(data) ? data : []);
      });
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Role (Job Position)</h1>
      <div className="flex justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        {canCreateRole && (
          <Link
            href="/workspace-management/role/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Role
          </Link>
        )}
      </div>
      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentRoles.length === 0 ? (
              <TableEmptyRow colSpan={5}>No roles</TableEmptyRow>
            ) : (
              currentRoles.map((r, i) => (
                <TableBodyRow key={r.id}>
                  <TableCell>{startIndex + i + 1}</TableCell>
                  <TableCell>{r.roleCode}</TableCell>
                  <TableCell>{r.roleName}</TableCell>
                  <TableCell>{r.description || '-'}</TableCell>
                  <TableCell>
                    <RoleActions
                      roleId={r.id}
                      onDelete={refetch}
                      canEdit={canEditRole}
                      canDelete={canDeleteRole}
                    />
                  </TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
}
