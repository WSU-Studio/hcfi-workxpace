'use client';

import Select from '@/components/ui/Select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import type { ClassificationOption, AccountOption } from '@/lib/classification-options';
import type { RequestClassificationValue } from '@/lib/request-classification';

export type RequestClassificationFieldsProps = {
  value: RequestClassificationValue;
  onChange?: (value: RequestClassificationValue) => void;
  categoryOptions: ClassificationOption[];
  categoryKeyIndexOptions: ClassificationOption[];
  costCenterOptions: ClassificationOption[];
  opexAllocationOptions: ClassificationOption[];
  accountOptions: AccountOption[];
  readOnly?: boolean;
};

function toNamedOptions(rows: ClassificationOption[]) {
  return [
    { value: '', label: '-' },
    ...rows.map((row) => ({ value: row.id, label: row.name })),
  ];
}

export default function RequestClassificationFields({
  value,
  onChange,
  categoryOptions,
  categoryKeyIndexOptions,
  costCenterOptions,
  opexAllocationOptions,
  accountOptions,
  readOnly = false,
}: RequestClassificationFieldsProps) {
  const setField = <K extends keyof RequestClassificationValue>(field: K, next: RequestClassificationValue[K]) => {
    if (readOnly || !onChange) return;
    onChange({ ...value, [field]: next });
  };

  const costCenterSelectOptions = toNamedOptions(costCenterOptions);
  const categorySelectOptions = toNamedOptions(categoryOptions);
  const categoryKeyIndexSelectOptions = toNamedOptions(categoryKeyIndexOptions);
  const opexAllocationSelectOptions = toNamedOptions(opexAllocationOptions);
  const accountSelectOptions = [
    { value: '', label: '-' },
    ...accountOptions.map((account) => ({
      value: account.id,
      label: `${account.accountCode} - ${account.accountName}`,
      searchText: `${account.accountCode} ${account.accountName}`,
    })),
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Cost Center</label>
          <SearchableSelect
            value={value.costCenterId}
            options={costCenterSelectOptions}
            disabled={readOnly}
            onChange={(next) => setField('costCenterId', next)}
            placeholder="-"
            searchPlaceholder="Search cost center..."
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Category</label>
          <SearchableSelect
            value={value.categoryId}
            options={categorySelectOptions}
            disabled={readOnly}
            onChange={(next) => setField('categoryId', next)}
            placeholder="-"
            searchPlaceholder="Search category..."
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Category Key Index</label>
          <SearchableSelect
            value={value.categoryKeyIndexId}
            options={categoryKeyIndexSelectOptions}
            disabled={readOnly}
            onChange={(next) => setField('categoryKeyIndexId', next)}
            placeholder="-"
            searchPlaceholder="Search category key index..."
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Kode Akun</label>
          <SearchableSelect
            value={value.coaId}
            options={accountSelectOptions}
            disabled={readOnly}
            onChange={(next) => setField('coaId', next)}
            placeholder="-"
            searchPlaceholder="Search kode akun..."
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <Select
            value={value.opexType}
            disabled={readOnly}
            onChange={(e) =>
              onChange?.({
                ...value,
                opexType: e.target.value,
                opexAllocationId: e.target.value === 'OPEX' ? value.opexAllocationId : '',
              })
            }
          >
            <option value="OPEX">OPEX</option>
            <option value="CAPEX">CAPEX</option>
          </Select>
        </div>
        {value.opexType === 'OPEX' ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Opex Allocation</label>
            <SearchableSelect
              value={value.opexAllocationId}
              options={opexAllocationSelectOptions}
              disabled={readOnly}
              onChange={(next) => setField('opexAllocationId', next)}
              placeholder="-"
              searchPlaceholder="Search opex allocation..."
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
