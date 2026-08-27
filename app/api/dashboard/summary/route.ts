import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import {
  buildDashboardDepartmentScope,
  canViewDashboard,
  resolveDashboardView,
} from '@/lib/access/dashboard';
import { buildDashboardSummary } from '@/lib/dashboard/aggregate';
import { getCurrentFiscalYear } from '@/lib/fiscal-year';

export const dynamic = 'force-dynamic';

function parseOptionalInt(raw: string | null, min: number, max: number): number | null {
  if (raw == null || raw === '') return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canViewDashboard(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fyRaw = parseOptionalInt(searchParams.get('fiscalYear'), 1900, 2100);
    const fiscalYear = fyRaw ?? getCurrentFiscalYear();
    const quarter = parseOptionalInt(searchParams.get('quarter'), 1, 4);
    const month = parseOptionalInt(searchParams.get('month'), 1, 12);
    const requestedDepartmentId = searchParams.get('departmentId')?.trim() || null;

    const rls = buildDashboardDepartmentScope(session);
    const scopedDepartmentId = rls?.departmentId ?? null;
    const viewAllDepartments = scopedDepartmentId === null;

    const summary = await buildDashboardSummary({
      prisma,
      persona: resolveDashboardView(session),
      viewAllDepartments,
      scopedDepartmentId,
      query: {
        fiscalYear,
        quarter,
        month,
        departmentId: viewAllDepartments ? requestedDepartmentId : null,
        expenseCategory: searchParams.get('expenseCategory')?.trim() || null,
        vendorName: searchParams.get('vendorName')?.trim() || null,
        activity: searchParams.get('activity')?.trim() || null,
        projectCode: searchParams.get('projectCode')?.trim() || null,
        expenseType: searchParams.get('expenseType')?.trim() || null,
      },
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('dashboard summary:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
