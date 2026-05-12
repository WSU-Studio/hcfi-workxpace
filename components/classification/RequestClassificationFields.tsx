'use client';

import Select from '@/components/ui/Select';
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Cost Center</label>
          <Select
            value={value.costCenterId}
            disabled={readOnly}
            onChange={(e) => setField('costCenterId', e.target.value)}
          >
            <option value="">-</option>
            {costCenterOptions.map((costCenter) => (
              <option key={costCenter.id} value={costCenter.id}>
                {costCenter.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Category</label>
          <Select
            value={value.categoryId}
            disabled={readOnly}
            onChange={(e) => setField('categoryId', e.target.value)}
          >
            <option value="">-</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Category Key Index</label>
          <Select
            value={value.categoryKeyIndexId}
            disabled={readOnly}
            onChange={(e) => setField('categoryKeyIndexId', e.target.value)}
          >
            <option value="">-</option>
            {categoryKeyIndexOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Kode Akun</label>
          <Select value={value.coaId} disabled={readOnly} onChange={(e) => setField('coaId', e.target.value)}>
            <option value="">-</option>
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountCode} - {account.accountName}
              </option>
            ))}
          </Select>
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
            <Select
              value={value.opexAllocationId}
              disabled={readOnly}
              onChange={(e) => setField('opexAllocationId', e.target.value)}
            >
              <option value="">-</option>
              {opexAllocationOptions.map((allocation) => (
                <option key={allocation.id} value={allocation.id}>
                  {allocation.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
