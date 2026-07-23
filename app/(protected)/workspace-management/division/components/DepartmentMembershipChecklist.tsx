'use client';

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  divisionId?: string | null;
  isActive?: boolean;
}

interface DepartmentMembershipChecklistProps {
  departments: DepartmentOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Current division id — departments already in another division are still selectable (reassign). */
  currentDivisionId?: string;
}

/**
 * Multi-select checklist for mapping Departments into a Division.
 * Inactive departments are not offered for new selection (already-selected inactive stay visible).
 */
export default function DepartmentMembershipChecklist({
  departments,
  selectedIds,
  onChange,
  currentDivisionId,
}: DepartmentMembershipChecklistProps) {
  const selected = new Set(selectedIds);
  const visibleDepartments = departments.filter(
    (department) => department.isActive !== false || selected.has(department.id)
  );

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  if (visibleDepartments.length === 0) {
    return <p className="text-sm text-gray-500">No active departments available.</p>;
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
      {visibleDepartments.map((department) => {
        const inactive = department.isActive === false;
        const assignedElsewhere =
          Boolean(department.divisionId) &&
          department.divisionId !== currentDivisionId &&
          !selected.has(department.id);
        return (
          <label
            key={department.id}
            className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={selected.has(department.id)}
              onChange={() => toggle(department.id)}
            />
            <span className="min-w-0">
              <span className="font-medium text-gray-900">
                {department.code} — {department.name}
                {inactive ? ' (inactive)' : ''}
              </span>
              {assignedElsewhere ? (
                <span className="mt-0.5 block text-xs text-amber-700">
                  Currently in another division (selecting will reassign)
                </span>
              ) : null}
              {inactive ? (
                <span className="mt-0.5 block text-xs text-amber-700">
                  Inactive — uncheck to remove; cannot newly assign inactive departments
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
