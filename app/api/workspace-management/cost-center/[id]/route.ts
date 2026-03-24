import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const costCenter = await prisma.costCenterMaster.findUnique({ where: { id } });
    if (!costCenter) return NextResponse.json({ error: 'Cost center not found' }, { status: 404 });
    return NextResponse.json({ costCenter });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch cost center' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Cost center name is required' }, { status: 400 });

    const existing = await prisma.costCenterMaster.findFirst({
      where: { name, NOT: { id } },
    });
    if (existing) return NextResponse.json({ error: 'Cost center name already exists' }, { status: 400 });

    const costCenter = await prisma.costCenterMaster.update({
      where: { id },
      data: {
        name,
        description: body.description || null,
      },
    });
    return NextResponse.json(costCenter);
  } catch (error) {
    console.error('Failed to update cost center:', error);
    return NextResponse.json({ error: 'Failed to update cost center' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.costCenterMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete cost center:', error);
    return NextResponse.json({ error: 'Failed to delete cost center' }, { status: 500 });
  }
}
