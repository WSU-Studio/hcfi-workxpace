import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getBundledBudgetRealFixtureJson } from '@/lib/confins/mock-data';

export const dynamic = 'force-dynamic';

/**
 * Returns the bundled default mock fixtures so the Settings UI can
 * preview / reset to the factory values without re-fetching the JSON
 * file via static import on the client.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      fixtures: {
        confinsBudgetRealJson: getBundledBudgetRealFixtureJson(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch mock fixtures:', error);
    return NextResponse.json({ error: 'Failed to fetch mock fixtures' }, { status: 500 });
  }
}
