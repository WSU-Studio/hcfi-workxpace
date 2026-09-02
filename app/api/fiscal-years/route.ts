import { NextResponse } from 'next/server';
import { fiscalYearSelectOptions } from '@/lib/fiscal-year';

export const dynamic = 'force-dynamic';

/**
 * Lightweight list of selectable fiscal years for filter dropdowns.
 *
 * Years are computed (current + next) rather than read from the FiscalYear
 * master, so N+1 is always available and older seeded years never leak into
 * pickers. Separated from `/api/budget-plans/options` so list pages can
 * populate the FY dropdown without loading departments/projects/schemas.
 */
export async function GET() {
  try {
    return NextResponse.json({ fiscalYears: fiscalYearSelectOptions() });
  } catch (error) {
    console.error('[GET /api/fiscal-years]', error);
    return NextResponse.json({ error: 'Failed to load fiscal years' }, { status: 500 });
  }
}
