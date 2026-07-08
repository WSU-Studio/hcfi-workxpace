import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const coas = await prisma.coaMaster.findMany({
      orderBy: [{ isActive: 'desc' }, { accountCode: 'asc' }],
    });
    return NextResponse.json({ coas });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch COA' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
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

    const existing = await prisma.coaMaster.findUnique({ where: { accountCode } });
    if (existing) {
      return NextResponse.json({ error: 'Account code already exists' }, { status: 400 });
    }

    const coa = await prisma.coaMaster.create({
      data: {
        accountCode,
        accountName,
        description: payload.description?.trim() || null,
        isActive: payload.isActive !== false,
      },
    });

    return NextResponse.json(coa);
  } catch {
    return NextResponse.json({ error: 'Failed to create COA' }, { status: 500 });
  }
}
