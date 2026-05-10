import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { MenuAccess } from '@/types/access-control';
import {
  buildRealizationResponse,
  type AggregatablePlan,
} from '@/lib/budget-realization/aggregate';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

const parseIntSafe = (raw: string | null, fallback: number): number => {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const menuAccess = session.user.access?.menuAccess as MenuAccess | undefined;
    if (!menuAccess?.reports) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fy = searchParams.get('fiscalYear');
    const departmentId = searchParams.get('departmentId') ?? '';
    const status = searchParams.get('status') ?? '';
    const onlyWithRequest = searchParams.get('onlyWithRequest') === '1';
    const limit = Math.max(1, Math.min(MAX_LIMIT, parseIntSafe(searchParams.get('limit'), DEFAULT_LIMIT)));

    const where: Prisma.BudgetPlanWhereInput = {};
    if (fy && fy !== '') {
      const year = parseInt(fy, 10);
      if (Number.isFinite(year)) where.fiscalYear = year;
    }
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (onlyWithRequest) where.budgetRequests = { some: {} };

    const plans = await prisma.budgetPlan.findMany({
      where,
      orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        code: true,
        subject: true,
        fiscalYear: true,
        status: true,
        department: { select: { name: true } },
        allocations: { select: { allocation: true } },
        budgetRequests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            code: true,
            subject: true,
            status: true,
            requestDate: true,
            grandTotal: true,
            requestorId: true,
          },
        },
      },
    });

    const requestorIds = Array.from(
      new Set(
        plans
          .flatMap((p) => p.budgetRequests.map((r) => r.requestorId))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const requestors = requestorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: requestorIds } },
          select: { id: true, name: true },
        })
      : [];
    const requestorNameById = new Map(requestors.map((u) => [u.id, u.name]));

    const aggregatable: AggregatablePlan[] = plans.map((p) => ({
      id: p.id,
      code: p.code,
      subject: p.subject,
      fiscalYear: p.fiscalYear,
      status: p.status,
      department: p.department,
      allocations: p.allocations,
      budgetRequests: p.budgetRequests.map((r) => ({
        id: r.id,
        code: r.code,
        subject: r.subject,
        status: r.status,
        requestDate: r.requestDate,
        grandTotal: r.grandTotal,
        requestorName: r.requestorId ? requestorNameById.get(r.requestorId) ?? null : null,
      })),
    }));

    const payload = buildRealizationResponse(aggregatable);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('budget-realization report error:', error);
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
  }
}
