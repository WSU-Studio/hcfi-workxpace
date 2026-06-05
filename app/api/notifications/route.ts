import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function extractBudgetPlanCode(title: string, message: string) {
  if (!title.toLowerCase().includes('budget plan')) return null;
  const match =
    message.match(/^([A-Za-z0-9-]+)\s+status changed to/i) ||
    message.match(/^([A-Za-z0-9-]+)\s+(was submitted|was updated)/i);
  return match?.[1] ?? null;
}

/** BR approval / submit messages start with request code. */
function extractBudgetRequestCode(title: string, message: string) {
  if (!title.toLowerCase().includes('budget request')) return null;
  const match =
    message.match(/^([A-Za-z0-9-]+)\s+status changed to/i) ||
    message.match(/^([A-Za-z0-9-]+)\s+(was submitted|was updated)/i);
  return match?.[1] ?? null;
}

function extractPaymentRequestCode(title: string, message: string) {
  if (!title.toLowerCase().includes('payment request')) return null;
  const match = message.match(/^([A-Za-z0-9-]+)\s+(was submitted|was updated|status changed)/i);
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

    const notificationPrCodes = Array.from(
      new Set(
        notifications
          .map((notification) => extractPaymentRequestCode(notification.title, notification.message))
          .filter((code): code is string => !!code)
      )
    );

    const notificationBrCodes = Array.from(
      new Set(
        notifications
          .map((notification) => extractBudgetRequestCode(notification.title, notification.message))
          .filter((code): code is string => !!code)
      )
    );

    const budgetPlansByCode = notificationPlanCodes.length
      ? await prisma.budgetPlan.findMany({
          where: { code: { in: notificationPlanCodes } },
          select: { id: true, code: true },
        })
      : [];

    const paymentRequestsByCode = notificationPrCodes.length
      ? await prisma.paymentRequest.findMany({
          where: { code: { in: notificationPrCodes } },
          select: { id: true, code: true },
        })
      : [];

    const budgetRequestsByCode = notificationBrCodes.length
      ? await prisma.budgetRequest.findMany({
          where: { code: { in: notificationBrCodes } },
          select: { id: true, code: true },
        })
      : [];

    const budgetPlanIdByCode = new Map(budgetPlansByCode.map((plan) => [plan.code, plan.id]));
    const paymentRequestIdByCode = new Map(paymentRequestsByCode.map((row) => [row.code, row.id]));
    const budgetRequestIdByCode = new Map(budgetRequestsByCode.map((row) => [row.code, row.id]));

    const enrichedNotifications = notifications.map((notification) => {
      const prCode = extractPaymentRequestCode(notification.title, notification.message);
      const prId = prCode ? paymentRequestIdByCode.get(prCode) : null;
      if (prId) {
        return {
          ...notification,
          targetUrl: `/payment-requests/${prId}`,
          linkLabel: 'View payment request',
        };
      }

      const brCode = extractBudgetRequestCode(notification.title, notification.message);
      const brId = brCode ? budgetRequestIdByCode.get(brCode) : null;
      if (brId) {
        return {
          ...notification,
          targetUrl: `/budget-requests/${brId}`,
          linkLabel: 'View budget request',
        };
      }

      const planCode = extractBudgetPlanCode(notification.title, notification.message);
      const planId = planCode ? budgetPlanIdByCode.get(planCode) : null;
      if (planId) {
        return {
          ...notification,
          targetUrl: `/budget-plans/${planId}`,
          linkLabel: 'View budget plan',
        };
      }

      return { ...notification, targetUrl: null, linkLabel: null };
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
