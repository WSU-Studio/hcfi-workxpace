'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Department } from '@/types/department';
import { stripHtmlTags } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import DepartmentActions from './components/DepartmentActions';
import { canShowMasterCrud, isSyncManagedMaster } from '@/lib/workspace-master-ui-policy';
import MasterSyncBanner from '@/components/workspace-management/MasterSyncBanner';

export default function DepartmentPage() {
  const { data: session } = useSession();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [latestSync, setLatestSync] = useState<{ timestamp: string; details: { status?: string; error?: string; summary?: { sourceCount: number; created: number; updated: number; deactivated: number } } } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const itemsPerPage = 10;
  const isSyncManaged = isSyncManagedMaster('department');
  const canCreateDepartment = canShowMasterCrud(
    'department',
    Boolean(session?.user?.access?.activityAccess?.createDepartment)
  );
  const canRunSync = Boolean(session?.user?.id);
  const canEditDepartment = canShowMasterCrud(
    'department',
    Boolean(session?.user?.access?.activityAccess?.editDepartment)
  );
  const canDeleteDepartment = canShowMasterCrud(
    'department',
    Boolean(session?.user?.access?.activityAccess?.deleteDepartment)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDepartments = filteredDepartments.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/workspace-management/department');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const list = data.departments || [];
        setDepartments(list);
        setFilteredDepartments(list);
      } catch {
        setError('Failed to load data');
        setDepartments([]);
        setFilteredDepartments([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isSyncManaged) return;
    fetch('/api/workspace-management/sync/department')
      .then((res) => res.json())
      .then((data) => setLatestSync(data.latest ?? null))
      .catch(() => setLatestSync(null));
  }, [isSyncManaged]);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredDepartments(departments);
    } else {
      const kw = searchKeyword.trim().toLowerCase();
      setFilteredDepartments(
        departments.filter(
          (d) =>
            d.name?.toLowerCase().includes(kw) ||
            d.code?.toLowerCase().includes(kw) ||
            d.description?.toLowerCase().includes(kw) ||
            (d.head as { name?: string })?.name?.toLowerCase().includes(kw)
        )
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, departments]);

  const refetch = async () => {
    const res = await fetch('/api/workspace-management/department');
    const data = await res.json();
    const list = data.departments || [];
    setDepartments(list);
    setFilteredDepartments(list);
  };

  const runSync = async () => {
    setSyncMessage(null);
    setIsSyncing(true);
    try {
      const res = await fetch('/api/workspace-management/sync/department', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data.error ?? 'Sync failed');
        return;
      }
      const summary = data.summary as { sourceCount: number; created: number; updated: number; deactivated: number } | undefined;
      setSyncMessage(
        summary
          ? `Sync selesai: source ${summary.sourceCount}, created ${summary.created}, updated ${summary.updated}.`
          : 'Sync department berhasil dijalankan.'
      );
      await Promise.all([
        refetch(),
        fetch('/api/workspace-management/sync/department')
          .then((statusRes) => statusRes.json())
          .then((statusData) => setLatestSync(statusData.latest ?? null)),
      ]);
    } catch {
      setSyncMessage('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Department</h1>
      {isSyncManaged && (
        <MasterSyncBanner
          label="Department"
          canRunSync={canRunSync}
          isSyncing={isSyncing}
          onSync={runSync}
          latestSync={latestSync}
          message={syncMessage}
        />
      )}
      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        {canCreateDepartment && (
          <Link
            href="/workspace-management/department/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </Link>
        )}
      </div>

      {error && <div className="text-red-500 py-4">{error}</div>}

      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Head</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentDepartments.length === 0 ? (
              <TableEmptyRow colSpan={6}>{searchKeyword.trim() ? 'No matches' : 'No departments'}</TableEmptyRow>
            ) : (
              currentDepartments.map((dept, i) => (
                <TableBodyRow key={dept.id}>
                  <TableCell>{startIndex + i + 1}</TableCell>
                  <TableCell>{dept.code}</TableCell>
                  <TableCell>{dept.name}</TableCell>
                  <TableCell>{stripHtmlTags(dept.description)}</TableCell>
                  <TableCell>{(dept.head as { name?: string })?.name ?? '-'}</TableCell>
                  <TableCell>
                    <DepartmentActions
                      departmentId={dept.id}
                      onDelete={refetch}
                      canEdit={canEditDepartment}
                      canDelete={canDeleteDepartment}
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
        totalItems={filteredDepartments.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
