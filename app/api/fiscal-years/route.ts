import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Lightweight list of active fiscal years for filter dropdowns.
 *
 * Separated from `/api/budget-plans/options` (which loads heavy data:
 * departments, projects, schemas, classification, origin offices, …) so list
 * pages can populate the FY dropdown without paying that price.
 */
export async function GET() {
  try {
    const fiscalYears = await prisma.fiscalYear.findMany({
      where: { isActive: true },
      orderBy: { year: 'desc' },
      select: { year: true },
    });

    return NextResponse.json({ fiscalYears });
  } catch (error) {
    console.error('[GET /api/fiscal-years]', error);
    return NextResponse.json({ error: 'Failed to load fiscal years' }, { status: 500 });
  }
}
