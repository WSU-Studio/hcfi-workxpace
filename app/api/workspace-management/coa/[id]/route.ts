import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const coa = await prisma.coaMaster.findUnique({ where: { id } });
    if (!coa) {
      return NextResponse.json({ error: 'COA not found' }, { status: 404 });
    }
    return NextResponse.json({ coa });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch COA' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const payload = (await request.json()) as {
      accountCode?: string;
      accountName?: string;
      description?: string | null;
      isActive?: boolean;
    };
    const accountCode = String(payload.accountCode || '').trim();
    const accountName = String(payload.accountName || '').trim();
    if (!accountCode || !accountName) {
      return NextResponse.json({ error: 'Account code and name are required' }, { status: 400 });
    }

    const existing = await prisma.coaMaster.findFirst({
      where: { accountCode, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Account code already exists' }, { status: 400 });
    }

    const coa = await prisma.coaMaster.update({
      where: { id },
      data: {
        accountCode,
        accountName,
        description: payload.description?.trim() || null,
        isActive: payload.isActive !== false,
      },
    });
    return NextResponse.json(coa);
  } catch {
    return NextResponse.json({ error: 'Failed to update COA' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.coaMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete COA' }, { status: 500 });
  }
}
