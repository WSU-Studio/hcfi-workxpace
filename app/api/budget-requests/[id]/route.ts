import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const br = await prisma.budgetRequest.findUnique({
      where: { id },
      include: {
        budgetPlan: true,
        department: true,
        lineItems: true,
      },
    });
    if (!br) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(br);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
