import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { toNumber } from '@/lib/budget-request-normalize';
import { normalizePaymentRequestBody } from '@/lib/payment-request-normalize';
import {
  canUserActOnCurrentStep,
  getBudgetPlanUserRoleIds,
} from '@/lib/budget-plan-review-eligibility';
import type { BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import { notifyPaymentRequestAwaitingReview } from '@/lib/payment-request-notifications';
import { loadClassificationOptions } from '@/lib/classification-options';
import {
  classificationToStored,
  mergeStoredClassification,
  parseClassificationBody,
  type StoredRequestClassification,
} from '@/lib/request-classification';
import { parseDateInputToDate } from '@/lib/payment-requests/form';

export const dynamic = 'force-dynamic';

function serializePaymentRequest(
  row: Record<string, unknown> & {
    lineItems?: Array<Record<string, unknown>>;
  }
) {
  const { lineItems, ...rest } = row;
  return {
    ...rest,
    amount: Number(row.amount),
    totalAmount: Number(row.totalAmount),
    vatPercent: Number(row.vatPercent),
    vatAmount: Number(row.vatAmount),
    whtPercent: Number(row.whtPercent),
    whtAmount: Number(row.whtAmount),
    invoiceAmount: Number(row.invoiceAmount),
    lineItems: (lineItems ?? []).map((li) => ({
      ...li,
      unitPrice: Number(li.unitPrice),
      subtotal: Number(li.subtotal),
      deduction: Number(li.deduction),
      total: Number(li.total),
    })),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const row = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        budgetRequest: {
          select: {
            code: true,
            subject: true,
            status: true,
            grandTotal: true,
          },
        },
        project: { select: { code: true, name: true } },
        department: true,
        lineItems: true,
        approvalSchema: {
          include: {
            approvalLevels: {
              include: { role: true },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const requestor = row.requestorId
      ? await prisma.user.findUnique({
          where: { id: row.requestorId },
          select: { name: true },
        })
      : null;

    const histories = await prisma.activityHistory.findMany({
      where: { entityType: 'PaymentRequest', entityId: id },
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: 'desc' },
    });

    const userRoleIds = session?.user?.id ? await getBudgetPlanUserRoleIds(session.user.id) : [];
    const canReview =
      !!session?.user?.id &&
      canUserActOnCurrentStep({
        status: row.status,
        approvalLevels: row.approvalSchema?.approvalLevels ?? [],
        histories: histories as unknown as BudgetPlanHistoryEntry[],
        userRoleIds,
        requestorId: row.requestorId ?? null,
        actorUserId: session.user.id,
      });

    const serialized = serializePaymentRequest(row as Record<string, unknown> & { lineItems?: Array<Record<string, unknown>> });
    const classificationOptions = await loadClassificationOptions();

    return NextResponse.json({
      ...serialized,
      budgetRequest: row.budgetRequest
        ? {
            ...row.budgetRequest,
            grandTotal: Number(row.budgetRequest.grandTotal),
          }
        : null,
      requestorName: requestor?.name ?? null,
      histories,
      canReview,
      ...classificationOptions,
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.paymentRequest.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        requestorId: true,
        status: true,
        category: true,
        categoryKeyIndex: true,
        costCenter: true,
        coa: true,
        type: true,
        opexAllocation: true,
        opexType: true,
      },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.requestorId !== session.user.id) {
      return NextResponse.json({ error: 'Only the requestor can edit this payment request' }, { status: 403 });
    }

    const {
      subject,
      description,
      notes,
      approvalSchemaId,
      budgetRequestId,
      currency,
      payeeName,
      bankAccount,
      vendorInvoiceNo,
      dateNeeded,
      paymentPurpose,
      departmentId,
      fiscalYear: bodyFiscalYear,
      originOffice: bodyOriginOffice,
      projectId: bodyProjectId,
    } = body;

    if (!subject || typeof subject !== 'string' || !payeeName || typeof payeeName !== 'string') {
      return NextResponse.json({ error: 'Subject and payee are required' }, { status: 400 });
    }
    if (!approvalSchemaId || typeof approvalSchemaId !== 'string') {
      return NextResponse.json({ error: 'Approval schema is required' }, { status: 400 });
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
    const resolvedBudgetRequestId: string | null =
      typeof budgetRequestId === 'string' && budgetRequestId.trim() !== '' ? budgetRequestId : null;
    let resolvedFiscalYear: number;
    let resolvedOriginOffice: string | null;
    let resolvedProjectId: string | null;
    let linkedBudgetRequestClassification: StoredRequestClassification | null = null;

    if (resolvedBudgetRequestId) {
      const br = await prisma.budgetRequest.findUnique({
        where: { id: resolvedBudgetRequestId },
        select: {
          id: true,
          status: true,
          departmentId: true,
          fiscalYear: true,
          originOffice: true,
          projectId: true,
          category: true,
          categoryKeyIndex: true,
          costCenter: true,
          coa: true,
          type: true,
          opexAllocation: true,
          opexType: true,
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
      resolvedOriginOffice =
        br.originOffice?.trim() || br.budgetPlan?.originOffice?.trim() || null;
      resolvedProjectId = br.projectId ?? br.budgetPlan?.projectId ?? null;
      linkedBudgetRequestClassification = {
        category: br.category,
        categoryKeyIndex: br.categoryKeyIndex,
        costCenter: br.costCenter,
        coa: br.coa,
        type: br.type,
        opexAllocation: br.opexAllocation,
        opexType: br.opexType,
      };
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

    const classification = mergeStoredClassification(
      mergeStoredClassification(
        classificationToStored(parseClassificationBody(body as Record<string, unknown>)),
        linkedBudgetRequestClassification
      ),
      {
        category: existing.category,
        categoryKeyIndex: existing.categoryKeyIndex,
        costCenter: existing.costCenter,
        coa: existing.coa,
        type: existing.type,
        opexAllocation: existing.opexAllocation,
        opexType: existing.opexType,
      }
    );

    const updated = await prisma.$transaction(async (tx) => {
      await tx.paymentRequestLineItem.deleteMany({ where: { paymentRequestId: id } });
      return (tx.paymentRequest as unknown as {
        update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
      }).update({
        where: { id },
        data: {
          subject: subject.trim(),
          description: typeof description === 'string' ? description : null,
          notes: typeof notes === 'string' ? notes : null,
          approvalSchemaId: approvalSchemaId || null,
          fiscalYear: resolvedFiscalYear,
          originOffice: resolvedOriginOffice,
          departmentId: resolvedDepartmentId,
          projectId: resolvedProjectId,
          budgetRequestId: resolvedBudgetRequestId,
          status: 'Draft',
          amount: normalizedGrandTotal,
          totalAmount,
          vatPercent: normalizedVatPercent,
          vatAmount: normalizedVatAmount,
          whtPercent: normalizedWhtPercent,
          whtAmount: normalizedWhtAmount,
          invoiceAmount: normalizedInvoiceAmount,
          currency:
            typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : 'IDR',
          payeeName: payeeName.trim(),
          bankAccount: typeof bankAccount === 'string' && bankAccount.trim() ? bankAccount.trim() : null,
          vendorInvoiceNo:
            typeof vendorInvoiceNo === 'string' && vendorInvoiceNo.trim() ? vendorInvoiceNo.trim() : null,
          dateNeeded: parseDateInputToDate(dateNeeded),
          paymentPurpose: typeof paymentPurpose === 'string' ? paymentPurpose : null,
          category: classification.category,
          categoryKeyIndex: classification.categoryKeyIndex,
          costCenter: classification.costCenter,
          coa: classification.coa,
          type: classification.type,
          opexAllocation: classification.opexAllocation,
          opexType: classification.opexType,
          lineItems: {
            create: lineItemsCreate,
          },
        },
        include: {
          lineItems: true,
          department: true,
          project: { select: { code: true, name: true } },
          budgetRequest: { select: { code: true, subject: true } },
          approvalSchema: {
            include: {
              approvalLevels: {
                include: { role: true },
                orderBy: { stepOrder: 'asc' },
              },
            },
          },
        },
      });
    });

    await logActivity({
      userId: session.user.id,
      entityType: 'PaymentRequest',
      entityId: id,
      entityCode: String(updated.code ?? ''),
      action: 'update',
      details: {
        subject: updated.subject,
        status: updated.status,
        previousStatus: existing.status,
        note: 'Payment request updated by requestor. Approval restarted.',
        amount: normalizedGrandTotal,
        totalAmount,
        lineItemCount: Array.isArray((updated as { lineItems?: unknown[] }).lineItems)
          ? (updated as { lineItems: unknown[] }).lineItems.length
          : 0,
      },
    });

    await notifyPaymentRequestAwaitingReview({
      requestId: id,
      actorUserId: session.user.id,
      requestCode: String(updated.code ?? ''),
      event: 'updated',
    });

    const histories = await prisma.activityHistory.findMany({
      where: { entityType: 'PaymentRequest', entityId: id },
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({
      ...serializePaymentRequest(updated as Record<string, unknown> & { lineItems?: Array<Record<string, unknown>> }),
      histories,
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
