import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { logActivity } from '@/lib/activity';
import {
  deriveDelegationListStatus,
  endOfDelegationDay,
  findOverlappingDelegation,
  startOfDelegationDay,
} from '@/lib/approval-delegation';

export const dynamic = 'force-dynamic';

function hasMenuAccess(session: { user?: { access?: { menuAccess?: { approvalDelegation?: boolean } } } } | null) {
  return Boolean(session?.user?.access?.menuAccess?.approvalDelegation);
}

function canCreate(session: {
  user?: { access?: { activityAccess?: { createApprovalDelegation?: boolean } } };
} | null) {
  return Boolean(session?.user?.access?.activityAccess?.createApprovalDelegation);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasMenuAccess(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rows = await prisma.approvalDelegation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        delegator: { select: { id: true, name: true, email: true, employeeId: true } },
        delegate: { select: { id: true, name: true, email: true, employeeId: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    const delegations = rows.map((row) => ({
      ...row,
      listStatus: deriveDelegationListStatus({
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        at: now,
      }),
    }));

    return NextResponse.json({ delegations });
  } catch (error) {
    console.error('Failed to list approval delegations:', error);
    return NextResponse.json({ error: 'Failed to fetch approval delegations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasMenuAccess(session) || !canCreate(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const delegatorUserId = String(body.delegatorUserId || '').trim();
    const delegateUserId = String(body.delegateUserId || '').trim();
    const notes =
      typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;

    if (!delegatorUserId || !delegateUserId) {
      return NextResponse.json({ error: 'Delegator and delegate are required' }, { status: 400 });
    }
    if (delegatorUserId === delegateUserId) {
      return NextResponse.json({ error: 'Delegator and delegate must be different users' }, { status: 400 });
    }

    const startRaw = body.startDate ? new Date(String(body.startDate)) : null;
    const endRaw = body.endDate ? new Date(String(body.endDate)) : null;
    if (!startRaw || Number.isNaN(startRaw.getTime()) || !endRaw || Number.isNaN(endRaw.getTime())) {
      return NextResponse.json({ error: 'Valid start and end dates are required' }, { status: 400 });
    }

    const startDate = startOfDelegationDay(startRaw);
    const endDate = endOfDelegationDay(endRaw);
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 });
    }

    const [delegator, delegate] = await Promise.all([
      prisma.user.findUnique({ where: { id: delegatorUserId }, select: { id: true, isActive: true, name: true } }),
      prisma.user.findUnique({ where: { id: delegateUserId }, select: { id: true, isActive: true, name: true } }),
    ]);
    if (!delegator || !delegate) {
      return NextResponse.json({ error: 'Delegator or delegate user not found' }, { status: 400 });
    }
    if (!delegator.isActive || !delegate.isActive) {
      return NextResponse.json({ error: 'Both users must be active' }, { status: 400 });
    }

    const overlap = await findOverlappingDelegation({
      delegatorUserId,
      startDate,
      endDate,
    });
    if (overlap) {
      return NextResponse.json(
        { error: 'Delegator already has an overlapping active delegation in this date range' },
        { status: 409 },
      );
    }

    const delegation = await prisma.approvalDelegation.create({
      data: {
        delegatorUserId,
        delegateUserId,
        startDate,
        endDate,
        status: 'Active',
        notes,
        createdById: session.user.id,
      },
      include: {
        delegator: { select: { id: true, name: true, email: true, employeeId: true } },
        delegate: { select: { id: true, name: true, email: true, employeeId: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await logActivity({
      userId: session.user.id,
      entityType: 'ApprovalDelegation',
      entityId: delegation.id,
      action: 'create',
      details: {
        delegatorUserId,
        delegatorName: delegator.name,
        delegateUserId,
        delegateName: delegate.name,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        notes,
      },
    });

    return NextResponse.json({
      ...delegation,
      listStatus: deriveDelegationListStatus({
        status: delegation.status,
        startDate: delegation.startDate,
        endDate: delegation.endDate,
      }),
    });
  } catch (error) {
    console.error('Failed to create approval delegation:', error);
    return NextResponse.json({ error: 'Failed to create approval delegation' }, { status: 500 });
  }
}
