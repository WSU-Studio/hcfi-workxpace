'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import ButtonLink from '@/components/ui/ButtonLink';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EditBudgetPlanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fiscalYears, setFiscalYears] = useState<{ year: number }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [approvalSchemas, setApprovalSchemas] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  const [formData, setFormData] = useState({
    fiscalYear: 0,
    originOffice: '',
    departmentId: '',
    projectId: '',
    subject: '',
    description: '',
    approvalSchemaId: '',
  });
  const [allocations, setAllocations] = useState<Record<number, number>>(
    () => Object.fromEntries([...Array(12)].map((_, i) => [i + 1, 0]))
  );
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
  const [baseAmount, setBaseAmount] = useState<string>('');
  const [error, setError] = useState('');
  const [histories, setHistories] = useState<{
    id: string;
    action: string;
    details: { status?: string; declineReason?: string | null } | null;
    timestamp: string;
    user: { name: string };
  }[]>([]);

  const selectedMonthsSorted = [...selectedMonths].sort((a, b) => a - b);
  const totalAlloc = selectedMonthsSorted.reduce((sum, m) => sum + (allocations[m] || 0), 0);

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMonths.size === 12) setSelectedMonths(new Set());
    else setSelectedMonths(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
  };

  const parseBaseAmount = (s: string) => {
    const cleaned = s.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const copyToAll = () => {
    if (selectedMonthsSorted.length === 0) return;
    const val = parseBaseAmount(baseAmount);
    const next = { ...allocations };
    selectedMonthsSorted.forEach((m) => {
      next[m] = val;
    });
    setAllocations(next);
  };

  const splitEvenly = () => {
    if (selectedMonthsSorted.length === 0) return;
    const total = parseBaseAmount(baseAmount) || totalAlloc;
    if (!total) return;
    const each = Math.round((total / selectedMonthsSorted.length) * 100) / 100;
    const next = { ...allocations };
    selectedMonthsSorted.forEach((m) => {
      next[m] = each;
    });
    setAllocations(next);
  };

  const formatDisplay = (n: number) => n.toLocaleString('id-ID');
  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/budget-plans/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const p = data.plan;
        if (p) {
          setFormData({
            fiscalYear: p.fiscalYear,
            originOffice: p.originOffice || '',
            departmentId: p.departmentId,
            projectId: p.projectId || '',
            subject: p.subject,
            description: p.description || '',
            approvalSchemaId: p.approvalSchemaId || '',
          });
          const allocs: Record<number, number> = Object.fromEntries([...Array(12)].map((_, i) => [i + 1, 0]));
          const withValue = new Set<number>();
          (p.allocations || []).forEach((a: { month: number; allocation: unknown }) => {
            const v = Number(a.allocation ?? 0);
            allocs[a.month] = v;
            if (v > 0) withValue.add(a.month);
          });
          setAllocations(allocs);
          setSelectedMonths(withValue.size > 0 ? withValue : new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
        }
        setFiscalYears(data.fiscalYears || []);
        setDepartments(data.departments || []);
        setProjects(data.projects || []);
        setApprovalSchemas(data.approvalSchemas || []);
        setHistories(data.histories || []);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const schemasForDept = approvalSchemas.filter((s) => s.departmentId === formData.departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (selectedMonthsSorted.length === 0) {
      setError('Select at least one month for allocation');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budget-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          allocations: selectedMonthsSorted.map((month) => ({
            month,
            allocation: allocations[month] ?? 0,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body?.error === 'string' ? body.error : 'Failed');
        return;
      }
      router.push(`/budget-plans/${id}`);
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Budget Plan</h1>
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block mb-1.5 font-medium">Fiscal Year *</label>
              <Select
                value={formData.fiscalYear}
                onChange={(e) => setFormData((p) => ({ ...p, fiscalYear: Number(e.target.value) }))}
                required
              >
                {fiscalYears.map((fy) => (
                  <option key={fy.year} value={fy.year}>
                    {fy.year}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 font-medium">Origin Office</label>
              <Input
                type="text"
                value={formData.originOffice}
                onChange={(e) => setFormData((p) => ({ ...p, originOffice: e.target.value }))}
                placeholder="HQ"
              />
            </div>
            <div>
              <label className="block mb-1.5 font-medium">Department *</label>
              <Select
                value={formData.departmentId}
                onChange={(e) => setFormData((p) => ({ ...p, departmentId: e.target.value }))}
                required
              >
                <option value="">-</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 font-medium">Project</label>
              <Select
                value={formData.projectId}
                onChange={(e) => setFormData((p) => ({ ...p, projectId: e.target.value }))}
              >
                <option value="">-</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.code} - {proj.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Subject *</label>
            <Input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Monthly Printer Rental"
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={4}
            />
          </div>

          <div>
            <h3 className="font-medium mb-3">Monthly Allocation</h3>

            <div className="flex items-center gap-4 mb-3">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedMonths.size === 12}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">select all</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {MONTH_NAMES.map((name, i) => {
                  const month = i + 1;
                  return (
                    <label key={name} className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedMonths.has(month)}
                        onChange={() => toggleMonth(month)}
                        className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium shrink-0">Base Amount</label>
              <Input
                type="text"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                placeholder="18.000.000"
                className="max-w-[200px]"
              />
              <button
                type="button"
                onClick={copyToAll}
                className="px-3 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-50"
              >
                copy to all
              </button>
              <button
                type="button"
                onClick={splitEvenly}
                className="px-3 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-50"
              >
                split evenly
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-300">
              <Table>
                <thead>
                  <TableHeaderRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Allocation</TableHead>
                  </TableHeaderRow>
                </thead>
                <tbody>
                  {selectedMonthsSorted.length === 0 ? (
                    <TableEmptyRow colSpan={3}>Select at least one month</TableEmptyRow>
                  ) : (
                    selectedMonthsSorted.map((month, idx) => (
                      <TableBodyRow key={month}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{MONTH_NAMES[month - 1]}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={allocations[month] ?? 0}
                            onChange={(e) =>
                              setAllocations((p) => ({ ...p, [month]: parseFloat(e.target.value) || 0 }))
                            }
                            className="max-w-[180px]"
                          />
                        </TableCell>
                      </TableBodyRow>
                    ))
                  )}
                </tbody>
                {selectedMonthsSorted.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-400 bg-gray-50">
                      <td className="px-4 py-3 font-medium" colSpan={2}>
                        Total
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatDisplay(totalAlloc)}</td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 font-medium">Approval Schema</label>
            <Select
              value={formData.approvalSchemaId}
              onChange={(e) => setFormData((p) => ({ ...p, approvalSchemaId: e.target.value }))}
            >
              <option value="">-</option>
              {schemasForDept.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <ButtonLink href={`/budget-plans/${id}`} variant="outline">
              <X className="w-4 h-4" />
              Cancel
            </ButtonLink>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Card>

      <Card className="p-6"
        collapsible
        header={<h3 className="font-medium">Activity History</h3>}
      >
        {histories.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {histories.map((history) => (
              <div key={history.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <p>
                  <span className="font-medium">{history.user?.name || 'Unknown User'}</span>{' '}
                  <span className="text-gray-700">{history.action.toLowerCase()}</span>{' '}
                  <span className="text-gray-500">on {formatDateTime(history.timestamp)}</span>
                </p>
                {history.details?.status ? (
                  <p className="text-gray-600">Status: {history.details.status}</p>
                ) : null}
                {history.details?.declineReason ? (
                  <p className="text-red-700">Reason: {history.details.declineReason}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
