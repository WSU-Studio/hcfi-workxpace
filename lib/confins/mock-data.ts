import budgetRealFixture from '@/lib/integrations/confins/fixtures/budget-real-egl-sample.json';
import { CONFINS_BUDGET_REAL_PATH } from '@/lib/integrations/confins/v103-budget-real';

const BUDGET_REAL_PATH_SUFFIX = 'GetListGetListBudgetRealBySourceTypeX';

/**
 * Resolusi sumber data mock untuk endpoint Budget Real (Confins / E-GL).
 *
 * Urutan resolusi:
 *  1. JSON yang user simpan di Application Settings (`confinsMockBudgetRealJson`).
 *     - Boleh berupa array murni atau envelope `{ ReturnObject: [...] }` (sesuai
 *       contoh response Postman dari Hyundai). Jika valid, langsung dipakai.
 *  2. Fallback ke fixture bundled `budget-real-egl-sample.json`.
 *
 * Validasi minimal: harus array of objects. Selain itu kita biarkan lewat agar
 * user bebas eksperimen dengan field yang dia mau.
 */
const extractArrayFromJson = (raw: string): unknown[] | null => {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { ReturnObject?: unknown }).ReturnObject)
    ) {
      return (parsed as { ReturnObject: unknown[] }).ReturnObject;
    }
    return null;
  } catch {
    return null;
  }
};

const resolveBudgetRealMockData = async (): Promise<unknown[]> => {
  try {
    const { getApplicationSettings } = await import('@/lib/app-settings');
    const settings = await getApplicationSettings();
    const fromSettings = extractArrayFromJson(settings.confinsMockBudgetRealJson);
    if (fromSettings && fromSettings.length > 0) return fromSettings;
  } catch {
    // Settings DB belum tersedia (mis. saat build) → pakai fixture saja.
  }
  return budgetRealFixture as unknown[];
};

type ConfinsDepartment = {
  BizUnitCode: string;
  BizUnitName: string;
  IsActive: boolean;
};

type ConfinsOffice = {
  OfficeCode: string;
  OfficeName: string;
  OfficeAddr?: string | null;
  MrOfficeTypeCode?: string | null;
  IsActive: boolean;
};

const MOCK_DEPARTMENTS: ConfinsDepartment[] = [
  { BizUnitCode: 'ACT', BizUnitName: 'ACCOUNTING & TAX', IsActive: true },
  { BizUnitCode: 'IT', BizUnitName: 'IT & INFO SEC', IsActive: true },
  { BizUnitCode: 'HR_GA', BizUnitName: 'HR & GA', IsActive: true },
  { BizUnitCode: 'SLS', BizUnitName: 'SALES', IsActive: true },
  { BizUnitCode: 'NOP', BizUnitName: 'NATIONAL OP PLANNING & SUPPORT', IsActive: true },
];

const MOCK_OFFICES: ConfinsOffice[] = [
  {
    OfficeCode: '99',
    OfficeName: 'HEAD OFFICE',
    OfficeAddr: 'SEQUIS LIFE SCBD DISTRICT 8',
    MrOfficeTypeCode: 'HO',
    IsActive: true,
  },
  {
    OfficeCode: '11',
    OfficeName: 'DKI JAKARTA',
    OfficeAddr: 'RUKO PLAZA PONDOK INDAH',
    MrOfficeTypeCode: 'BRANCH',
    IsActive: true,
  },
  {
    OfficeCode: '12',
    OfficeName: 'TANGERANG',
    OfficeAddr: 'RUKO NORTHRIDGE BUSINESS CENTER',
    MrOfficeTypeCode: 'BRANCH',
    IsActive: true,
  },
  {
    OfficeCode: '21',
    OfficeName: 'BANDUNG',
    OfficeAddr: 'RUKO BKR NO. 21B',
    MrOfficeTypeCode: 'BRANCH',
    IsActive: true,
  },
  {
    OfficeCode: '31',
    OfficeName: 'SURABAYA',
    OfficeAddr: 'RUKO MERR BOULEVARD',
    MrOfficeTypeCode: 'BRANCH',
    IsActive: true,
  },
];

export async function getConfinsMockData(path: string): Promise<unknown[]> {
  if (
    path === '/v1/RefBizUnitX/GetListRefBizUnitByIsActiveX' ||
    path === '/v1/IntegrationEBudgetingX/GetListRefBizUnitByIsActiveX'
  ) {
    return MOCK_DEPARTMENTS;
  }

  if (
    path === '/v1/RefOfficeX/GetListRefOfficeByIsActiveX' ||
    path === '/v1/IntegrationEBudgetingX/GetListRefOfficeByIsActiveX'
  ) {
    return MOCK_OFFICES;
  }

  if (path === CONFINS_BUDGET_REAL_PATH || path.endsWith(BUDGET_REAL_PATH_SUFFIX)) {
    return resolveBudgetRealMockData();
  }

  return [];
}

/**
 * Helper buat UI Settings: kembalikan isi fixture default (Hyundai sample)
 * sebagai string pretty-printed. Dipakai untuk tombol "Reset to default".
 */
export function getBundledBudgetRealFixtureJson(): string {
  return JSON.stringify(budgetRealFixture, null, 2);
}
