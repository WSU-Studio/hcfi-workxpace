import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function extractBudgetPlanCode(title: string, message: string) {
  if (!title.toLowerCase().includes('budget plan')) return null;
  const match = message.match(/^([A-Za-z0-9-]+)\s+status changed to/i);
  return match?.[1] ?? null;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const where = unreadOnly
      ? { userId: session.user.id, isRead: false }
      : { userId: session.user.id };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const notificationPlanCodes = Array.from(
      new Set(
        notifications
          .map((notification) => extractBudgetPlanCode(notification.title, notification.message))
          .filter((code): code is string => !!code)
      )
    );

    const budgetPlansByCode = notificationPlanCodes.length
      ? await prisma.budgetPlan.findMany({
          where: { code: { in: notificationPlanCodes } },
          select: { id: true, code: true },
        })
      : [];

    const budgetPlanIdByCode = new Map(budgetPlansByCode.map((plan) => [plan.code, plan.id]));
    const enrichedNotifications = notifications.map((notification) => {
      const planCode = extractBudgetPlanCode(notification.title, notification.message);
      const planId = planCode ? budgetPlanIdByCode.get(planCode) : null;

      return {
        ...notification,
        targetUrl: planId ? `/budget-plans/${planId}` : null,
      };
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    });

    return NextResponse.json({
      notifications: enrichedNotifications,
      pagination: { total: unreadOnly ? unreadCount : enrichedNotifications.length },
      unreadCount,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
