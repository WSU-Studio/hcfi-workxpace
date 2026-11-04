import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { logActivity } from '@/lib/activity';
import { deriveDelegationListStatus } from '@/lib/approval-delegation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.user.access?.menuAccess?.approvalDelegation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!session.user.access?.activityAccess?.cancelApprovalDelegation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'cancel') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    const existing = await prisma.approvalDelegation.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status === 'Cancelled') {
      return NextResponse.json({ error: 'Delegation is already cancelled' }, { status: 400 });
    }

    const listStatus = deriveDelegationListStatus({
      status: existing.status,
      startDate: existing.startDate,
      endDate: existing.endDate,
    });
    if (listStatus === 'Expired') {
      return NextResponse.json({ error: 'Expired delegations cannot be cancelled' }, { status: 400 });
    }

    const updated = await prisma.approvalDelegation.update({
      where: { id },
      data: { status: 'Cancelled' },
      include: {
        delegator: { select: { id: true, name: true, email: true, employeeId: true } },
        delegate: { select: { id: true, name: true, email: true, employeeId: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await logActivity({
      userId: session.user.id,
      entityType: 'ApprovalDelegation',
      entityId: id,
      action: 'update',
      details: {
        action: 'cancel',
        previousStatus: existing.status,
        status: 'Cancelled',
        delegatorUserId: existing.delegatorUserId,
        delegateUserId: existing.delegateUserId,
      },
    });

    return NextResponse.json({
      ...updated,
      listStatus: 'Cancelled' as const,
    });
  } catch (error) {
    console.error('Failed to cancel approval delegation:', error);
    return NextResponse.json({ error: 'Failed to cancel approval delegation' }, { status: 500 });
  }
}
