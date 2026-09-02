'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
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
import Tooltip from '@/components/ui/Tooltip';
import FiscalYearFilter from '@/components/forms/FiscalYearFilter';
import {
  ALL_FISCAL_YEARS,
  type FiscalYearFilterValue,
  getCurrentFiscalYear,
  serializeFiscalYearParam,
} from '@/lib/fiscal-year';
import EditWarningModal from '@/components/ui/EditWarningModal';
import { getRequestStatusDisplay, requiresEditConfirmation } from '@/lib/budget-plan-approval-display';
import { formatDate, formatTime } from '@/lib/utils';

interface PaymentRequestRow {
  id: string;
  code: string;
  subject: string;
  createdAt: string;
  status: string;
  amount: number;
  requestorName?: string | null;
  canEdit?: boolean;
  canReview?: boolean;
  budgetRequest: { code: string; subject: string } | null;
  department: { name: string };
  approvalSchemaId?: string;
}

const STATUS_FILTERS = ['All', 'Draft', 'On Progress', 'Need Revision', 'Approved', 'Declined'] as const;
const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
  { value: 'subject-asc', label: 'Subject (A-Z)' },
  { value: 'subject-desc', label: 'Subject (Z-A)' },
  { value: 'code-asc', label: 'Code (A-Z)' },
  { value: 'code-desc', label: 'Code (Z-A)' },
  { value: 'department-asc', label: 'Department (A-Z)' },
  { value: 'department-desc', label: 'Department (Z-A)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'status-desc', label: 'Status (Z-A)' },
] as const;

export default function PaymentRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PaymentRequestRow[]>([]);
  const [filtered, setFiltered] = useState<PaymentRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('createdAt-desc');
  const [fiscalYearFilter, setFiscalYearFilter] = useState<FiscalYearFilterValue>(() => getCurrentFiscalYear());
  const [requestToConfirmEdit, setRequestToConfirmEdit] = useState<PaymentRequestRow | null>(null);
  const [listFetchWarning, setListFetchWarning] = useState('');

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRequests = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (fiscalYearFilter !== ALL_FISCAL_YEARS) {
      params.set('fiscalYear', serializeFiscalYearParam(fiscalYearFilter));
    }
    const query = params.toString();
    fetch(`/api/payment-requests${query ? `?${query}` : ''}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((data) => {
        const list = data.requests || [];
        setRequests(list);
        setFiltered(list);
        setListFetchWarning(
          typeof data.listError === 'string' && data.listError.trim() !== '' ? data.listError : ''
        );
      })
      .finally(() => setIsLoading(false));
  }, [fiscalYearFilter]);

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
          r.budgetRequest?.code?.toLowerCase().includes(kw) ||
          r.budgetRequest?.subject?.toLowerCase().includes(kw);
        const statusLabel = getRequestStatusDisplay(r.status).label;
        const matchesStatus = statusFilter === 'All' || statusLabel === statusFilter;
        return matchesKeyword && matchesStatus;
      })
      .sort((a, b) => {
        let compare = 0;

        if (sortField === 'createdAt') {
          compare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortField === 'subject') {
          compare = (a.subject ?? '').localeCompare(b.subject ?? '');
        } else if (sortField === 'code') {
          compare = (a.code ?? '').localeCompare(b.code ?? '');
        } else if (sortField === 'department') {
          compare = (a.department?.name ?? '').localeCompare(b.department?.name ?? '');
        } else if (sortField === 'status') {
          compare = (a.status ?? '').localeCompare(b.status ?? '');
        }

        if (compare === 0) {
          compare = (a.code ?? '').localeCompare(b.code ?? '');
        }

        return sortDirection === 'asc' ? compare : -compare;
      });

    setFiltered(sortedAndFiltered);
    setCurrentPage(1);
  }, [searchKeyword, requests, statusFilter, sortBy]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Payment Requests</h1>
      {listFetchWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {listFetchWarning} The table below may be incomplete. Check server logs and that payment request migrations are
          applied.
        </div>
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Search..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <FiscalYearFilter
            value={fiscalYearFilter}
            onChange={setFiscalYearFilter}
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
          href="/payment-requests/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Request
        </Link>
      </div>
      <Card>
        <TableScroll>
          <Table className="min-w-[1024px]">
            <thead>
              <TableHeaderRow>
                <TableHead className={stickyListCol.index.head}>#</TableHead>
                <TableHead className={stickyListCol.createdAt.head}>Created At</TableHead>
                <TableHead className={stickyListCol.id.head}>ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Budget Request</TableHead>
                <TableHead>Actions</TableHead>
              </TableHeaderRow>
            </thead>
            <tbody>
              {currentRequests.length === 0 ? (
                <TableEmptyRow colSpan={10}>
                  No payment requests.{' '}
                  <Link href="/payment-requests/new" className="text-blue-600 hover:underline">
                    Create one
                  </Link>
                  {' — optionally link an approved budget request.'}
                </TableEmptyRow>
              ) : (
                currentRequests.map((r, i) => (
                  <TableBodyRow key={r.id}>
                    <TableCell className={stickyListCol.index.cell}>{startIndex + i + 1}</TableCell>
                    <TableCell className={stickyListCol.createdAt.cell}>
                      <div className="flex flex-col">
                        <span>{formatDate(r.createdAt)}</span>
                        <span className="text-xs text-gray-500 -mt-1">at {formatTime(r.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className={stickyListCol.id.cell}>{r.code}</TableCell>
                  <TableCell>{r.subject}</TableCell>
                  <TableCell>{r.requestorName ?? '-'}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(Number(r.amount ?? 0))}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {(() => {
                        const display = getRequestStatusDisplay(r.status);
                        return (
                          <span className={`px-1.5 py-0.5 rounded-lg text-xs whitespace-nowrap border ${display.chipClass}`}>
                            {display.label}
                          </span>
                        );
                      })()}
                      {!r.approvalSchemaId ? (
                        <Tooltip content="No approval schema">
                          <span
                            aria-label="No approval schema"
                            className="rounded-lg border border-red-300 bg-red-100 px-2 text-sm font-bold text-red-800"
                          >
                            !
                          </span>
                        </Tooltip>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{r.department?.name ?? '-'}</TableCell>
                  <TableCell>{r.budgetRequest?.code ?? '-'}</TableCell>
                  <TableCell>
                    <Link href={`/payment-requests/${r.id}`} className="text-blue-600 hover:underline">
                      View
                    </Link>
                    {r.canEdit ? (
                      <>
                        {' | '}
                        {requiresEditConfirmation(r.status) ? (
                          <button
                            type="button"
                            onClick={() => setRequestToConfirmEdit(r)}
                            className="cursor-pointer text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                        ) : (
                          <Link href={`/payment-requests/${r.id}/edit`} className="text-blue-600 hover:underline">
                            Edit
                          </Link>
                        )}
                      </>
                    ) : null}
                    {r.canReview ? (
                      <>
                        {' | '}
                        <Link href={`/payment-requests/${r.id}/review`} className="text-blue-600 hover:underline">
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
        </TableScroll>
      </Card>
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        itemNoun="payment requests"
      />
      <EditWarningModal
        isOpen={Boolean(requestToConfirmEdit)}
        entityType="payment-request"
        subject={requestToConfirmEdit?.subject}
        onCancel={() => setRequestToConfirmEdit(null)}
        onContinue={() => {
          if (!requestToConfirmEdit) return;
          const requestId = requestToConfirmEdit.id;
          setRequestToConfirmEdit(null);
          router.push(`/payment-requests/${requestId}/edit`);
        }}
      />
    </div>
  );
}
