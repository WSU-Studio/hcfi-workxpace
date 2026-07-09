import { NextResponse } from 'next/server';
import {
  fetchReconciliationPayments,
  type ReconciliationPaymentsFetchOptions,
} from '@/lib/integrations/confins/fetch-reconciliation-payments';

export const dynamic = 'force-dynamic';

/**
 * Confins E-Budgeting 1.03 — budget realization / payment lines untuk rekonsiliasi.
 * Query: fiscalYear, month (filter tampilan by RequestDate), departmentId,
 * sourceType (optional — default tarik CONFINS + EGL), fromYear (default 2005).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const opts: ReconciliationPaymentsFetchOptions = {};

    const fy = searchParams.get('fiscalYear');
    if (fy != null && fy !== '') {
      const n = parseInt(fy, 10);
      if (!Number.isNaN(n)) opts.fiscalYear = n;
    }

    const mo = searchParams.get('month');
    if (mo != null && mo !== '') {
      const n = parseInt(mo, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 12) opts.month = n;
    }

    const deptId = searchParams.get('departmentId');
    if (deptId) opts.departmentId = deptId;

    const sourceType = searchParams.get('sourceType');
    if (sourceType) opts.sourceType = sourceType;

    const fromYear = searchParams.get('fromYear');
    if (fromYear != null && fromYear !== '') {
      const n = parseInt(fromYear, 10);
      if (!Number.isNaN(n)) opts.fromYear = n;
    }

    if (searchParams.get('includeEdgeCases') === 'false') {
      opts.includeEdgeCases = false;
    }

    const { payments, meta } = await fetchReconciliationPayments(opts);

    return NextResponse.json({ payments, meta });
  } catch (e) {
    console.error('confins reconciliation payments:', e);
    const message = e instanceof Error ? e.message : 'Failed to load Confins payments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
