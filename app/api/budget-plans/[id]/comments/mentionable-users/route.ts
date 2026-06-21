import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const plan = await prisma.budgetPlan.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() ?? '';

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { employeeId: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: 12,
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
