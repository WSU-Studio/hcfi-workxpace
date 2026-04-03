import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categoryKeyIndexes = await prisma.categoryKeyIndexMaster.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ categoryKeyIndexes });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch category key indexes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Category key index name is required' }, { status: 400 });

    const existing = await prisma.categoryKeyIndexMaster.findUnique({ where: { name } });
    if (existing) return NextResponse.json({ error: 'Category key index name already exists' }, { status: 400 });

    const categoryKeyIndex = await prisma.categoryKeyIndexMaster.create({
      data: {
        name,
        description: body.description || null,
      },
    });

    return NextResponse.json(categoryKeyIndex);
  } catch (error) {
    console.error('Failed to create category key index:', error);
    return NextResponse.json({ error: 'Failed to create category key index' }, { status: 500 });
  }
}
