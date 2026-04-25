import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { logActivity } from '@/lib/activity';
import { ConfinsClient } from '@/lib/confins/client';
import { ConfinsMasterSyncService } from '@/lib/confins/master-sync';
import { getLatestOriginOfficeSync } from '@/lib/confins/origin-office-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const latest = await getLatestOriginOfficeSync();
    return NextResponse.json({ latest });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch origin office sync status' },
      { status: 500 }
    );
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const service = new ConfinsMasterSyncService(new ConfinsClient());
    const summary = await service.syncOriginOffices();

    await logActivity({
      userId: session.user.id,
      entityType: 'ConfinsSyncOriginOffice',
      entityId: 'confins-origin-office',
      entityCode: 'CONFINS-ORIGIN-OFFICE',
      action: 'update',
      details: {
        status: 'success',
        summary,
      },
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    await logActivity({
      userId: session.user.id,
      entityType: 'ConfinsSyncOriginOffice',
      entityId: 'confins-origin-office',
      entityCode: 'CONFINS-ORIGIN-OFFICE',
      action: 'update',
      details: {
        status: 'failed',
        error: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
