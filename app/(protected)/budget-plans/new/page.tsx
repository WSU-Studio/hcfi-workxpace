'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ButtonLink from '@/components/ui/ButtonLink';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import RichTextEditor from '@/components/ui/RichTextEditor';
import MonthChecklistSelector from '@/components/ui/MonthChecklistSelector';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DESCRIPTION_MAX_BYTES = 200 * 1024;

export default function NewBudgetPlanPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fiscalYears, setFiscalYears] = useState<{ year: number }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [approvalSchemas, setApprovalSchemas] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  const [originOffices, setOriginOffices] = useState<{ code: string; name: string; isActive: boolean }[]>([]);
  
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [formData, setFormData] = useState({
    fiscalYear: new Date().getFullYear(),
    originOffice: '',
    departmentId: '',
    projectId: '',
    subject: '',
    description: '',
    approvalSchemaId: '',
  });
  const [allocations, setAllocations] = useState<Record<number, number>>(
    Object.fromEntries([...Array(12)].map((_, i) => [i + 1, 0]))
  );
  const [selectedMonths, setSelectedMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [baseAmount, setBaseAmount] = useState<string>('');
  const [error, setError] = useState('');

  const selectedMonthsSorted = [...selectedMonths].sort((a, b) => a - b);
  const totalAlloc = selectedMonthsSorted.reduce((sum, m) => sum + (allocations[m] || 0), 0);

  const parseBaseAmount = (s: string) => {
    const cleaned = s.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const copyToAll = () => {
    if (selectedMonthsSorted.length === 0) return;
    const val = parseBaseAmount(baseAmount);
    const next = { ...allocations };
    selectedMonthsSorted.forEach((m) => (next[m] = val));
    setAllocations(next);
  };

  const splitEvenly = () => {
    if (selectedMonthsSorted.length === 0) return;
    const total = parseBaseAmount(baseAmount) || totalAlloc;
    if (!total) return;
    const each = Math.round((total / selectedMonthsSorted.length) * 100) / 100;
    const next = { ...allocations };
    selectedMonthsSorted.forEach((m) => (next[m] = each));
    setAllocations(next);
  };

  const formatDisplay = (n: number) => n.toLocaleString('id-ID');

  useEffect(() => {
    fetch('/api/budget-plans/options')
      .then((r) => r.json())
      .then((data) => {
        setFiscalYears(data.fiscalYears || []);
        setDepartments(data.departments || []);
        setProjects(data.projects || []);
        setApprovalSchemas(data.approvalSchemas || []);
        setOriginOffices(data.originOffices || []);
        if (data.fiscalYears?.[0]) setFormData((p) => ({ ...p, fiscalYear: data.fiscalYears[0].year }));
        if (data.departments?.[0]) setFormData((p) => ({ ...p, departmentId: data.departments[0].id }));
        if (data.projects?.[0]) setFormData((p) => ({ ...p, projectId: data.projects[0].id }));
        if (data.originOffices?.length) {
          const activeFirst = data.originOffices.find((office: { isActive: boolean }) => office.isActive) || data.originOffices[0];
          setFormData((p) => ({ ...p, originOffice: activeFirst.code }));
        } else {
          setFormData((p) => ({ ...p, originOffice: 'HQ' }));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const schemasForDept = approvalSchemas.filter((s) => s.departmentId === formData.departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.departmentId || !formData.subject) {
      setError('Fill required fields');
      return;
    }
    if (!formData.approvalSchemaId) {
      setError(
        schemasForDept.length === 0
          ? 'No approval schema is configured for the selected department. Set one up before submitting.'
          : 'Select an approval schema before submitting'
      );
      return;
    }
    if (selectedMonthsSorted.length === 0) {
      setError('Select at least one month for allocation');
      return;
    }
    const descriptionSize = new TextEncoder().encode(formData.description || '').length;
    if (descriptionSize > DESCRIPTION_MAX_BYTES) {
      setError('Description is too large. Maximum 200KB.');
      return;
    }
    setIsSubmitting(true);
    try {
      let supportingDocs: string[] = [];
      if (attachmentFiles.length > 0) {
        setIsUploadingAttachments(true);
        const uploadFormData = new FormData();
        attachmentFiles.forEach((file) => uploadFormData.append('files', file));

        const uploadRes = await fetch('/api/budget-plans/upload-supporting-docs', {
          method: 'POST',
          body: uploadFormData,
        });

        const uploadBody = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadBody.error ?? 'Failed to upload supporting documents');
          return;
        }

        supportingDocs = (uploadBody.files ?? []).map((item: { url: string }) => item.url);
      }

      const res = await fetch('/api/budget-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          supportingDocs,
          allocations: selectedMonthsSorted.map((month) => ({
            month,
            allocation: allocations[month] ?? 0,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed');
        return;
      }
      router.push('/budget-plans');
    } catch {
      setError('Failed');
    } finally {
      setIsUploadingAttachments(false);
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Budget Plan</h1>
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
                  <option key={fy.year} value={fy.year}>{fy.year}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block mb-1.5 font-medium">Origin Office *</label>
              {originOffices.length > 0 ? (
                <Select
                  value={formData.originOffice}
                  onChange={(e) => setFormData((p) => ({ ...p, originOffice: e.target.value }))}
                  required
                >
                  <option value="">-</option>
                  {originOffices.map((office) => (
                    <option key={office.code} value={office.code}>
                      {office.code} - {office.name}
                      {office.isActive ? '' : ' (Inactive)'}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type="text"
                  value={formData.originOffice}
                  onChange={(e) =>
                    setFormData((previous) => ({
                      ...previous,
                      originOffice: e.target.value,
                    }))
                  }
                  placeholder="HQ"
                  required
                />
              )}
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
                  <option key={d.id} value={d.id}>{d.name}</option>
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
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
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
            <RichTextEditor
              value={formData.description}
              onChange={(description) => setFormData((p) => ({ ...p, description }))}
              placeholder="Describe budget plan details..."
              maxContentBytes={DESCRIPTION_MAX_BYTES}
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Supporting Documents</label>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer transition w-fit">
                Upload Documents
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))}
                />
              </label>

              <span className="text-sm text-gray-500 max-w-[300px] truncate">
                {attachmentFiles.length > 0
                  ? `${attachmentFiles.length} file selected`
                  : 'No file selected'}
              </span>
            </div>
            {attachmentFiles.length > 0 && (
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <ul className="space-y-1 text-sm text-gray-700">
                  {attachmentFiles.map((file) => (
                    <li key={`${file.name}-${file.lastModified}`} className="truncate">
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium mb-3">Monthly Allocation</h3>

            <div className="mb-4">
              <MonthChecklistSelector selectedMonths={selectedMonths} onChange={setSelectedMonths} showSelectAll />
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
              <button type="button" onClick={copyToAll} className="px-3 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-50">
                copy to all
              </button>
              <button type="button" onClick={splitEvenly} className="px-3 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-50">
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
            <label className="block mb-1.5 font-medium">Approval Schema *</label>
            <Select
              value={formData.approvalSchemaId}
              onChange={(e) => setFormData((p) => ({ ...p, approvalSchemaId: e.target.value }))}
              required
              aria-invalid={!formData.approvalSchemaId}
            >
              <option value="">-</option>
              {schemasForDept.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {formData.departmentId && schemasForDept.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-600">
                No approval schema is configured for the selected department.
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <ButtonLink href="/budget-plans" variant="outline">
              <X className="w-4 h-4" />
              Cancel
            </ButtonLink>
            <button type="submit" disabled={isSubmitting || isUploadingAttachments} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
              {isUploadingAttachments ? 'Uploading documents...' : isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
