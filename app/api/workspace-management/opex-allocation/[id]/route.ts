import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const opexAllocation = await prisma.opexAllocationMaster.findUnique({ where: { id } });
    if (!opexAllocation) return NextResponse.json({ error: 'Opex allocation not found' }, { status: 404 });
    return NextResponse.json({ opexAllocation });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch opex allocation' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Opex allocation name is required' }, { status: 400 });

    const existing = await prisma.opexAllocationMaster.findFirst({
      where: { name, NOT: { id } },
    });
    if (existing) return NextResponse.json({ error: 'Opex allocation name already exists' }, { status: 400 });

    const opexAllocation = await prisma.opexAllocationMaster.update({
      where: { id },
      data: {
        name,
        isActive: body.isActive !== false,
      },
    });
    return NextResponse.json(opexAllocation);
  } catch (error) {
    console.error('Failed to update opex allocation:', error);
    return NextResponse.json({ error: 'Failed to update opex allocation' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const inUse = await prisma.budgetPlan.count({ where: { opexAllocationId: id } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: 'Cannot delete: opex allocation is used by budget plans. Deactivate it instead.' },
        { status: 409 },
      );
    }

    await prisma.opexAllocationMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete opex allocation:', error);
    return NextResponse.json({ error: 'Failed to delete opex allocation' }, { status: 500 });
  }
}
