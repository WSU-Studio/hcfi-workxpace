'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';

interface Plan {
  id: string;
  code: string;
  subject: string;
  status: string;
  department: { name: string };
  allocations?: { allocation: unknown }[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BudgetPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filtered, setFiltered] = useState<Plan[]>([]);
  const [, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPlans = filtered.slice(startIndex, startIndex + itemsPerPage);

  const fetchData = async () => {
    const res = await fetch('/api/budget-plans');
    const data = await res.json();
    const list = data.plans || [];
    setPlans(list);
    setFiltered(list);
    setDepartments(data.departments || []);
  };

  useEffect(() => {
    fetchData().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) setFiltered(plans);
    else {
      const kw = searchKeyword.toLowerCase();
      setFiltered(plans.filter((p) => p.subject?.toLowerCase().includes(kw) || p.code?.toLowerCase().includes(kw) || p.department?.name?.toLowerCase().includes(kw)));
    }
    setCurrentPage(1);
  }, [searchKeyword, plans]);

  const getTotal = (p: Plan) => {
    if (!p.allocations?.length) return 0;
    return p.allocations.reduce((sum, a) => sum + Number(a.allocation ?? 0), 0);
  };

  const getMonthsLabel = (p: Plan) => {
    if (!p.allocations?.length) return '-';
    const withAlloc = p.allocations
      .map((a, i) => (Number(a.allocation ?? 0) > 0 ? MONTH_NAMES[i] : null))
      .filter(Boolean) as string[];
    return withAlloc.length === 12 ? 'All Months' : withAlloc.join(', ') || '-';
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Budget Plans</h1>
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
          href="/budget-plans/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Plan
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
              <th className="text-left py-3 px-4">Total Budget</th>
              <th className="text-left py-3 px-4">Month(s)</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {currentPlans.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  No budget plans. <Link href="/budget-plans/new" className="text-blue-600 hover:underline">Create one</Link>
                </td>
              </tr>
            ) : (
              currentPlans.map((p, i) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{startIndex + i + 1}</td>
                  <td className="py-3 px-4">{p.code}</td>
                  <td className="py-3 px-4">{p.subject}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-sm ${p.status === 'Approved' ? 'bg-green-100 text-green-800' : p.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{p.department?.name ?? '-'}</td>
                  <td className="py-3 px-4">{formatCurrency(getTotal(p))}</td>
                  <td className="py-3 px-4">{getMonthsLabel(p)}</td>
                  <td className="py-3 px-4">
                    <Link href={`/budget-plans/${p.id}`} className="text-blue-600 hover:underline">View</Link>
                    {p.status === 'Draft' && (
                      <>
                        {' | '}
                        <Link href={`/budget-plans/${p.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                        {' | '}
                        <Link href={`/budget-plans/${p.id}/review`} className="text-blue-600 hover:underline">Review</Link>
                      </>
                    )}
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
