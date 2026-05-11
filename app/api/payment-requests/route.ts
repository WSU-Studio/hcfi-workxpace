import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import {
  canUserActOnCurrentBudgetRequestStep,
  getBudgetPlanUserRoleIds,
} from '@/lib/budget-plan-review-eligibility';
import { normalizePaymentRequestBody } from '@/lib/payment-request-normalize';
import { toNumber } from '@/lib/budget-request-normalize';

export const dynamic = 'force-dynamic';

const paymentRequestListInclude = Prisma.validator<Prisma.PaymentRequestInclude>()({
  budgetRequest: { select: { code: true, subject: true } },
  department: { select: { name: true } },
  lineItems: { select: { id: true } },
  approvalSchema: {
    include: {
      approvalLevels: { orderBy: { stepOrder: 'asc' } },
    },
  },
});

type PaymentRequestListRow = Prisma.PaymentRequestGetPayload<{
  include: typeof paymentRequestListInclude;
}>;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRoleIds = session?.user?.id ? await getBudgetPlanUserRoleIds(session.user.id) : [];

    // Load approved BRs independently so the PR "link BR" dropdown still works if the payment list query fails
    // (e.g. schema drift on payment_requests / line_items) — previously a thrown findMany hid all BR options.
    const [prSettled, brSettled] = await Promise.allSettled([
      prisma.paymentRequest.findMany({
        include: paymentRequestListInclude,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.budgetRequest.findMany({
        where: { status: { equals: 'Approved', mode: 'insensitive' } },
        select: {
          id: true,
          code: true,
          subject: true,
          description: true,
          departmentId: true,
          grandTotal: true,
          fiscalYear: true,
          budgetPlan: { select: { originOffice: true, projectId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const requests =
      prSettled.status === 'fulfilled'
        ? await serializePaymentRequestList(prSettled.value, session, userRoleIds)
        : [];
    if (prSettled.status === 'rejected') {
      console.error('[GET /api/payment-requests] paymentRequest.findMany failed', prSettled.reason);
    }

    const approvedBudgetRequests =
      brSettled.status === 'fulfilled'
        ? brSettled.value.map((br) => ({
            ...br,
            grandTotal: Number(br.grandTotal),
          }))
        : [];
    if (brSettled.status === 'rejected') {
      console.error('[GET /api/payment-requests] approved budgetRequest.findMany failed', brSettled.reason);
    }

    const listError = prSettled.status === 'rejected' ? 'Payment request list could not be loaded.' : undefined;

    return NextResponse.json({ requests, approvedBudgetRequests, listError });
  } catch (e) {
    console.error('[GET /api/payment-requests]', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

async function serializePaymentRequestList(
  rows: PaymentRequestListRow[],
  session: Session | null,
  userRoleIds: string[]
) {
  const requestorIds = Array.from(
    new Set(rows.map((row) => row.requestorId).filter((id): id is string => Boolean(id)))
  );
  const requestorUsers = requestorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: requestorIds } },
        select: { id: true, name: true },
      })
    : [];
  const requestorNameMap = new Map(requestorUsers.map((user) => [user.id, user.name]));

  return rows.map(({ approvalSchema, lineItems, ...r }) => ({
    ...r,
    amount: Number(r.amount),
    totalAmount: Number(r.totalAmount),
    vatAmount: Number(r.vatAmount),
    whtAmount: Number(r.whtAmount),
    invoiceAmount: Number(r.invoiceAmount),
    lineItemCount: lineItems?.length ?? 0,
    requestorName: r.requestorId ? requestorNameMap.get(r.requestorId) ?? null : null,
    canEdit: !!session?.user?.id && r.requestorId === session.user.id,
    canReview:
      !!session?.user?.id &&
      canUserActOnCurrentBudgetRequestStep({
        requestStatus: r.status,
        approvalLevels: approvalSchema?.approvalLevels ?? [],
        userRoleIds,
        requestorId: r.requestorId ?? null,
        actorUserId: session.user.id,
      }),
  }));
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      subject,
      description,
      departmentId,
      notes,
      approvalSchemaId,
      budgetRequestId,
      currency,
      payeeName,
      paymentPurpose,
      fiscalYear: bodyFiscalYear,
      originOffice: bodyOriginOffice,
      projectId: bodyProjectId,
    } = body;

    if (!subject || typeof subject !== 'string' || !payeeName || typeof payeeName !== 'string') {
      return NextResponse.json({ error: 'Missing required fields (subject, payee)' }, { status: 400 });
    }

    const normalizedPayload = normalizePaymentRequestBody(body as Record<string, unknown>);
    if ('error' in normalizedPayload) {
      return NextResponse.json({ error: normalizedPayload.error }, { status: 400 });
    }
    const {
      normalizedLineItems,
      totalAmount,
      normalizedVatPercent,
      normalizedWhtPercent,
      normalizedVatAmount,
      normalizedWhtAmount,
      normalizedInvoiceAmount,
      normalizedGrandTotal,
    } = normalizedPayload;

    const lineItemsCreate = normalizedLineItems
      .filter((li) => String(li.item ?? '').trim().length > 0)
      .map((li) => ({
        item: li.item ?? '',
        qty: Math.round(toNumber(li.qty)),
        unitPrice: toNumber(li.unitPrice),
        subtotal: toNumber(li.subtotal),
        deduction: toNumber(li.deduction),
        total: toNumber(li.total),
      }));
    if (lineItemsCreate.length === 0) {
      return NextResponse.json({ error: 'Add at least one line item with a name and amount' }, { status: 400 });
    }

    let resolvedDepartmentId =
      typeof departmentId === 'string' && departmentId.trim() !== '' ? departmentId : '';
    let resolvedBudgetRequestId: string | null =
      typeof budgetRequestId === 'string' && budgetRequestId.trim() !== '' ? budgetRequestId : null;
    let resolvedFiscalYear: number;
    let resolvedOriginOffice: string | null;
    let resolvedProjectId: string | null;

    if (resolvedBudgetRequestId) {
      const br = await prisma.budgetRequest.findUnique({
        where: { id: resolvedBudgetRequestId },
        select: {
          id: true,
          status: true,
          departmentId: true,
          fiscalYear: true,
          budgetPlan: { select: { originOffice: true, projectId: true } },
        },
      });
      if (!br) {
        return NextResponse.json({ error: 'Budget request not found' }, { status: 400 });
      }
      if (br.status !== 'Approved') {
        return NextResponse.json({ error: 'Linked budget request must be approved' }, { status: 400 });
      }
      resolvedDepartmentId = br.departmentId;
      resolvedFiscalYear = br.fiscalYear;
      resolvedOriginOffice = br.budgetPlan?.originOffice?.trim() || null;
      resolvedProjectId = br.budgetPlan?.projectId ?? null;
    } else {
      if (!resolvedDepartmentId) {
        return NextResponse.json({ error: 'Department is required' }, { status: 400 });
      }
      const fy = typeof bodyFiscalYear === 'number' ? bodyFiscalYear : Number(bodyFiscalYear);
      if (!Number.isFinite(fy) || fy < 1900 || fy > 2100) {
        return NextResponse.json({ error: 'Valid fiscal year is required' }, { status: 400 });
      }
      resolvedFiscalYear = Math.round(fy);
      const oo =
        typeof bodyOriginOffice === 'string' ? bodyOriginOffice.trim() : '';
      if (!oo) {
        return NextResponse.json({ error: 'Origin office is required' }, { status: 400 });
      }
      resolvedOriginOffice = oo;
      resolvedProjectId =
        typeof bodyProjectId === 'string' && bodyProjectId.trim() !== ''
          ? bodyProjectId.trim()
          : null;
    }

    const dept = await prisma.department.findUnique({ where: { id: resolvedDepartmentId } });
    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 400 });
    }

    const now = new Date();
    const codeYear = String(now.getFullYear());
    const codeMonth = String(now.getMonth() + 1).padStart(2, '0');
    const departmentCode = (dept.code ?? 'XX').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const codePrefix = `PR${departmentCode}${codeYear}${codeMonth}`;
    const count = await prisma.paymentRequest.count({
      where: { code: { startsWith: codePrefix } },
    });
    const code = `${codePrefix}${String(count + 1).padStart(3, '0')}`;

    const pr = await prisma.paymentRequest.create({
      data: {
        code,
        subject: subject.trim(),
        description: typeof description === 'string' ? description : null,
        fiscalYear: resolvedFiscalYear,
        originOffice: resolvedOriginOffice,
        departmentId: resolvedDepartmentId,
        projectId: resolvedProjectId,
        budgetRequestId: resolvedBudgetRequestId,
        requestorId: session.user.id,
        requestDate: now,
        amount: normalizedGrandTotal,
        totalAmount,
        vatPercent: normalizedVatPercent,
        vatAmount: normalizedVatAmount,
        whtPercent: normalizedWhtPercent,
        whtAmount: normalizedWhtAmount,
        invoiceAmount: normalizedInvoiceAmount,
        currency: typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : 'IDR',
        payeeName: payeeName.trim(),
        paymentPurpose: typeof paymentPurpose === 'string' ? paymentPurpose : null,
        notes: typeof notes === 'string' ? notes : null,
        approvalSchemaId: approvalSchemaId || null,
        lineItems: {
          create: lineItemsCreate,
        },
      },
      include: {
        lineItems: true,
        department: { select: { name: true } },
        budgetRequest: { select: { code: true, subject: true } },
      },
    });

    await logActivity({
      userId: session.user.id,
      entityType: 'PaymentRequest',
      entityId: pr.id,
      entityCode: pr.code,
      action: 'create',
      details: {
        subject: pr.subject,
        status: pr.status,
        fiscalYear: pr.fiscalYear,
        originOffice: pr.originOffice,
        amount: normalizedGrandTotal,
        totalAmount,
        currency: pr.currency,
        payeeName: pr.payeeName,
        departmentName: pr.department?.name ?? null,
        budgetRequestCode: pr.budgetRequest?.code ?? null,
        approvalSchemaId: pr.approvalSchemaId,
      },
    });

    return NextResponse.json({
      ...pr,
      amount: Number(pr.amount),
      totalAmount: Number(pr.totalAmount),
      vatPercent: Number(pr.vatPercent),
      vatAmount: Number(pr.vatAmount),
      whtPercent: Number(pr.whtPercent),
      whtAmount: Number(pr.whtAmount),
      invoiceAmount: Number(pr.invoiceAmount),
      lineItems: (pr.lineItems ?? []).map((li) => ({
        ...li,
        unitPrice: Number(li.unitPrice),
        subtotal: Number(li.subtotal),
        deduction: Number(li.deduction),
        total: Number(li.total),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
