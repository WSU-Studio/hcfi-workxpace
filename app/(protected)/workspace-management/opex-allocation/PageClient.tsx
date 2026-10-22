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
import OpexAllocationActions from './components/OpexAllocationActions';

type OpexAllocation = { id: string; name: string; isActive: boolean };

export default function OpexAllocationPage() {
  const { data: session } = useSession();
  const [opexAllocations, setOpexAllocations] = useState<OpexAllocation[]>([]);
  const [filtered, setFiltered] = useState<OpexAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const canCreate = Boolean(session?.user?.access?.activityAccess?.createOpexAllocation);
  const canEdit = Boolean(session?.user?.access?.activityAccess?.editOpexAllocation);
  const canDelete = Boolean(session?.user?.access?.activityAccess?.deleteOpexAllocation);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = filtered.slice(startIndex, startIndex + itemsPerPage);

  const refetch = async () => {
    const res = await fetch('/api/workspace-management/opex-allocation');
    const data = await res.json();
    const list = data.opexAllocations || [];
    setOpexAllocations(list);
    setFiltered(list);
  };

  useEffect(() => {
    refetch().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFiltered(opexAllocations);
    } else {
      const kw = searchKeyword.toLowerCase();
      setFiltered(opexAllocations.filter((row) => row.name.toLowerCase().includes(kw)));
    }
    setCurrentPage(1);
  }, [searchKeyword, opexAllocations]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Opex Allocation Master</h1>
      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        {canCreate && (
          <Link
            href="/workspace-management/opex-allocation/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Opex Allocation
          </Link>
        )}
      </div>

      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <TableEmptyRow colSpan={4}>
                {searchKeyword.trim() ? 'No matches' : 'No opex allocations'}
              </TableEmptyRow>
            ) : (
              currentRows.map((row, idx) => (
                <TableBodyRow key={row.id}>
                  <TableCell>{startIndex + idx + 1}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.isActive ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>
                    <OpexAllocationActions
                      opexAllocationId={row.id}
                      onDelete={refetch}
                      canEdit={canEdit}
                      canDelete={canDelete}
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
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
