import type { ConfinsCashDisbursement } from '@/lib/integrations/confins-mock/types';

export type ReconciliationMatchType = 'auto' | 'manual' | 'unmatched';

export interface ReconciliationRequestOption {
  id: string;
  code: string;
  subject: string;
  fiscalYear: number;
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  budgetPlanCode: string | null;
  coa: string | null;
  expectedAmount: number;
}

export interface ReconciliationRow {
  payment: ConfinsCashDisbursement;
  matchedRequest: ReconciliationRequestOption | null;
  expectedAmount: number;
  paidAmount: number;
  variance: number;
  matchType: ReconciliationMatchType;
}
