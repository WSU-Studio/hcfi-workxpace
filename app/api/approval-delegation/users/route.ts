import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

/** Active users picker for Approval Delegation form. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.user.access?.menuAccess?.approvalDelegation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        departmentName: user.department?.name ?? null,
        label: `${user.name} (${user.employeeId})`,
      })),
    });
  } catch (error) {
    console.error('Failed to list users for approval delegation:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
