import type { DashboardView } from '@/types/access-control';

export type DashboardNamedAmount = {
  label: string;
  actual: number;
  plan?: number;
  budget?: number;
};

export type DashboardMonthlyPoint = {
  month: number;
  label: string;
  budget: number;
  plan: number;
  actual: number;
};

export type DashboardDepartmentPoint = {
  departmentId: string;
  departmentName: string;
  budget: number;
  plan: number;
  actual: number;
  utilizationPercent: number | null;
  outstandingGrCount: number;
  outstandingGrAmount: number;
  pendingPrCount: number;
  pendingPrAmount: number;
};

export type DashboardHeatmapCell = {
  departmentName: string;
  month: number;
  utilizationPercent: number | null;
};

export type DashboardParetoPoint = {
  label: string;
  actual: number;
  contributionPercent: number;
  cumulativePercent: number;
};

export type DashboardCostDriverPoint = {
  label: string;
  volume: number;
  actual: number;
  costPerUnit: number | null;
};

export type DashboardAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
};

export type DashboardTransaction = {
  id: string;
  date: string | null;
  departmentName: string | null;
  vendorName: string | null;
  description: string | null;
  budgetRequestCode: string;
  glAccount: string | null;
  amount: number;
  matchType: string | null;
};

export type DashboardKpis = {
  totalBudget: number;
  planYtd: number;
  actualYtd: number;
  remainingBudget: number;
  budgetUtilizationPercent: number | null;
  planAchievementPercent: number | null;
  planVariance: number;
  budgetVariance: number;
  outstandingGrCount: number;
  outstandingGrAmount: number;
  paymentRequestsPaid: number;
  pendingPrCount: number;
  pendingPrAmount: number;
  monthlyRunRate: number | null;
  fyForecastRecommended: number;
  fyForecastRunRate: number | null;
  forecastVsBudget: number;
  burnRatePercent: number | null;
  momVariance: number;
  momVariancePercent: number | null;
  topVendorConcentrationPercent: number | null;
};

export type DashboardFilterOptions = {
  departments: Array<{ id: string; code: string; name: string }>;
  categories: string[];
  vendors: string[];
  activities: string[];
  projects: Array<{ code: string; name: string }>;
  expenseTypes: string[];
};

export type DashboardSummaryResponse = {
  persona: DashboardView;
  viewAllDepartments: boolean;
  scopedToDepartmentId: string | null;
  fiscalYear: number;
  quarter: number | null;
  month: number | null;
  cutOffMonth: number;
  kpis: DashboardKpis;
  monthly: DashboardMonthlyPoint[];
  byCategory: DashboardNamedAmount[];
  byVendor: DashboardNamedAmount[];
  byActivity: DashboardNamedAmount[];
  byExpenseTypeMonth: Array<{ month: number; label: string; slices: DashboardNamedAmount[] }>;
  byDepartment: DashboardDepartmentPoint[];
  heatmap: DashboardHeatmapCell[];
  byGlAccount: DashboardNamedAmount[];
  paretoVendors: DashboardParetoPoint[];
  costDrivers: DashboardCostDriverPoint[];
  alerts: DashboardAlert[];
  transactions: DashboardTransaction[];
  filterOptions: DashboardFilterOptions;
};
