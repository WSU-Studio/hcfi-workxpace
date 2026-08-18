import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { usersHoldingRoleWhere } from '@/lib/approval-level-pics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId')?.trim() ?? '';
    if (!roleId) {
      return NextResponse.json({ error: 'roleId is required' }, { status: 400 });
    }
    const query = searchParams.get('q')?.trim() ?? '';

    const users = await prisma.user.findMany({
      where: {
        ...usersHoldingRoleWhere(roleId),
        ...(query
          ? {
              AND: [
                {
                  OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { employeeId: { contains: query, mode: 'insensitive' } },
                  ],
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Failed to list role users:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
