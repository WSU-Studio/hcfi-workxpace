'use client';

import { DASHBOARD_VIEW_OPTIONS, type DashboardView } from '@/types/access-control';
import Select from '@/components/ui/Select';

type DashboardAccessSectionProps = {
  dashboardView: DashboardView;
  viewAllDepartments: boolean;
  onViewChange: (view: DashboardView) => void;
  onViewAllChange: (value: boolean) => void;
};

export default function DashboardAccessSection({
  dashboardView,
  viewAllDepartments,
  onViewChange,
  onViewAllChange,
}: DashboardAccessSectionProps) {
  const selected = DASHBOARD_VIEW_OPTIONS.find((option) => option.value === dashboardView);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Dashboard Access</h2>
        <p className="mt-1 text-sm text-gray-500">
          Persona is assigned per user and locked at runtime. Widget composition is not configurable.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Dashboard view</span>
          <Select
            value={dashboardView}
            onChange={(event) => onViewChange(event.target.value as DashboardView)}
            aria-label="Dashboard view"
          >
            {DASHBOARD_VIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {selected && <p className="text-xs text-gray-500">{selected.description}</p>}
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-700 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={viewAllDepartments}
            onChange={(event) => onViewAllChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="font-medium text-gray-900">View all departments on dashboard</span>
            <span className="mt-0.5 block text-xs text-gray-500">
              When off, dashboard figures are limited to the user&apos;s assigned department.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
