import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getApplicationSettings, updateApplicationSettings } from '@/lib/app-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getApplicationSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to fetch application settings:', error);
    return NextResponse.json({ error: 'Failed to fetch application settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { confinsUseMock?: unknown };
    const updated = await updateApplicationSettings({
      confinsUseMock: typeof body.confinsUseMock === 'boolean' ? body.confinsUseMock : undefined,
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Failed to update application settings:', error);
    return NextResponse.json({ error: 'Failed to update application settings' }, { status: 500 });
  }
}
