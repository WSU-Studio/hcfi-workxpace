'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  budgetPlan: { code: string; subject: string };
  department: { name: string };
  lineItems?: { total: unknown }[];
}

export default function BudgetRequestsPage() {
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [filtered, setFiltered] = useState<BudgetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRequests = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    fetch('/api/budget-requests')
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((data) => {
        const list = data.requests || [];
        setRequests(list);
        setFiltered(list);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) setFiltered(requests);
    else {
      const kw = searchKeyword.toLowerCase();
      setFiltered(requests.filter((r) => r.subject?.toLowerCase().includes(kw) || r.code?.toLowerCase().includes(kw)));
    }
    setCurrentPage(1);
  }, [searchKeyword, requests]);

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Budget Requests</h1>
      <div className="flex justify-between gap-4">
        <SearchInput
          placeholder="Search..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
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
              <TableHead>Status</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Budget Plan</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentRequests.length === 0 ? (
              <TableEmptyRow colSpan={7}>
                No budget requests. <Link href="/budget-requests/new" className="text-blue-600 hover:underline">Create one</Link> from an approved budget plan.
              </TableEmptyRow>
            ) : (
              currentRequests.map((r, i) => (
                <TableBodyRow key={r.id}>
                  <TableCell>{startIndex + i + 1}</TableCell>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.subject}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-sm ${r.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell>{r.department?.name ?? '-'}</TableCell>
                  <TableCell>{r.budgetPlan?.code ?? '-'}</TableCell>
                  <TableCell>
                    <Link href={`/budget-requests/${r.id}`} className="text-blue-600 hover:underline">View</Link>
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
