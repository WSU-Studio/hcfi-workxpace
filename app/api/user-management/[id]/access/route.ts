import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { defaultActivityAccess, defaultMenuAccess } from '@/lib/default-access';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, access: true },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const mergedMenuAccess = {
      ...defaultMenuAccess,
      ...((user.access?.menuAccess as Record<string, unknown>) ?? {}),
    } as typeof defaultMenuAccess;
    const mergedActivityAccess = {
      ...defaultActivityAccess,
      ...((user.access?.activityAccess as Record<string, unknown>) ?? {}),
    } as typeof defaultActivityAccess;

    return NextResponse.json({
      user: { id: user.id, name: user.name },
      menuAccess: mergedMenuAccess,
      activityAccess: mergedActivityAccess,
    });
  } catch (error) {
    console.error('Error fetching user access:', error);
    return NextResponse.json({ error: 'Failed to fetch access control' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { menuAccess, activityAccess } = await request.json();

    const updated = await prisma.userAccess.upsert({
      where: { userId: id },
      create: { userId: id, menuAccess, activityAccess },
      update: { menuAccess, activityAccess },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating user access:', error);
    return NextResponse.json({ error: 'Failed to update access control' }, { status: 500 });
  }
}
