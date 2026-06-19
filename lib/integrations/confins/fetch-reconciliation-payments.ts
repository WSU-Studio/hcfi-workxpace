import { ConfinsClient, isConfinsMockEnabled } from '@/lib/confins/client';
import { prisma } from '@/lib/prisma';
import type { ConfinsCashDisbursement } from '@/lib/integrations/confins-mock/types';
import type { ConfinsMockListMeta } from '@/lib/integrations/confins-mock/types';
import {
  CONFINS_BUDGET_REAL_PATH,
  departmentNameMatchesPayment,
  filterDebitBudgetRealRows,
  mapBudgetRealRowsToPayments,
  paymentMatchesRequestMonth,
  type ConfinsBudgetRealApiRow,
} from '@/lib/integrations/confins/v103-budget-real';

export type ReconciliationPaymentsFetchOptions = {
  fiscalYear?: number;
  month?: number;
  departmentId?: string;
  sourceType?: string;
  fromYear?: number;
  /**
   * @deprecated Edge-case injection sudah dimatikan permanen di pipeline
   * rekonsiliasi. User punya kontrol penuh via "Reconciliation Mock Data"
   * di Settings. Param ini disimpan untuk backward compatibility caller —
   * tapi tidak punya efek apa-apa.
   */
  includeEdgeCases?: boolean;
};

export type ReconciliationPaymentsResult = {
  payments: ConfinsCashDisbursement[];
  meta: ConfinsMockListMeta & {
    apiPath: string;
    /** Jumlah baris dari API sebelum filter RequestDate. */
    rawRowCount: number;
    /** Jumlah baris setelah filter RequestDate (+ department). */
    filteredRowCount: number;
    /** Selalu 0 — edge-case injection sudah dimatikan. */
    edgeCaseCount: number;
    confinsMockEnabled: boolean;
    dataSource: 'confins-api' | 'confins-mock-fixture' | 'local-mock';
  };
};

async function resolveDepartmentName(departmentId?: string): Promise<string | undefined> {
  if (!departmentId) return undefined;
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { name: true },
  });
  return dept?.name ?? undefined;
}

export async function fetchReconciliationPayments(
  options: ReconciliationPaymentsFetchOptions = {}
): Promise<ReconciliationPaymentsResult> {
  const now = new Date();
  const toYear = options.fiscalYear ?? now.getFullYear();
  const filterMonth = options.month ?? now.getMonth() + 1;
  const fromYear = options.fromYear ?? 2005;
  /** Confins `toMonth` = batas periode posting. Tarik full year lalu filter RequestDate di app. */
  const apiToMonth = 12;
  const sourceType = options.sourceType ?? 'EGL';
  const departmentName = await resolveDepartmentName(options.departmentId);
  const confinsMockEnabled = await isConfinsMockEnabled();

  const client = new ConfinsClient();
  const apiRows = await client.post<ConfinsBudgetRealApiRow>({
    path: CONFINS_BUDGET_REAL_PATH,
    body: {
      sourceType,
      toMonth: apiToMonth,
      toYear,
      fromMonth: null,
      fromYear,
      formCode: null,
      coa: null,
    },
  });

  const rawRowCount = apiRows.length;
  const rawRows = filterDebitBudgetRealRows(apiRows);

  let payments = mapBudgetRealRowsToPayments(rawRows);

  if (options.month != null) {
    payments = payments.filter((p) => paymentMatchesRequestMonth(p, toYear, filterMonth));
  }

  if (departmentName) {
    payments = payments.filter((p) => departmentNameMatchesPayment(p, departmentName));
  }

  const filteredRowCount = payments.length;

  // Catatan: edge-case statis (`BR/IT/00X` dkk) sebelumnya di-inject saat
  // mock aktif & hasil filter kosong. Dimatikan permanen karena user sudah
  // bisa kontrol penuh isi mock via Settings → "Reconciliation Mock Data".
  // Bila perlu skenario QA, paste baris yang relevan ke JSON settings.
  const edgeCaseCount = 0;

  return {
    payments,
    meta: {
      lastSyncedAt: now.toISOString(),
      recordCount: payments.length,
      usedLocalApprovedRequests: false,
      simulatedApiModel: 'API CONFINS For E-Budgeting 1.03',
      apiPath: CONFINS_BUDGET_REAL_PATH,
      rawRowCount,
      filteredRowCount,
      edgeCaseCount,
      confinsMockEnabled,
      dataSource:
        rawRowCount === 0
          ? 'local-mock'
          : confinsMockEnabled
            ? 'confins-mock-fixture'
            : 'confins-api',
    },
  };
}
