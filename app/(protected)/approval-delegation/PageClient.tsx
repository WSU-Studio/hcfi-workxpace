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
import { formatDate, formatDateTime } from '@/lib/utils';
import type { ApprovalDelegationListStatus } from '@/lib/approval-delegation';
import DelegationActions from './components/DelegationActions';

type DelegationRow = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  listStatus: ApprovalDelegationListStatus;
  notes: string | null;
  createdAt: string;
  delegator: { id: string; name: string; employeeId: string };
  delegate: { id: string; name: string; employeeId: string };
  createdBy: { id: string; name: string };
};

const STATUS_CHIP: Record<ApprovalDelegationListStatus, string> = {
  Scheduled: 'bg-slate-100 text-slate-700 border-slate-200',
  Active: 'bg-green-100 text-green-800 border-green-200',
  Expired: 'bg-gray-100 text-gray-600 border-gray-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export default function ApprovalDelegationPage() {
  const { data: session } = useSession();
  const [rows, setRows] = useState<DelegationRow[]>([]);
  const [filtered, setFiltered] = useState<DelegationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const canCreate = Boolean(session?.user?.access?.activityAccess?.createApprovalDelegation);
  const canCancel = Boolean(session?.user?.access?.activityAccess?.cancelApprovalDelegation);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = filtered.slice(startIndex, startIndex + itemsPerPage);

  const refetch = async () => {
    const res = await fetch('/api/approval-delegation');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    const list = (data.delegations || []) as DelegationRow[];
    setRows(list);
    setFiltered(list);
  };

  useEffect(() => {
    refetch().catch(() => setRows([])).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFiltered(rows);
    } else {
      const kw = searchKeyword.toLowerCase();
      setFiltered(
        rows.filter(
          (row) =>
            row.delegator.name.toLowerCase().includes(kw) ||
            row.delegate.name.toLowerCase().includes(kw) ||
            row.delegator.employeeId.toLowerCase().includes(kw) ||
            row.delegate.employeeId.toLowerCase().includes(kw) ||
            row.createdBy.name.toLowerCase().includes(kw),
        ),
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, rows]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Approval Delegation</h1>
      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        {canCreate && (
          <Link
            href="/approval-delegation/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Delegation
          </Link>
        )}
      </div>

      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Delegator</TableHead>
              <TableHead>Delegate</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <TableEmptyRow colSpan={9}>
                {searchKeyword.trim() ? 'No matches' : 'No approval delegations yet'}
              </TableEmptyRow>
            ) : (
              currentRows.map((row, idx) => (
                <TableBodyRow key={row.id}>
                  <TableCell>{startIndex + idx + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{row.delegator.name}</div>
                    <div className="text-xs text-gray-500">{row.delegator.employeeId}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{row.delegate.name}</div>
                    <div className="text-xs text-gray-500">{row.delegate.employeeId}</div>
                  </TableCell>
                  <TableCell>{formatDate(row.startDate)}</TableCell>
                  <TableCell>{formatDate(row.endDate)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[row.listStatus]}`}
                    >
                      {row.listStatus}
                    </span>
                  </TableCell>
                  <TableCell>{row.createdBy.name}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>
                    <DelegationActions
                      delegationId={row.id}
                      listStatus={row.listStatus}
                      canCancel={canCancel}
                      onCancelled={refetch}
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
