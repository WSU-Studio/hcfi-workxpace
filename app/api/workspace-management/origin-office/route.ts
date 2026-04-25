import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const originOffices = await prisma.originOfficeMaster.findMany({
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });
    return NextResponse.json({ originOffices });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch origin offices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
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

    const existing = await prisma.originOfficeMaster.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'Origin office code already exists' }, { status: 400 });
    }

    const originOffice = await prisma.originOfficeMaster.create({
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
    return NextResponse.json({ error: 'Failed to create origin office' }, { status: 500 });
  }
}
