'use client';

const MONTH_OPTIONS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

type MonthAllocationSelectorProps = {
  selectedMonths: number[];
  onChange: (months: number[]) => void;
};

export default function MonthAllocationSelector({ selectedMonths, onChange }: MonthAllocationSelectorProps) {
  const handleToggle = (month: number) => {
    if (selectedMonths.includes(month)) {
      onChange(selectedMonths.filter((m) => m !== month));
      return;
    }
    onChange([...selectedMonths, month].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {MONTH_OPTIONS.map((month) => {
          const isActive = selectedMonths.includes(month.value);
          return (
            <button
              key={month.value}
              type="button"
              onClick={() => handleToggle(month.value)}
              className={[
                'rounded-lg border px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700',
              ].join(' ')}
            >
              {month.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">Pilih satu atau lebih bulan untuk mencatat realisasi request terhadap budget plan.</p>
    </div>
  );
}
