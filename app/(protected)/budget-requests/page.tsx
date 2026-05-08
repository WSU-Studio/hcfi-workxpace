'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';

interface BudgetRequest {
  id: string;
  code: string;
  subject: string;
  status: string;
  requestorName?: string | null;
  canEdit?: boolean;
  canReview?: boolean;
  budgetPlan: { code: string; subject: string };
  department: { name: string };
  lineItems?: { total: unknown }[];
}

interface EditWarningModalProps {
  isOpen: boolean;
  requestSubject?: string;
  onCancel: () => void;
  onContinue: () => void;
}

const EditWarningModal = ({ isOpen, requestSubject, onCancel, onContinue }: EditWarningModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Do you want to edit budget request?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The status of the budget request
          {requestSubject ? <span className="font-medium text-slate-800"> &quot;{requestSubject}&quot;</span> : ''} will be
          reverted to the initial status and needs to go through the approval process again.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const STATUS_FILTERS = ['All', 'Approved', 'Reviewed', 'Pending', 'Revision', 'Declined'] as const;
const SORT_OPTIONS = [
  { value: 'subject-asc', label: 'Subject (A-Z)' },
  { value: 'subject-desc', label: 'Subject (Z-A)' },
  { value: 'code-asc', label: 'Code (A-Z)' },
  { value: 'code-desc', label: 'Code (Z-A)' },
  { value: 'department-asc', label: 'Department (A-Z)' },
  { value: 'department-desc', label: 'Department (Z-A)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'status-desc', label: 'Status (Z-A)' },
] as const;

export default function BudgetRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [filtered, setFiltered] = useState<BudgetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('subject-asc');
  const [requestToConfirmEdit, setRequestToConfirmEdit] = useState<BudgetRequest | null>(null);

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRequests = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    fetch('/api/budget-requests', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((data) => {
        const list = data.requests || [];
        setRequests(list);
        setFiltered(list);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const kw = searchKeyword.trim().toLowerCase();
    const [sortField, sortDirection] = sortBy.split('-') as [string, 'asc' | 'desc'];

    const sortedAndFiltered = [...requests]
      .filter((r) => {
        const matchesKeyword =
          !kw ||
          r.subject?.toLowerCase().includes(kw) ||
          r.code?.toLowerCase().includes(kw) ||
          r.requestorName?.toLowerCase().includes(kw) ||
          r.department?.name?.toLowerCase().includes(kw) ||
          r.budgetPlan?.code?.toLowerCase().includes(kw) ||
          r.budgetPlan?.subject?.toLowerCase().includes(kw);
        const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
        return matchesKeyword && matchesStatus;
      })
      .sort((a, b) => {
        let compare = 0;

        if (sortField === 'subject') {
          compare = (a.subject ?? '').localeCompare(b.subject ?? '');
        } else if (sortField === 'code') {
          compare = (a.code ?? '').localeCompare(b.code ?? '');
        } else if (sortField === 'department') {
          compare = (a.department?.name ?? '').localeCompare(b.department?.name ?? '');
        } else if (sortField === 'status') {
          compare = (a.status ?? '').localeCompare(b.status ?? '');
        }

        return sortDirection === 'asc' ? compare : -compare;
      });

    setFiltered(sortedAndFiltered);
    setCurrentPage(1);
  }, [searchKeyword, requests, statusFilter, sortBy]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Budget Requests</h1>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Search..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
            className="h-10 rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:border-blue-500"
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
            className="h-10 rounded-lg border border-slate-400 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:border-blue-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Link
          href="/budget-requests/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Request
        </Link>
      </div>
      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Budget Plan</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentRequests.length === 0 ? (
              <TableEmptyRow colSpan={8}>
                No budget requests. <Link href="/budget-requests/new" className="text-blue-600 hover:underline">Create one</Link> from an approved budget plan.
              </TableEmptyRow>
            ) : (
              currentRequests.map((r, i) => (
                <TableBodyRow key={r.id}>
                  <TableCell>{startIndex + i + 1}</TableCell>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.subject}</TableCell>
                  <TableCell>{r.requestorName ?? '-'}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded px-2 py-0.5 text-sm ${
                        r.status === 'Approved'
                          ? 'bg-green-100 text-green-800'
                          : r.status === 'Reviewed'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell>{r.department?.name ?? '-'}</TableCell>
                  <TableCell>{r.budgetPlan?.code ?? '-'}</TableCell>
                  <TableCell>
                    <Link href={`/budget-requests/${r.id}`} className="text-blue-600 hover:underline">View</Link>
                    {r.canEdit ? (
                      <>
                        {' | '}
                        {r.status === 'Approved' ? (
                          <button
                            type="button"
                            onClick={() => setRequestToConfirmEdit(r)}
                            className="cursor-pointer text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                        ) : (
                          <Link href={`/budget-requests/${r.id}/edit`} className="text-blue-600 hover:underline">
                            Edit
                          </Link>
                        )}
                      </>
                    ) : null}
                    {r.canReview ? (
                      <>
                        {' | '}
                        <Link href={`/budget-requests/${r.id}/review`} className="text-blue-600 hover:underline">
                          Review
                        </Link>
                      </>
                    ) : null}
                  </TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
      <EditWarningModal
        isOpen={Boolean(requestToConfirmEdit)}
        requestSubject={requestToConfirmEdit?.subject}
        onCancel={() => setRequestToConfirmEdit(null)}
        onContinue={() => {
          if (!requestToConfirmEdit) return;
          const requestId = requestToConfirmEdit.id;
          setRequestToConfirmEdit(null);
          router.push(`/budget-requests/${requestId}/edit`);
        }}
      />
    </div>
  );
}
