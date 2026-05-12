export type RequestClassificationValue = {
  costCenterId: string;
  categoryId: string;
  categoryKeyIndexId: string;
  coaId: string;
  opexType: string;
  opexAllocationId: string;
};

export const emptyRequestClassification = (): RequestClassificationValue => ({
  costCenterId: '',
  categoryId: '',
  categoryKeyIndexId: '',
  coaId: '',
  opexType: 'OPEX',
  opexAllocationId: '',
});

export type StoredRequestClassification = {
  category?: string | null;
  categoryKeyIndex?: string | null;
  costCenter?: string | null;
  coa?: string | null;
  type?: string | null;
  opexAllocation?: string | null;
  opexType?: string | null;
};

export function classificationFromStored(row: StoredRequestClassification): RequestClassificationValue {
  return {
    costCenterId: row.costCenter ?? '',
    categoryId: row.category ?? '',
    categoryKeyIndexId: row.categoryKeyIndex ?? '',
    coaId: row.coa ?? '',
    opexType: row.opexType || row.type || 'OPEX',
    opexAllocationId: row.opexAllocation ?? '',
  };
}

export function classificationToStored(value: RequestClassificationValue): StoredRequestClassification {
  const opexType = value.opexType?.trim() || 'OPEX';
  return {
    category: value.categoryId?.trim() || null,
    categoryKeyIndex: value.categoryKeyIndexId?.trim() || null,
    costCenter: value.costCenterId?.trim() || null,
    coa: value.coaId?.trim() || null,
    type: opexType,
    opexType,
    opexAllocation: opexType === 'OPEX' ? value.opexAllocationId?.trim() || null : null,
  };
}

export function parseClassificationBody(body: Record<string, unknown>): RequestClassificationValue {
  const readId = (key: string) => (typeof body[key] === 'string' ? body[key].trim() : '');
  const opexType = readId('opexType') || 'OPEX';
  return {
    costCenterId: readId('costCenterId') || readId('costCenter'),
    categoryId: readId('categoryId') || readId('category'),
    categoryKeyIndexId: readId('categoryKeyIndexId') || readId('categoryKeyIndex'),
    coaId: readId('coaId') || readId('coa'),
    opexType,
    opexAllocationId: opexType === 'OPEX' ? readId('opexAllocationId') || readId('opexAllocation') : '',
  };
}

export function mergeStoredClassification(
  primary: StoredRequestClassification,
  fallback?: StoredRequestClassification | null
): StoredRequestClassification {
  const pick = (a?: string | null, b?: string | null) => {
    const first = typeof a === 'string' ? a.trim() : '';
    if (first) return first;
    const second = typeof b === 'string' ? b.trim() : '';
    return second || null;
  };
  const opexType = pick(primary.opexType ?? primary.type, fallback?.opexType ?? fallback?.type) || 'OPEX';
  return {
    category: pick(primary.category, fallback?.category),
    categoryKeyIndex: pick(primary.categoryKeyIndex, fallback?.categoryKeyIndex),
    costCenter: pick(primary.costCenter, fallback?.costCenter),
    coa: pick(primary.coa, fallback?.coa),
    type: opexType,
    opexType,
    opexAllocation: opexType === 'OPEX' ? pick(primary.opexAllocation, fallback?.opexAllocation) : null,
  };
}
