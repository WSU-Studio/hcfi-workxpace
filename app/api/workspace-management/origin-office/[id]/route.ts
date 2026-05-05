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
    const originOffice = await prisma.originOfficeMaster.findUnique({ where: { id } });
    if (!originOffice) {
      return NextResponse.json({ error: 'Origin office not found' }, { status: 404 });
    }
    return NextResponse.json({ originOffice });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch origin office' }, { status: 500 });
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
      code?: string;
      name?: string;
      address?: string | null;
      officeType?: string | null;
      isActive?: boolean;
    };
    const code = String(payload.code || '').trim();
    const name = String(payload.name || '').trim();
    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }

    const existing = await prisma.originOfficeMaster.findFirst({
      where: { code, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Origin office code already exists' }, { status: 400 });
    }

    const originOffice = await prisma.originOfficeMaster.update({
      where: { id },
      data: {
        code,
        name,
        address: payload.address?.trim() || null,
        officeType: payload.officeType?.trim() || null,
        isActive: payload.isActive !== false,
      },
    });
    return NextResponse.json(originOffice);
  } catch {
    return NextResponse.json({ error: 'Failed to update origin office' }, { status: 500 });
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
    await prisma.originOfficeMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete origin office' }, { status: 500 });
  }
}
