'use client';

import { Lock } from 'lucide-react';
import Select from '@/components/ui/Select';

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

export interface DepartmentSelectFieldProps {
  /** Currently selected departmentId. */
  value: string;
  /** Full list of departments fetched from the API. */
  departments: DepartmentOption[];
  /**
   * The department of the currently logged-in user. Used as the locked default
   * when the user lacks `createForOtherDepartment` permission.
   */
  userDepartmentId: string | null | undefined;
  /**
   * Whether the user is allowed to create the document for departments other
   * than their own. Driven by `ActivityAccess.createForOtherDepartment`.
   */
  canCrossDepartment: boolean;
  /** Notifies the parent of department changes. */
  onChange: (departmentId: string) => void;
  /**
   * If true, the field is forced to read-only because another upstream field
   * (e.g. selected Budget Plan / Budget Request) already pinned the
   * department. Independent from the cross-department permission gate.
   */
  forcedReadonly?: boolean;
  /** Visual label, defaults to "Department *". */
  label?: string;
  /** Field is required for form validation. */
  required?: boolean;
}

/**
 * Renders the Department picker on Create BP/BR/PR pages.
 *
 * Behaviour:
 * - Without `createForOtherDepartment` permission → renders a locked field
 *   showing the user's own department name.
 * - With permission → renders a normal `<Select>` of all departments.
 * - `forcedReadonly` (e.g. a BP/BR is already chosen and pinned the dept)
 *   takes precedence and locks the field regardless of permission.
 *
 * Single responsibility: gate Department editability based on permission +
 * upstream constraint. Reusable across BP / BR / PR new pages (DRY).
 */
export default function DepartmentSelectField({
  value,
  departments,
  userDepartmentId,
  canCrossDepartment,
  onChange,
  forcedReadonly = false,
  label = 'Department *',
  required = true,
}: DepartmentSelectFieldProps) {
  const selectedDepartment =
    departments.find((department) => department.id === value) ?? null;

  const userDepartment =
    departments.find((department) => department.id === userDepartmentId) ?? null;

  const isLockedToOwnDepartment = !canCrossDepartment;
  const isReadonly = isLockedToOwnDepartment || forcedReadonly;

  // When the user is locked to their own department but the form value drifts
  // (e.g. options endpoint default, or a stale state), surface the user's own
  // department label instead of empty/whitespace. Server still re-validates.
  const displayDepartment = isLockedToOwnDepartment
    ? userDepartment ?? selectedDepartment
    : selectedDepartment;

  return (
    <div>
      <label className="block mb-1.5 font-medium">{label}</label>

      {isLockedToOwnDepartment ? (
        <div
          className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-gray-700"
          role="textbox"
          aria-readonly="true"
          title="You can only create for your own department. Ask an admin to grant the 'Create for Other Departments' permission to enable cross-department creation."
        >
          <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate">
            {displayDepartment?.name ?? '— Department not assigned —'}
          </span>
        </div>
      ) : (
        <Select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          readonly={forcedReadonly}
        >
          <option value="">-</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
