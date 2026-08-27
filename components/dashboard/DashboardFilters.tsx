'use client';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import SegmentedControl from '@/components/ui/SegmentedControl';
import type { DashboardFilterOptions } from '@/types/dashboard';
import { BookMarkedIcon, RefreshCcwIcon } from 'lucide-react';

export type DashboardFilterState = {
  fiscalYear: string;
  quarter: string;
  month: string;
  departmentId: string;
  expenseCategory: string;
  vendorName: string;
  activity: string;
  projectCode: string;
  expenseType: string;
};

type DashboardFiltersProps = {
  value: DashboardFilterState;
  years: number[];
  options: DashboardFilterOptions;
  viewAllDepartments: boolean;
  showDimensionFilters: boolean;
  onChange: (next: DashboardFilterState) => void;
  onApply: () => void;
  onReset: () => void;
};

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const QUARTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: '1', label: 'Q1' },
  { value: '2', label: 'Q2' },
  { value: '3', label: 'Q3' },
  { value: '4', label: 'Q4' },
] as const;

export default function DashboardFilters({
  value,
  years,
  options,
  viewAllDepartments,
  showDimensionFilters,
  onChange,
  onApply,
  onReset,
}: DashboardFiltersProps) {
  const set = (key: keyof DashboardFilterState, next: string) => onChange({ ...value, [key]: next });

  return (
    <div className="space-y-3 border-b border-gray-200 pb-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-gray-500">Year</span>
          <Select value={value.fiscalYear} onChange={(event) => set('fiscalYear', event.target.value)}>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                FY {year}
              </option>
            ))}
          </Select>
        </label>
        <div className="space-y-1 text-sm">
          <span className="text-xs font-medium text-gray-500">Quarter</span>
          <SegmentedControl
            ariaLabel="Filter by quarter"
            value={value.quarter}
            options={QUARTER_OPTIONS}
            onChange={(quarter) => set('quarter', quarter)}
          />
        </div>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-gray-500">Month</span>
          <Select value={value.month} onChange={(event) => set('month', event.target.value)}>
            <option value="">Through cut-off</option>
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </Select>
        </label>
        {viewAllDepartments ? (
          <div className="space-y-1 text-sm">
            <span className="text-xs font-medium text-gray-500">Department</span>
            <SearchableSelect
              value={value.departmentId}
              onChange={(next) => set('departmentId', next)}
              placeholder="All departments"
              searchPlaceholder="Search department..."
              emptyMessage="No departments"
              options={[
                { value: '', label: 'All departments', searchText: 'all departments' },
                ...options.departments.map((dept) => ({
                  value: dept.id,
                  label: `${dept.code} — ${dept.name}`,
                  searchText: `${dept.code} ${dept.name}`,
                })),
              ]}
            />
          </div>
        ) : null}
        {showDimensionFilters ? (
          <>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-gray-500">Expense category</span>
              <Select value={value.expenseCategory} onChange={(event) => set('expenseCategory', event.target.value)}>
                <option value="">All categories</option>
                {options.categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-gray-500">Expense type</span>
              <Select value={value.expenseType} onChange={(event) => set('expenseType', event.target.value)}>
                <option value="">All types</option>
                {options.expenseTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </label>
            <div className="space-y-1 text-sm">
              <span className="text-xs font-medium text-gray-500">Vendor</span>
              <SearchableSelect
                value={value.vendorName}
                onChange={(next) => set('vendorName', next)}
                placeholder="All vendors"
                searchPlaceholder="Search vendor..."
                emptyMessage="No vendors"
                options={[
                  { value: '', label: 'All vendors', searchText: 'all vendors' },
                  ...options.vendors.map((item) => ({
                    value: item,
                    label: item,
                    searchText: item,
                  })),
                ]}
              />
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-xs font-medium text-gray-500">Activity</span>
              <SearchableSelect
                value={value.activity}
                onChange={(next) => set('activity', next)}
                placeholder="All activities"
                searchPlaceholder="Search activity..."
                emptyMessage="No activities"
                options={[
                  { value: '', label: 'All activities', searchText: 'all activities' },
                  ...options.activities.map((item) => ({
                    value: item,
                    label: item,
                    searchText: item,
                  })),
                ]}
              />
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-xs font-medium text-gray-500">Project</span>
              <SearchableSelect
                value={value.projectCode}
                onChange={(next) => set('projectCode', next)}
                placeholder="All projects"
                searchPlaceholder="Search project..."
                emptyMessage="No projects"
                options={[
                  { value: '', label: 'All projects', searchText: 'all projects' },
                  ...options.projects.map((item) => ({
                    value: item.code,
                    label: `${item.code} — ${item.name}`,
                    searchText: `${item.code} ${item.name}`,
                  })),
                ]}
              />
            </div>
          </>
        ) : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onReset}>
          <RefreshCcwIcon className="w-4 h-4" />
          Reset
        </Button>
        <Button type="button" onClick={onApply}>
          <BookMarkedIcon className="w-4 h-4" />
          Apply filters
        </Button>
      </div>
    </div>
  );
}
