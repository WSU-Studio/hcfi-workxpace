import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import {
  canUserActOnCurrentStep,
  getBudgetPlanUserRoleIds,
} from '@/lib/budget-plan-review-eligibility';
import type { BudgetPlanHistoryEntry } from '@/lib/budget-plan-approval-display';
import { normalizePaymentRequestBody } from '@/lib/payment-request-normalize';
import { toNumber } from '@/lib/budget-request-normalize';
import { notifyPaymentRequestAwaitingReview } from '@/lib/payment-request-notifications';
import { assertCanActOnDepartment, buildDepartmentScope } from '@/lib/access/cross-department';
import { ALL_FISCAL_YEARS, assertFiscalYearWritable, parseFiscalYearParam } from '@/lib/fiscal-year';
import {
  classificationToStored,
  mergeStoredClassification,
  parseClassificationBody,
  type StoredRequestClassification,
} from '@/lib/request-classification';
import { parseDateInputToDate, requiredPaymentRequestWriteFieldsFromBody, validateRequiredPaymentBankFields, validateRequiredPaymentRequestWriteFields, validateRequiredVendorInvoiceFields } from '@/lib/payment-requests/form';
import { supportingDocsForPersistence } from '@/lib/supporting-docs';
import {
  approvalLevelsOf,
  captureApprovalSchemaSnapshot,
} from '@/lib/approval-schema-snapshot';

export const dynamic = 'force-dynamic';

const paymentRequestListInclude = Prisma.validator<Prisma.PaymentRequestInclude>()({
  budgetRequest: { select: { code: true, subject: true } },
  department: { select: { name: true } },
  lineItems: { select: { id: true } },
  approvalSchema: {
    include: {
      approvalLevels: {
        include: { pics: { select: { userId: true } } },
        orderBy: { stepOrder: 'asc' },
      },
    },
  },
});

