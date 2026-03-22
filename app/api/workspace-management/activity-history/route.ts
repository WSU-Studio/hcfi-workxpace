import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activities = await prisma.activityHistory.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    return NextResponse.json({ activities });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
