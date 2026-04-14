import type { ConfinsCashDisbursement } from '@/lib/integrations/confins-mock/types';

export type ReconciliationMatchType = 'auto' | 'manual' | 'unmatched';

export interface ReconciliationPlanOption {
  id: string;
  code: string;
  subject: string;
  fiscalYear: number;
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  coaId: string | null;
  expectedAmount: number;
}

export interface ReconciliationRow {
  payment: ConfinsCashDisbursement;
  matchedPlan: ReconciliationPlanOption | null;
  expectedAmount: number;
  paidAmount: number;
  variance: number;
  matchType: ReconciliationMatchType;
}
