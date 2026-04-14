import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Ping mock Confins (tanpa data sensitif). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'confins-mock',
    version: '0.1.0',
    docs: '/api/integrations/mock/confins/payments',
  });
}
