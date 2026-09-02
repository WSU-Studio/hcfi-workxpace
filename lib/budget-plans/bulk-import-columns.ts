export const BUDGET_PLAN_IMPORT_HEADERS = [
  'Fiscal Year',
  'Origin Office',
  'Department Code',
  'Project Code',
  'Subject',
  'Description',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Approval Schema Code',
] as const;

export type BudgetPlanImportHeader = (typeof BUDGET_PLAN_IMPORT_HEADERS)[number];
