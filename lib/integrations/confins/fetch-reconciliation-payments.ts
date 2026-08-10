import { ConfinsClient, isConfinsMockEnabled } from '@/lib/confins/client';
import { prisma } from '@/lib/prisma';
import type { ConfinsCashDisbursement } from '@/lib/integrations/confins-mock/types';
import type { ConfinsMockListMeta } from '@/lib/integrations/confins-mock/types';
import {
  CONFINS_BUDGET_REAL_PATH,
  departmentNameMatchesPayment,
  filterReconciliationBudgetRealRows,
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

/** Payment Request (99PYREQ…) ada di CONFINS; jurnal manual di EGL. Rekonsiliasi tarik keduanya. */
const DEFAULT_RECONCILIATION_SOURCE_TYPES = ['CONFINS', 'EGL'] as const;

/** EGL payload bisa multi-MB; 30s default client sering timeout. */
const BUDGET_REAL_TIMEOUT_MS = 120_000;

export type ReconciliationPaymentsResult = {
  payments: ConfinsCashDisbursement[];
  meta: ConfinsMockListMeta & {
    apiPath: string;
    /** Jumlah baris dari API (semua sourceType) sebelum filter DC. */
    rawRowCount: number;
    /** Jumlah baris setelah filter DC (debit + ORV credit). */
    eligibleRowCount: number;
    /** Jumlah baris setelah filter RequestDate (+ department). */
    filteredRowCount: number;
    /** SourceType yang dipakai saat fetch (comma-separated). */
    sourceTypes: string;
    /** Raw row count per sourceType (setelah hit API, sebelum filter DC). */
    sourceTypeCounts: Record<string, number>;
    /** Error per sourceType bila salah satu hit gagal (yang lain tetap dipakai). */
    sourceTypeErrors: Record<string, string>;
    /** Selalu 0 — edge-case injection sudah dimatikan. */
    edgeCaseCount: number;
    confinsMockEnabled: boolean;
    dataSource: 'confins-api' | 'confins-mock-fixture' | 'local-mock';
  };
};

function resolveReconciliationSourceTypes(options: ReconciliationPaymentsFetchOptions): string[] {
  if (options.sourceType?.trim()) {
    return [options.sourceType.trim()];
  }
  const fromEnv = process.env.CONFINS_RECONCILIATION_SOURCE_TYPES?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv?.length) return fromEnv;
  return [...DEFAULT_RECONCILIATION_SOURCE_TYPES];
}

type BudgetRealFetchChunk = {
  sourceType: string;
  rows: ConfinsBudgetRealApiRow[];
  error?: string;
};

async function fetchBudgetRealRows(
  client: ConfinsClient,
  sourceTypes: string[],
  bodyBase: Omit<Record<string, unknown>, 'sourceType'>,
  confinsMockEnabled: boolean
): Promise<{ rows: ConfinsBudgetRealApiRow[]; counts: Record<string, number>; errors: Record<string, string> }> {
  // Mock fixture tidak membedakan sourceType — satu fetch cukup agar tidak duplikat.
  if (confinsMockEnabled && sourceTypes.length > 1) {
    const rows = await client.post<ConfinsBudgetRealApiRow>({
      path: CONFINS_BUDGET_REAL_PATH,
      body: { ...bodyBase, sourceType: sourceTypes[0] },
    });
    const counts: Record<string, number> = {};
    for (const st of sourceTypes) counts[st] = st === sourceTypes[0] ? rows.length : 0;
    return { rows, counts, errors: {} };
  }

  const chunks: BudgetRealFetchChunk[] = await Promise.all(
    sourceTypes.map(async (sourceType) => {
      try {
        const rows = await client.post<ConfinsBudgetRealApiRow>({
          path: CONFINS_BUDGET_REAL_PATH,
          body: { ...bodyBase, sourceType },
          timeoutMs: BUDGET_REAL_TIMEOUT_MS,
          // Jangan ganti EGL yang gagal dengan fixture CONFINS — biarkan error terlihat.
          allowMockFallback: false,
        });
        return { sourceType, rows };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.error(`reconciliation budget-real sourceType=${sourceType}:`, message);
        return { sourceType, rows: [] as ConfinsBudgetRealApiRow[], error: message };
      }
    })
  );

  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};
  const rows: ConfinsBudgetRealApiRow[] = [];

  for (const chunk of chunks) {
    counts[chunk.sourceType] = chunk.rows.length;
    if (chunk.error) errors[chunk.sourceType] = chunk.error;
    rows.push(...chunk.rows);
  }

  if (rows.length === 0 && Object.keys(errors).length === sourceTypes.length) {
    const detail = Object.entries(errors)
      .map(([st, msg]) => `${st}: ${msg}`)
      .join(' | ');
    throw new Error(`All Confins sourceType fetches failed (${detail})`);
  }

  return { rows, counts, errors };
}

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
  const sourceTypes = resolveReconciliationSourceTypes(options);
  const departmentName = await resolveDepartmentName(options.departmentId);
  const confinsMockEnabled = await isConfinsMockEnabled();

  const client = new ConfinsClient();
  const { rows: apiRows, counts: sourceTypeCounts, errors: sourceTypeErrors } = await fetchBudgetRealRows(
    client,
    sourceTypes,
    {
      toMonth: apiToMonth,
      toYear,
      fromMonth: null,
      fromYear,
      formCode: null,
      coa: null,
    },
    confinsMockEnabled
  );

  const rawRowCount = apiRows.length;
  const rawRows = filterReconciliationBudgetRealRows(apiRows);
  const eligibleRowCount = rawRows.length;

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
      eligibleRowCount,
      filteredRowCount,
      sourceTypes: sourceTypes.join(','),
      sourceTypeCounts,
      sourceTypeErrors,
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
