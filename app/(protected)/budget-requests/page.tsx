'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';

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
        <div className="relative w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-600"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
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
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">#</th>
              <th className="text-left py-3 px-4">ID</th>
              <th className="text-left py-3 px-4">Subject</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Department</th>
              <th className="text-left py-3 px-4">Budget Plan</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {currentRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No budget requests. <Link href="/budget-requests/new" className="text-blue-600 hover:underline">Create one</Link> from an approved budget plan.
                </td>
              </tr>
            ) : (
              currentRequests.map((r, i) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{startIndex + i + 1}</td>
                  <td className="py-3 px-4">{r.code}</td>
                  <td className="py-3 px-4">{r.subject}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-sm ${r.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{r.department?.name ?? '-'}</td>
                  <td className="py-3 px-4">{r.budgetPlan?.code ?? '-'}</td>
                  <td className="py-3 px-4">
                    <Link href={`/budget-requests/${r.id}`} className="text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </div>
  );
}
