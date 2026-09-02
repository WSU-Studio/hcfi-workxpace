import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { validateChangePasswordInput } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = validateChangePasswordInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, password: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentMatches = await bcrypt.compare(parsed.currentPassword, user.password);
    if (!currentMatches) {
      return NextResponse.json(
        { error: 'Current password is incorrect', field: 'currentPassword' },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(parsed.newPassword, 10) },
    });

    await logActivity({
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      entityCode: user.email,
      action: 'update',
      details: { passwordChanged: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to change password:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
