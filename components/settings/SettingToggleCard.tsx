'use client';

type SettingToggleCardProps = {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

export default function SettingToggleCard({
  title,
  description,
  enabled,
  onChange,
  disabled = false,
}: SettingToggleCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <label className="inline-flex items-center gap-3 self-start">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onChange(event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span className="text-sm font-medium text-gray-700">{enabled ? 'Active' : 'Inactive'}</span>
        </label>
      </div>
    </section>
  );
}
