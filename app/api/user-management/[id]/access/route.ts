import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { parseDashboardView } from '@/types/access-control';
import { 
  defaultActivityAccess, 
  defaultMenuAccess,
  fullActivityAccess,
  fullMenuAccess,
  mergeWithDefaultActivityAccess, 
  mergeWithDefaultMenuAccess 
} from '@/lib/default-access';

export const dynamic = 'force-dynamic';

const ADMIN_ROLE_CODE = 'ADMIN';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        access: true,
        userRoles: { include: { role: { select: { roleCode: true } } } },
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isAdmin = user.userRoles[0]?.role.roleCode === ADMIN_ROLE_CODE;
    const baseMenu = isAdmin ? fullMenuAccess : defaultMenuAccess;
    const baseActivity = isAdmin ? fullActivityAccess : defaultActivityAccess;

    const storedActivity = user.access?.activityAccess as Partial<typeof defaultActivityAccess> | null;
    const mergedMenuAccess = {
      ...baseMenu,
      ...mergeWithDefaultMenuAccess(user.access?.menuAccess),
    };
    const mergedActivityAccess = {
      ...baseActivity,
      ...mergeWithDefaultActivityAccess(storedActivity, user.access?.menuAccess),
      dashboardView: parseDashboardView(storedActivity?.dashboardView ?? baseActivity.dashboardView),
      viewAllDashboardDepartments:
        typeof storedActivity?.viewAllDashboardDepartments === 'boolean'
          ? storedActivity.viewAllDashboardDepartments
          : baseActivity.viewAllDashboardDepartments,
    };

    return NextResponse.json({
      user: { id: user.id, name: user.name },
      menuAccess: mergedMenuAccess,
      activityAccess: mergedActivityAccess,
    });
  } catch (error) {
    console.error('Error fetching user access:', error);
    return NextResponse.json({ error: 'Failed to fetch access control' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Defense in depth: changing other users' access permissions is gated by
    // the `changeAccess` activity permission. The UI already hides the entry
    // and redirects unauthorized navigation, but a direct API call would
    // otherwise succeed without this server-side check.
    if (!session.user.access?.activityAccess?.changeAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to change user access.' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const { menuAccess, activityAccess } = await request.json();
    const sanitizedActivityAccess = {
      ...activityAccess,
      dashboardView: parseDashboardView(activityAccess?.dashboardView),
      viewAllDashboardDepartments: Boolean(activityAccess?.viewAllDashboardDepartments),
    };

    const updated = await prisma.userAccess.upsert({
      where: { userId: id },
      create: { userId: id, menuAccess, activityAccess: sanitizedActivityAccess },
      update: { menuAccess, activityAccess: sanitizedActivityAccess },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating user access:', error);
    return NextResponse.json({ error: 'Failed to update access control' }, { status: 500 });
  }
}
