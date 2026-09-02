'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import ButtonLink from '@/components/ui/ButtonLink';
import ApprovalSchemaDepartmentSelect from '@/components/forms/ApprovalSchemaDepartmentSelect';
import ApprovalSchemaLevelFields, {
  emptyApprovalSchemaLevel,
  type ApprovalSchemaLevelDraft,
} from '@/components/forms/ApprovalSchemaLevelFields';
import { parseSchemaDepartmentId, toSchemaDepartmentFormValue } from '@/lib/approval-schema';

interface Department {
  id: string;
  name: string;
}

interface Role {
  id: string;
  roleName: string;
}

export default function EditApprovalSchemaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'BudgetPlan',
    period: 'Unlimited',
    departmentId: '',
  });
  const [levels, setLevels] = useState<ApprovalSchemaLevelDraft[]>([emptyApprovalSchemaLevel()]);
  const [errors, setErrors] = useState<{ code?: string; name?: string; type?: string; period?: string; departmentId?: string; levels?: string; general?: string }>({});

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace-management/approval-schema/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.schema;
        if (s) {
          setFormData({
            code: s.code ?? '',
            name: s.name,
            type: s.type,
            period: s.period || 'Unlimited',
            departmentId: toSchemaDepartmentFormValue(s.departmentId),
          });
          setLevels(
            (s.approvalLevels || []).map(
              (l: {
                levelType: string;
                roleId: string;
                pics?: Array<{ user?: { id: string; name: string; employeeId?: string } | null }>;
              }) => ({
                levelType: l.levelType,
                roleId: l.roleId,
                picUserIds: (l.pics ?? [])
                  .map((pic) => pic.user?.id)
                  .filter((id): id is string => Boolean(id)),
                picUsers: (l.pics ?? [])
                  .map((pic) => pic.user)
                  .filter((user): user is { id: string; name: string; employeeId?: string } =>
                    Boolean(user?.id && user?.name),
                  ),
              }),
            ),
          );
          if (!s.approvalLevels?.length) setLevels([emptyApprovalSchemaLevel()]);
        }
        setDepartments(data.departments || []);
        setRoles(data.roles || []);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!formData.code.trim()) {
      setErrors((p) => ({ ...p, code: 'Code is required' }));
      return;
    }
    const parsedDepartment = parseSchemaDepartmentId(formData.departmentId);
    if (!parsedDepartment.ok) {
      setErrors((p) => ({ ...p, departmentId: parsedDepartment.error }));
      return;
    }
    if (levels.some((l) => !l.roleId)) {
      setErrors((p) => ({ ...p, levels: 'Select job position for each level' }));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspace-management/approval-schema/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          departmentId: parsedDepartment.departmentId,
          levels: levels.map((level) => ({
            levelType: level.levelType,
            roleId: level.roleId,
            picUserIds: level.picUserIds,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors((p) => ({ ...p, general: typeof data?.error === 'string' ? data.error : 'Failed' }));
        return;
      }
      router.push('/workspace-management/approval-schema');
    } catch {
      setErrors((p) => ({ ...p, general: 'Failed' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit Approval Schema</h1>
      <p className="text-sm text-gray-600">
        Changes apply to new documents only. Existing Budget Plans, Budget Requests, and Payment
        Requests keep the schema snapshot captured when they were saved.
      </p>
      {errors.general && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{errors.general}</div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-1.5 font-medium">
              Code <span className="text-red-500">*</span>
            </label>
            <Input
              name="code"
              value={formData.code}
              onChange={(e) =>
                setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))
              }
              placeholder="BP-PRIMARY"
              maxLength={64}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Short, unique identifier (letters, digits, dash, underscore, dot). Used by the
              Budget Plan bulk-import template — changing this will break old import templates
              that referenced the previous code.
            </p>
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Name <span className="text-red-500">*</span></label>
            <Input
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Type</label>
            <Select
              name="type"
              value={formData.type}
              onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="BudgetPlan">Budget Plan</option>
              <option value="BudgetRequest">Budget Request</option>
              <option value="PaymentRequest">Payment Request</option>
            </Select>
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
          </div>
          <div>
            <label className="block mb-1.5 font-medium">Period</label>
            <Select
              name="period"
              value={formData.period}
              onChange={(e) => setFormData((p) => ({ ...p, period: e.target.value }))}
            >
              <option value="Unlimited">Unlimited</option>
            </Select>
            {errors.period && <p className="mt-1 text-sm text-red-600">{errors.period}</p>}
          </div>
          <ApprovalSchemaDepartmentSelect
            value={formData.departmentId}
            departments={departments}
            onChange={(departmentId) => setFormData((p) => ({ ...p, departmentId }))}
            error={errors.departmentId}
          />
          <ApprovalSchemaLevelFields
            levels={levels}
            roles={roles}
            onChange={setLevels}
            error={errors.levels}
            allowRemoveLast={false}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <ButtonLink href="/workspace-management/approval-schema" variant="outline">
              <X className="w-4 h-4" />
              Cancel
            </ButtonLink>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
