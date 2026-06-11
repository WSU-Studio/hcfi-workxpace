'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Import, X, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import BulkImportBadge from '@/components/budget-plan/BulkImportBadge';
import RequestCountBadge from '@/components/budget-plan/RequestCountBadge';
import FiscalYearFilter from '@/components/forms/FiscalYearFilter';
import {
  ALL_FISCAL_YEARS,
  type FiscalYearFilterValue,
  getCurrentFiscalYear,
  serializeFiscalYearParam,
} from '@/lib/fiscal-year';
import { validateXlsxFile } from '@/lib/xlsx-validation';

interface Plan {
  id: string;
  code: string;
  subject: string;
  status: string;
  importedViaBulk?: boolean;
  canEdit?: boolean;
  canReview?: boolean;
  department: { name: string };
  allocations?: { allocation: unknown }[];
  approvalSchemaId?: string;
  budgetRequestCount?: number;
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

interface ImportPreviewRow {
  fiscalYear: number;
  originOffice: string;
  departmentCode: string;
  projectCode: string;
  subject: string;
  description: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  approvalSchemaCode: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Revision', 'Declined'] as const;
const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
  { value: 'subject-asc', label: 'Subject (A-Z)' },
  { value: 'subject-desc', label: 'Subject (Z-A)' },
  { value: 'code-asc', label: 'Code (A-Z)' },
  { value: 'code-desc', label: 'Code (Z-A)' },
  { value: 'total-desc', label: 'Total budget (High-Low)' },
  { value: 'total-asc', label: 'Total budget (Low-High)' },
] as const;

const getPlanTotal = (p: Plan) => {
  if (!p.allocations?.length) return 0;
  return p.allocations.reduce((sum, a) => sum + Number(a.allocation ?? 0), 0);
};

export default function BudgetPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filtered, setFiltered] = useState<Plan[]>([]);
  const [, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('createdAt-desc');
  const [fiscalYearFilter, setFiscalYearFilter] = useState<FiscalYearFilterValue>(() => getCurrentFiscalYear());
  const [availableFiscalYears, setAvailableFiscalYears] = useState<number[]>([]);
  const [planToConfirmEdit, setPlanToConfirmEdit] = useState<Plan | null>(null);

  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPlans = filtered.slice(startIndex, startIndex + itemsPerPage);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');


  const fetchData = async (fy: FiscalYearFilterValue) => {
    const params = new URLSearchParams();
    // Skip the param entirely when "all" is selected so the server returns
    // every accessible plan; otherwise scope to the chosen fiscal year.
    if (fy !== ALL_FISCAL_YEARS) {
      params.set('fiscalYear', serializeFiscalYearParam(fy));
    }
    const query = params.toString();
    const res = await fetch(`/api/budget-plans${query ? `?${query}` : ''}`, {
      credentials: 'include',
    });
    const data = await res.json();
    const list = data.plans || [];
    setPlans(list);
    setFiltered(list);
    setDepartments(data.departments || []);
  };

  useEffect(() => {
    fetch('/api/fiscal-years', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { fiscalYears: [] }))
      .then((data: { fiscalYears?: { year: number }[] }) => {
        setAvailableFiscalYears((data.fiscalYears ?? []).map((row) => row.year));
      })
      .catch(() => setAvailableFiscalYears([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchData(fiscalYearFilter).finally(() => setIsLoading(false));
  }, [fiscalYearFilter]);

  useEffect(() => {
    const kw = searchKeyword.trim().toLowerCase();
    const [sortField, sortDirection] = sortBy.split('-') as [string, 'asc' | 'desc'];
    const sortedAndFiltered = [...plans]
      .filter((p) => {
        const matchesKeyword =
          !kw ||
          p.subject?.toLowerCase().includes(kw) ||
          p.code?.toLowerCase().includes(kw) ||
          p.department?.name?.toLowerCase().includes(kw);
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchesKeyword && matchesStatus;
      })
      .sort((a, b) => {
        let compare = 0;

        if (sortField === 'subject') {
          compare = (a.subject ?? '').localeCompare(b.subject ?? '');
        } else if (sortField === 'code') {
          compare = (a.code ?? '').localeCompare(b.code ?? '');
        } else if (sortField === 'total') {
          compare = getPlanTotal(a) - getPlanTotal(b);
        }

        return sortDirection === 'asc' ? compare : -compare;
      });

    setFiltered(sortedAndFiltered);
    setCurrentPage(1);
  }, [searchKeyword, plans, statusFilter, sortBy]);

  const getTotal = (p: Plan) => {
    return getPlanTotal(p);
  };

  const getMonthsLabel = (p: Plan) => {
    if (!p.allocations?.length) return '-';
    const withAlloc = p.allocations
      .map((a, i) => (Number(a.allocation ?? 0) > 0 ? MONTH_NAMES[i] : null))
      .filter(Boolean) as string[];
    return withAlloc.length === 12 ? 'All Months' : withAlloc.join(', ') || '-';
  };

const numberValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  const cleaned = String(value).replace(/\./g, '').replace(',', '.');
  return Number(cleaned) || 0;
};

const textValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const handlePreviewImportFile = async (file: File) => {
  setImportError('');
  setImportRows([]);
  setImportFileName(file.name);

  const validation = await validateXlsxFile(file);
  if (!validation.valid) {
    setImportError(validation.error);
    return;
  }

  try {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      raw: false,
    } as Parameters<typeof XLSX.utils.sheet_to_json>[1]);

    const mappedRows: ImportPreviewRow[] = rows
      .filter((row) => textValue(row['Subject']))
      .map((row) => ({
        fiscalYear: numberValue(row['Fiscal Year']),
        originOffice: textValue(row['Origin Office']),
        departmentCode: textValue(row['Department Code']),
        projectCode: textValue(row['Project Code']),
        subject: textValue(row['Subject']),
        description: textValue(row['Description']),
        jan: numberValue(row['Jan']),
        feb: numberValue(row['Feb']),
        mar: numberValue(row['Mar']),
        apr: numberValue(row['Apr']),
        may: numberValue(row['May']),
        jun: numberValue(row['Jun']),
        jul: numberValue(row['Jul']),
        aug: numberValue(row['Aug']),
        sep: numberValue(row['Sep']),
        oct: numberValue(row['Oct']),
        nov: numberValue(row['Nov']),
        dec: numberValue(row['Dec']),
        approvalSchemaCode: textValue(row['Approval Schema Code']),
      }));

    if (mappedRows.length === 0) {
      setImportError('No valid data found in Excel file');
      return;
    }

    setImportRows(mappedRows);

    const missingApprovalSchema = mappedRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !row.approvalSchemaCode);
    if (missingApprovalSchema.length > 0) {
      const subjects = missingApprovalSchema
        .slice(0, 3)
        .map(({ row, index }) => row.subject || `row ${index + 1}`)
        .join(', ');
      const more = missingApprovalSchema.length > 3 ? ` (+${missingApprovalSchema.length - 3} more)` : '';
      setImportError(
        `Approval Schema Code is required. Missing on: ${subjects}${more}.`
      );
    }
  } catch {
    setImportError('Failed to read Excel file');
  }
};

