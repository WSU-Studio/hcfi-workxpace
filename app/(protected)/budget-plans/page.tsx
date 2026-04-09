'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';

interface Plan {
  id: string;
  code: string;
  subject: string;
  status: string;
  canEdit?: boolean;
  canReview?: boolean;
  department: { name: string };
  allocations?: { allocation: unknown }[];
}

interface EditWarningModalProps {
  isOpen: boolean;
  planSubject?: string;
  onCancel: () => void;
  onContinue: () => void;
}

const EditWarningModal = ({ isOpen, planSubject, onCancel, onContinue }: EditWarningModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Do you want to edit budget plan?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The status of the budget plan
          {planSubject ? <span className="font-medium text-slate-800"> &quot;{planSubject}&quot;</span> : ''} will be reverted to
          the initial status and needs to go through the approval process again.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 cursor-pointer"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BudgetPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filtered, setFiltered] = useState<Plan[]>([]);
  const [, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [planToConfirmEdit, setPlanToConfirmEdit] = useState<Plan | null>(null);

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPlans = filtered.slice(startIndex, startIndex + itemsPerPage);

  const fetchData = async () => {
    const res = await fetch('/api/budget-plans', { credentials: 'include' });
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
        <SearchInput 
          placeholder="Search..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
        <Link
          href="/budget-plans/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Plan
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
              <TableHead>Total Budget</TableHead>
              <TableHead>Month(s)</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentPlans.length === 0 ? (
              <TableEmptyRow colSpan={8}>
                No budget plans. <Link href="/budget-plans/new" className="text-blue-600 hover:underline">Create one</Link>
              </TableEmptyRow>
            ) : (
              currentPlans.map((p, i) => (
                <TableBodyRow key={p.id}>
                  <TableCell>{startIndex + i + 1}</TableCell>
                  <TableCell>{p.code}</TableCell>
                  <TableCell>{p.subject}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-sm 
                      ${p.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                      p.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      p.status === 'Revision' ? 'bg-amber-100 text-amber-800' :
                      p.status === 'Declined' ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell>{p.department?.name ?? '-'}</TableCell>
                  <TableCell>{formatCurrency(getTotal(p))}</TableCell>
                  <TableCell>{getMonthsLabel(p)}</TableCell>
                  <TableCell>
                    <Link href={`/budget-plans/${p.id}`} className="text-blue-600 hover:underline">View</Link>
                    {p.canEdit ? (
                      <>
                        {' | '}
                        {p.status === 'Approved' ? (
                          <button
                            type="button"
                            onClick={() => setPlanToConfirmEdit(p)}
                            className="text-blue-600 hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        ) : (
                          <Link href={`/budget-plans/${p.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                        )}
                      </>
                    ) : null}
                    {p.canReview ? (
                      <>
                        {' | '}
                        <Link href={`/budget-plans/${p.id}/review`} className="text-blue-600 hover:underline">
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
        isOpen={Boolean(planToConfirmEdit)}
        planSubject={planToConfirmEdit?.subject}
        onCancel={() => setPlanToConfirmEdit(null)}
        onContinue={() => {
          if (!planToConfirmEdit) return;
          const planId = planToConfirmEdit.id;
          setPlanToConfirmEdit(null);
          router.push(`/budget-plans/${planId}/edit`);
        }}
      />
    </div>
  );
}
