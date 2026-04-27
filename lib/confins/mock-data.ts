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

export function getConfinsMockData(path: string): unknown[] {
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

  return [];
}
