import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const categoryKeyIndex = await prisma.categoryKeyIndexMaster.findUnique({ where: { id } });
    if (!categoryKeyIndex) return NextResponse.json({ error: 'Category key index not found' }, { status: 404 });
    return NextResponse.json({ categoryKeyIndex });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch category key index' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Category key index name is required' }, { status: 400 });

    const existing = await prisma.categoryKeyIndexMaster.findFirst({
      where: { name, NOT: { id } },
    });
    if (existing) return NextResponse.json({ error: 'Category key index name already exists' }, { status: 400 });

    const categoryKeyIndex = await prisma.categoryKeyIndexMaster.update({
      where: { id },
      data: {
        name,
        description: body.description || null,
      },
    });
    return NextResponse.json(categoryKeyIndex);
  } catch (error) {
    console.error('Failed to update category key index:', error);
    return NextResponse.json({ error: 'Failed to update category key index' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.categoryKeyIndexMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete category key index:', error);
    return NextResponse.json({ error: 'Failed to delete category key index' }, { status: 500 });
  }
}
