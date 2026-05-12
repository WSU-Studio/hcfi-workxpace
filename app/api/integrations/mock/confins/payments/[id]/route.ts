import { NextResponse } from 'next/server';
import { fetchConfinsMockPaymentById } from '@/lib/integrations/confins-mock/build-mock-payments';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payment = await fetchConfinsMockPaymentById(decodeURIComponent(id));
    if (!payment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ payment });
  } catch (e) {
    console.error('mock confins payment by id:', e);
    return NextResponse.json({ error: 'Failed to load payment' }, { status: 500 });
  }
}
