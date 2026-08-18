'use client';

import Select from '@/components/ui/Select';
import {
  ALL_DEPARTMENTS_LABEL,
  ALL_DEPARTMENTS_VALUE,
} from '@/lib/approval-schema';

export interface ApprovalSchemaDepartmentOption {
  id: string;
  name: string;
}

export interface ApprovalSchemaDepartmentSelectProps {
  value: string;
  departments: ApprovalSchemaDepartmentOption[];
  onChange: (departmentId: string) => void;
  error?: string;
  name?: string;
}

/**
 * Department picker on Approval Schema create/edit.
 * Includes "All Department" so one schema can be reused across BP/BR/PR
 * regardless of the document's department.
 */
export default function ApprovalSchemaDepartmentSelect({
  value,
  departments,
  onChange,
  error,
  name = 'departmentId',
}: ApprovalSchemaDepartmentSelectProps) {
  return (
    <div>
      <label className="mb-1.5 block font-medium">
        Department <span className="text-red-500">*</span>
      </label>
      <Select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        <option value="">-</option>
        <option value={ALL_DEPARTMENTS_VALUE}>{ALL_DEPARTMENTS_LABEL}</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </Select>
      <p className="mt-1 text-xs text-gray-500">
        {ALL_DEPARTMENTS_LABEL} makes this schema available when creating a Budget
        Plan, Budget Request, or Payment Request for any department.
      </p>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
