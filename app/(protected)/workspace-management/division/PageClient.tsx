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
import {
  Table,
  TableBodyRow,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderRow,
  TableScroll,
  stickyListCol,
} from '@/components/ui/Table';
import DivisionActions from './components/DivisionActions';

function formatDepartmentSummary(row: Division): string {
  const departments = row.departments ?? [];
  const count = row._count?.departments ?? departments.length;
  if (count === 0) return '0';
  const codes = departments.map((dept) => dept.code).filter(Boolean);
  if (codes.length === 0) return String(count);
  return `${count} (${codes.join(', ')})`;
}

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
        divisions.filter((d) => {
          const deptCodes = (d.departments ?? []).map((dept) => dept.code).join(' ');
          return (
            d.name?.toLowerCase().includes(kw) ||
            d.code?.toLowerCase().includes(kw) ||
            d.description?.toLowerCase().includes(kw) ||
            deptCodes.toLowerCase().includes(kw)
          );
        }),
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
        <TableScroll>
          <Table className="min-w-[720px]">
            <thead>
              <TableHeaderRow>
                <TableHead className={stickyListCol.index.head}>#</TableHead>
                <TableHead className={stickyListCol.code.head}>Code</TableHead>
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
                    <TableCell className={stickyListCol.index.cell}>{startIndex + i + 1}</TableCell>
                    <TableCell className={stickyListCol.code.cell}>{row.code}</TableCell>
                    <TableCell className="truncate" title={row.name}>
                      {row.name}
                    </TableCell>
                    <TableCell title={stripHtmlTags(row.description) || undefined}>
                      <div className="line-clamp-3 max-w-xs">{stripHtmlTags(row.description)}</div>
                    </TableCell>
                    <TableCell title={formatDepartmentSummary(row)}>
                      <div className="line-clamp-3 max-w-xs">{formatDepartmentSummary(row)}</div>
                    </TableCell>
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
        </TableScroll>
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