type PaymentRequestListRow = Prisma.PaymentRequestGetPayload<{
  include: typeof paymentRequestListInclude;
}>;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRoleIds = session?.user?.id ? await getBudgetPlanUserRoleIds(session.user.id) : [];
    const { searchParams } = new URL(request.url);

    // Cross-department view scope: applies both to the PR list and to the
    // "link BR" dropdown so visibility rules stay consistent across the page.
    const departmentScope = buildDepartmentScope(session);
    // Optional fiscal-year scope (driven by the FY filter dropdown). Applied
    // only to the PR list — the BR picker dropdown stays unrestricted by FY
    // so users can link to any approved BR they have access to.
    const fiscalYearFilter = parseFiscalYearParam(searchParams.get('fiscalYear'));
    const prListWhere = {
      ...(departmentScope ?? {}),
      ...(fiscalYearFilter !== null && fiscalYearFilter !== ALL_FISCAL_YEARS
        ? { fiscalYear: fiscalYearFilter }
        : {}),
    };

    // Load approved BRs independently so the PR "link BR" dropdown still works if the payment list query fails
    // (e.g. schema drift on payment_requests / line_items) — previously a thrown findMany hid all BR options.
    const [prSettled, brSettled] = await Promise.allSettled([
      prisma.paymentRequest.findMany({
        where: Object.keys(prListWhere).length > 0 ? prListWhere : undefined,
        include: paymentRequestListInclude,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.budgetRequest.findMany({
        where: { status: { equals: 'Approved', mode: 'insensitive' }, ...(departmentScope ?? {}) },
        select: {
          id: true,
          code: true,
          subject: true,
          description: true,
          departmentId: true,
          grandTotal: true,
          fiscalYear: true,
          originOffice: true,
          projectId: true,
          vatPercent: true,
          whtPercent: true,
          category: true,
          categoryKeyIndex: true,
          costCenter: true,
          coa: true,
          type: true,
          opexAllocation: true,
          opexType: true,
          budgetPlan: { select: { originOffice: true, projectId: true } },
          lineItems: {
            orderBy: { id: 'asc' },
            select: { item: true, qty: true, unitPrice: true, deduction: true },
          },
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
            vatPercent: Number(br.vatPercent),
            whtPercent: Number(br.whtPercent),
            lineItems: br.lineItems.map((li) => ({
              item: li.item,
              qty: li.qty,
              unitPrice: Number(li.unitPrice),
              deduction: Number(li.deduction),
            })),
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

  // Batched history lookup for accurate multi-step `canReview` — see BR list
  // route for the rationale; single query keyed by entityId.
  const rowIds = rows.map((row) => row.id);
  const allHistories = rowIds.length
    ? await prisma.activityHistory.findMany({
        where: { entityType: 'PaymentRequest', entityId: { in: rowIds } },
        select: { entityId: true, action: true, details: true, timestamp: true },
      })
    : [];
  const historiesByEntity = new Map<string, BudgetPlanHistoryEntry[]>();
  for (const h of allHistories) {
    const bucket = historiesByEntity.get(h.entityId) ?? [];
    bucket.push(h as unknown as BudgetPlanHistoryEntry);
    historiesByEntity.set(h.entityId, bucket);
  }

  return rows.map((row) => {
    const { approvalSchema: _liveSchema, approvalSchemaSnapshot: _snapshot, lineItems, ...r } = row;
    return {
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
      canUserActOnCurrentStep({
        status: r.status,
        approvalLevels: approvalLevelsOf(row),
        histories: historiesByEntity.get(r.id) ?? [],
        userRoleIds,
        requestorId: r.requestorId ?? null,
        actorUserId: session.user.id,
      }),
  };
  });
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
      bankName,
      bankAccount,
      vendorInvoiceNo,
      dateNeeded,
      paymentPurpose,
      fiscalYear: bodyFiscalYear,
      originOffice: bodyOriginOffice,
      projectId: bodyProjectId,
    } = body;

    if (!subject || typeof subject !== 'string' || !payeeName || typeof payeeName !== 'string') {
      return NextResponse.json({ error: 'Missing required fields (subject, payee)' }, { status: 400 });
    }
    const writeFieldsError = validateRequiredPaymentRequestWriteFields(
      requiredPaymentRequestWriteFieldsFromBody({
        budgetRequestId,
        projectId: bodyProjectId,
        description,
        notes,
      }),
    );
    if (writeFieldsError) {
      return NextResponse.json({ error: writeFieldsError }, { status: 400 });
    }
    if (!approvalSchemaId || typeof approvalSchemaId !== 'string') {
      return NextResponse.json({ error: 'Approval schema is required' }, { status: 400 });
    }

    const vendorFieldsError = validateRequiredVendorInvoiceFields({
      vendorInvoiceNo,
      dateNeeded,
    });
    if (vendorFieldsError) {
      return NextResponse.json({ error: vendorFieldsError }, { status: 400 });
    }

    const bankFieldsError = validateRequiredPaymentBankFields({
      bankName,
      bankAccount,
      currency,
      paymentPurpose,
    });
    if (bankFieldsError) {
      return NextResponse.json({ error: bankFieldsError }, { status: 400 });
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
    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isFinite(normalizedGrandTotal) || normalizedGrandTotal <= 0) {
      return NextResponse.json(
        { error: 'Grand total must be greater than 0' },
        { status: 400 },
      );
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
      resolvedProjectId =
        br.projectId ??
        br.budgetPlan?.projectId ??
        (typeof bodyProjectId === 'string' && bodyProjectId.trim() !== ''
          ? bodyProjectId.trim()
          : null);
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

    if (!resolvedProjectId) {
      return NextResponse.json({ error: 'Project is required' }, { status: 400 });
    }

    const fiscalYearVerdict = assertFiscalYearWritable(
      resolvedFiscalYear,
      resolvedBudgetRequestId ? [resolvedFiscalYear] : [],
    );
    if (!fiscalYearVerdict.ok) {
      return NextResponse.json({ error: fiscalYearVerdict.error }, { status: 400 });
    }
    resolvedFiscalYear = fiscalYearVerdict.year;

    // Defense in depth: enforce the cross-department permission server-side.
    // Ran here because `resolvedDepartmentId` may have been overridden by the
    // linked Budget Request (BR.departmentId is the source of truth when a BR
    // is selected). Users without permission cannot back-door into another
    // department by selecting an Approved BR from elsewhere.
    const departmentVerdict = assertCanActOnDepartment(session, resolvedDepartmentId);
    if (!departmentVerdict.ok) {
      return NextResponse.json({ error: departmentVerdict.message }, { status: 403 });
    }

    const dept = await prisma.department.findUnique({ where: { id: resolvedDepartmentId } });
    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 400 });
    }
    if (!dept.isActive) {
      return NextResponse.json(
        { error: `Department ${dept.code} is inactive and cannot be selected` },
        { status: 400 },
      );
    }

    const snapshotResult = await captureApprovalSchemaSnapshot(approvalSchemaId);
    if (!snapshotResult.ok) {
      return NextResponse.json({ error: snapshotResult.error }, { status: 400 });
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

    const classification = mergeStoredClassification(
      classificationToStored(parseClassificationBody(body as Record<string, unknown>)),
      linkedBudgetRequestClassification
    );

    const pr = await prisma.paymentRequest.create({
      data: {
        code,
        subject: subject.trim(),
        description: typeof description === 'string' ? description : '',
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
        bankName: typeof bankName === 'string' && bankName.trim() ? bankName.trim() : null,
        bankAccount: typeof bankAccount === 'string' && bankAccount.trim() ? bankAccount.trim() : null,
        vendorInvoiceNo:
          typeof vendorInvoiceNo === 'string' && vendorInvoiceNo.trim() ? vendorInvoiceNo.trim() : null,
        dateNeeded: parseDateInputToDate(dateNeeded),
        paymentPurpose: typeof paymentPurpose === 'string' ? paymentPurpose : null,
        notes: typeof notes === 'string' ? notes.trim() : notes,
        approvalSchemaId: approvalSchemaId || null,
        approvalSchemaSnapshot: snapshotResult.snapshot,
        supportingDocs: supportingDocsForPersistence((body as { supportingDocs?: unknown }).supportingDocs),
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
        bankAccount: pr.bankAccount ? '***' : null,
        departmentName: pr.department?.name ?? null,
        budgetRequestCode: pr.budgetRequest?.code ?? null,
        approvalSchemaId: pr.approvalSchemaId,
      },
    });

    await notifyPaymentRequestAwaitingReview({
      requestId: pr.id,
      actorUserId: session.user.id,
      requestCode: pr.code,
      event: 'created',
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
