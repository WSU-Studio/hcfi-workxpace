'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Division } from '@/types/division';
import { stripHtmlTags } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import DivisionActions from './components/DivisionActions';

export default function DivisionPage() {
  const { data: session } = useSession();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [filtered, setFiltered] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemsPerPage = 10;
  const canCreate = Boolean(session?.user?.access?.activityAccess?.createDivision);
  const canEdit = Boolean(session?.user?.access?.activityAccess?.editDivision);
  const canDelete = Boolean(session?.user?.access?.activityAccess?.deleteDivision);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = filtered.slice(startIndex, startIndex + itemsPerPage);

  const refetch = async () => {
    const res = await fetch('/api/workspace-management/division');
    const data = await res.json();
    const list = data.divisions || [];
    setDivisions(list);
    setFiltered(list);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/workspace-management/division');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const list = data.divisions || [];
        setDivisions(list);
        setFiltered(list);
      } catch {
        setError('Failed to load data');
        setDivisions([]);
        setFiltered([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFiltered(divisions);
    } else {
      const kw = searchKeyword.trim().toLowerCase();
      setFiltered(
        divisions.filter(
          (d) =>
            d.name?.toLowerCase().includes(kw) ||
            d.code?.toLowerCase().includes(kw) ||
            d.description?.toLowerCase().includes(kw),
        ),
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, divisions]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Division</h1>
      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        {canCreate && (
          <Link
            href="/workspace-management/division/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Division
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
              <TableHead>Departments</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <TableEmptyRow colSpan={6}>{searchKeyword.trim() ? 'No matches' : 'No divisions'}</TableEmptyRow>
            ) : (
              currentRows.map((row, i) => (
                <TableBodyRow key={row.id}>
                  <TableCell>{startIndex + i + 1}</TableCell>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{stripHtmlTags(row.description)}</TableCell>
                  <TableCell>{row._count?.departments ?? row.departments?.length ?? 0}</TableCell>
                  <TableCell>
                    <DivisionActions
                      divisionId={row.id}
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
