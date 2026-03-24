import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const costCenters = await prisma.costCenterMaster.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ costCenters });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch cost centers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Cost center name is required' }, { status: 400 });

    const existing = await prisma.costCenterMaster.findUnique({ where: { name } });
    if (existing) return NextResponse.json({ error: 'Cost center name already exists' }, { status: 400 });

    const costCenter = await prisma.costCenterMaster.create({
      data: {
        name,
        description: body.description || null,
      },
    });

    return NextResponse.json(costCenter);
  } catch (error) {
    console.error('Failed to create cost center:', error);
    return NextResponse.json({ error: 'Failed to create cost center' }, { status: 500 });
  }
}
