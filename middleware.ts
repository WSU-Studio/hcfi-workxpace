import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname === '/login') {
      return NextResponse.next();
    }

    const token = req.nextauth.token;
    if (!token?.sub) {
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(url);
    }

    const access = token.access as {
      menuAccess: {
        budgetPlans?: boolean;
        budgetRequests?: boolean;
        reconciliation?: boolean;
        userManagement?: boolean;
        workspaceManagement?: boolean;
      };
      activityAccess: Record<string, boolean>;
    } | undefined;

    const menuAccess = access?.menuAccess ?? {};
    const activityAccess = access?.activityAccess ?? {};

    if (req.nextUrl.pathname.startsWith('/workspace-management')) {
      if (!menuAccess.workspaceManagement) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }

      if (req.nextUrl.pathname.includes('/department')) {
        if (!menuAccess.viewDepartment) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.includes('/[id]/edit')) && !activityAccess.editDepartment) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if (req.nextUrl.pathname.includes('/new') && !activityAccess.createDepartment) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      if (req.nextUrl.pathname.includes('/project')) {
        if (!menuAccess.viewProject) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.includes('/[id]/edit')) && !activityAccess.editProject) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if (req.nextUrl.pathname.includes('/new') && !activityAccess.createProject) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      if (req.nextUrl.pathname.includes('/role')) {
        if (!menuAccess.viewRole) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.includes('/[id]/edit')) && !activityAccess.editRole) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if (req.nextUrl.pathname.includes('/new') && !activityAccess.createRole) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      if (req.nextUrl.pathname.includes('/approval-schema')) {
        if (!menuAccess.viewApprovalSchema) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.includes('/[id]/edit')) && !activityAccess.editApprovalSchema) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if (req.nextUrl.pathname.includes('/new') && !activityAccess.createApprovalSchema) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      if (req.nextUrl.pathname.includes('/category-key-index')) {
        if (!menuAccess.viewCategoryKeyIndex) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.includes('/[id]/edit')) && !activityAccess.editCategoryKeyIndex) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if (req.nextUrl.pathname.includes('/new') && !activityAccess.createCategoryKeyIndex) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      if (req.nextUrl.pathname.includes('/cost-center')) {
        if (!menuAccess.viewCostCenter) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.includes('/[id]/edit')) && !activityAccess.editCostCenter) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if (req.nextUrl.pathname.includes('/new') && !activityAccess.createCostCenter) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      if (req.nextUrl.pathname.match(/^\/workspace-management\/category(\/|$)/)) {
        if (!menuAccess.viewCategory) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.includes('/[id]/edit')) && !activityAccess.editCategory) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        if (req.nextUrl.pathname.includes('/new') && !activityAccess.createCategory) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      if (req.nextUrl.pathname.includes('/activity-history') && !menuAccess.viewActivityHistory) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
    }

    if (req.nextUrl.pathname.startsWith('/budget-plans')) {
      if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.match(/\/[^/]+\/edit/)) && !activityAccess.editBudgetPlan) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
      if (req.nextUrl.pathname.includes('/new') && !activityAccess.createBudgetPlan) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
    }

    if (req.nextUrl.pathname.startsWith('/budget-requests')) {
      if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.match(/\/[^/]+\/edit/)) && !activityAccess.editBudgetRequest) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
      if (req.nextUrl.pathname.includes('/new') && !activityAccess.createBudgetRequest) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
    }

    if (req.nextUrl.pathname.startsWith('/reconciliation')) {
      if (!menuAccess.reconciliation) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
    }

    if (req.nextUrl.pathname.startsWith('/user-management')) {
      if ((req.nextUrl.pathname.includes('/edit') || req.nextUrl.pathname.match(/\/[^/]+\/edit/)) && !activityAccess.editUser) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
      if (req.nextUrl.pathname.includes('/new') && !activityAccess.createUser) {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
    }

    return NextResponse.next();
  },
  { callbacks: { authorized: () => true } }
);

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|login|register|forbidden).*)'],
};