const handleImportRows = async () => {
  setImportError('');

  if (importRows.length === 0) {
    setImportError('Please upload and preview Excel file first');
    return;
  }

  if (importRows.some((row) => !row.approvalSchemaCode)) {
    setImportError('Approval Schema Code is required for every row.');
    return;
  }

  setIsImporting(true);

  try {
    const res = await fetch('/api/budget-plans/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rows: importRows }),
    });

    const data = await res.json();

    if (!res.ok) {
      setImportError(data.error ?? 'Failed to import budget plans');
      return;
    }

    setIsImportModalOpen(false);
    setImportRows([]);
    setImportFileName('');
    await fetchData(fiscalYearFilter);
  } catch {
    setImportError('Failed to import budget plans');
  } finally {
    setIsImporting(false);
  }
};


  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Budget Plans</h1>
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
            availableYears={availableFiscalYears}
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
        <div className="flex items-center gap-2">
          <Link
            href="/budget-plans/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </Link>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Import className="w-4 h-4" />
            Import Bulk Budget Plan
          </button>
        </div>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-sm 
                      ${p.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                      p.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      p.status === 'Revision' ? 'bg-amber-100 text-amber-800' :
                      p.status === 'Declined' ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>
                        {p.status}
                      </span>
                      {p.importedViaBulk ? <BulkImportBadge /> : null}
                      {!p.approvalSchemaId ? (
                        <Tooltip content="No approval schema">
                          <span
                            aria-label="No approval schema"
                            className="rounded-lg border border-red-300 bg-red-100 px-2 text-sm font-bold text-red-800"
                          >
                            !
                          </span>
                        </Tooltip>
                      ) : null}
                      <RequestCountBadge count={p.budgetRequestCount ?? 0} />
                      {(p.budgetRequestCount ?? 0) > 0 ? (
                        <Tooltip
                          content={`Locked: ${p.budgetRequestCount} budget request${(p.budgetRequestCount ?? 0) > 1 ? 's' : ''} issued`}
                        >
                          <span
                            aria-label="Locked"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-600"
                          >
                            <Lock className="h-3 w-3" />
                          </span>
                        </Tooltip>
                      ) : null}
                    </div>
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
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        itemNoun="budget plans"
      />
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
    
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Import Bulk Budget Plan</h2>
                <p className="text-sm text-gray-500">
                  Download template, upload Excel file, preview data, then import.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-5 max-h-[calc(90vh-150px)]">
              {importError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {importError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href="/templates/Template_Bulk_Import_Budget_Plan.xlsx"
                  download
                  className="inline-flex w-fit items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download Template
                </a>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="inline-flex w-fit cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Upload XLSX
                    <input
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePreviewImportFile(file);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  <span className="max-w-[280px] truncate text-sm text-gray-500">
                    {importFileName || 'No file selected'}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-gray-300 overflow-x-auto">
                <table className="min-w-[1200px] w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left border-b">#</th>
                      <th className="px-3 py-2 text-left border-b">Fiscal Year</th>
                      <th className="px-3 py-2 text-left border-b">Origin Office</th>
                      <th className="px-3 py-2 text-left border-b">Department Code</th>
                      <th className="px-3 py-2 text-left border-b">Project Code</th>
                      <th className="px-3 py-2 text-left border-b">Subject</th>
                      <th className="px-3 py-2 text-left border-b">Description</th>
                      <th className="px-3 py-2 text-right border-b">Jan</th>
                      <th className="px-3 py-2 text-right border-b">Feb</th>
                      <th className="px-3 py-2 text-right border-b">Mar</th>
                      <th className="px-3 py-2 text-right border-b">Apr</th>
                      <th className="px-3 py-2 text-right border-b">May</th>
                      <th className="px-3 py-2 text-right border-b">Jun</th>
                      <th className="px-3 py-2 text-right border-b">Jul</th>
                      <th className="px-3 py-2 text-right border-b">Aug</th>
                      <th className="px-3 py-2 text-right border-b">Sep</th>
                      <th className="px-3 py-2 text-right border-b">Oct</th>
                      <th className="px-3 py-2 text-right border-b">Nov</th>
                      <th className="px-3 py-2 text-right border-b">Dec</th>
                      <th className="px-3 py-2 text-left border-b">Approval Schema Code</th>
                    </tr>
                  </thead>

                  <tbody>
                    {importRows.length === 0 ? (
                      <tr>
                        <td colSpan={20} className="px-3 py-8 text-center text-gray-500">
                          Upload Excel file to preview data
                        </td>
                      </tr>
                    ) : (
                      importRows.map((row, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2">{row.fiscalYear}</td>
                          <td className="px-3 py-2">{row.originOffice}</td>
                          <td className="px-3 py-2">{row.departmentCode}</td>
                          <td className="px-3 py-2">{row.projectCode}</td>
                          <td className="px-3 py-2">{row.subject}</td>
                          <td className="px-3 py-2">{row.description}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.jan)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.feb)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.mar)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.apr)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.may)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.jun)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.jul)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.aug)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.sep)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.oct)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.nov)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.dec)}</td>
                          <td
                            className={`px-3 py-2 ${
                              row.approvalSchemaCode
                                ? ''
                                : 'bg-red-50 text-red-600 font-medium'
                            }`}
                          >
                            {row.approvalSchemaCode || 'required'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isImporting || importRows.length === 0}
                onClick={handleImportRows}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Import Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
