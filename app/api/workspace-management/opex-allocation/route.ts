import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const opexAllocations = await prisma.opexAllocationMaster.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ opexAllocations });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch opex allocations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Opex allocation name is required' }, { status: 400 });

    const existing = await prisma.opexAllocationMaster.findUnique({ where: { name } });
    if (existing) return NextResponse.json({ error: 'Opex allocation name already exists' }, { status: 400 });

    const opexAllocation = await prisma.opexAllocationMaster.create({
      data: {
        name,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json(opexAllocation);
  } catch (error) {
    console.error('Failed to create opex allocation:', error);
    return NextResponse.json({ error: 'Failed to create opex allocation' }, { status: 500 });
  }
}
