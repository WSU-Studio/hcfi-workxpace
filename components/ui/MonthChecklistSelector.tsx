'use client';

type MonthChecklistSelectorProps = {
  selectedMonths: number[];
  onChange?: (months: number[]) => void;
  showSelectAll?: boolean;
  selectAllLabel?: string;
  readOnly?: boolean;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function MonthChecklistSelector({
  selectedMonths,
  onChange,
  showSelectAll = false,
  selectAllLabel = 'select all',
  readOnly = false,
}: MonthChecklistSelectorProps) {
  const normalizedSelectedMonths = [...new Set(selectedMonths)].sort((a, b) => a - b);
  const isAllSelected = ALL_MONTHS.every((month) => normalizedSelectedMonths.includes(month));

  const toggleMonth = (month: number) => {
    if (readOnly || !onChange) return;
    if (normalizedSelectedMonths.includes(month)) {
      onChange(normalizedSelectedMonths.filter((currentMonth) => currentMonth !== month));
      return;
    }

    onChange([...normalizedSelectedMonths, month].sort((a, b) => a - b));
  };

  const toggleSelectAll = () => {
    if (readOnly || !onChange) return;
    onChange(isAllSelected ? [] : ALL_MONTHS);
  };

  const labelClassName = `inline-flex items-center gap-2 select-none ${
    readOnly ? 'cursor-default' : 'cursor-pointer'
  }`;

  return (
    <div className="flex flex-wrap gap-3">
      {showSelectAll && (
        <label className={labelClassName}>
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            disabled={readOnly}
            className="h-4 w-4 rounded border-gray-400 text-blue-600 accent-blue-600 focus:ring-blue-500 disabled:cursor-default"
          />
          <span className="text-sm font-medium">{selectAllLabel}</span>
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        {MONTH_NAMES.map((name, index) => {
          const month = index + 1;
          const isChecked = normalizedSelectedMonths.includes(month);
          return (
            <label key={name} className={labelClassName}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleMonth(month)}
                disabled={readOnly}
                className="h-4 w-4 rounded border-gray-400 text-blue-600 accent-blue-600 focus:ring-blue-500 disabled:cursor-default"
              />
              <span
                className={`text-sm ${
                  readOnly && !isChecked ? 'text-slate-400' : ''
                }`}
              >
                {name}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
