import { NextResponse } from 'next/server';
import {
  fetchConfinsMockPayments,
  type ConfinsMockFetchOptions,
} from '@/lib/integrations/confins-mock/build-mock-payments';
import type { ConfinsMockListMeta } from '@/lib/integrations/confins-mock/types';

export const dynamic = 'force-dynamic';

/**
 * Mock Confins: daftar cash disbursement.
 * Query: fiscalYear, month, ebudgetRequestId, departmentId, includeEdgeCases (default true).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const opts: ConfinsMockFetchOptions = {};

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

    const requestId = searchParams.get('ebudgetRequestId');
    if (requestId) opts.ebudgetRequestId = requestId;

    const deptId = searchParams.get('departmentId');
    if (deptId) opts.departmentId = deptId;

    if (searchParams.get('includeEdgeCases') === 'false') {
      opts.includeEdgeCases = false;
    }

    const { payments, usedLocalApprovedRequests } = await fetchConfinsMockPayments(opts);

    const meta: ConfinsMockListMeta = {
      lastSyncedAt: new Date().toISOString(),
      recordCount: payments.length,
      usedLocalApprovedRequests,
    };

    return NextResponse.json({ payments, meta });
  } catch (e) {
    console.error('mock confins payments:', e);
    return NextResponse.json({ error: 'Failed to load mock Confins payments' }, { status: 500 });
  }
}
