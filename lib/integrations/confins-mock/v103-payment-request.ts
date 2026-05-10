import type { ConfinsCashDisbursement } from './types';

export type ConfinsV103PaymentRequestRow = {
  InterfaceID: string;
  PaymentRequestNo: string;
  JournalNo: string;
  RequestDate: string;
  RequestBy: string;
  InvoiceDate: string;
  InvoiceNo: string;
  PostDate: string;
  Year: number;
  Month: number;
  Quarter: string;
  OriginOffice: string;
  DepartmentName: string;
  GLAccount: string;
  GLAccountName: string;
  BusinessRole: string;
  Activity: string;
  SubActivity: string;
  VendorName: string;
  Description: string;
  Currency: string;
  Amount: number;
  EbudgetRequestCode: string;
  Source: string;
};

type ConfinsV103Envelope = {
  ReturnCode: string;
  ReturnMessage: string;
  ReturnObject: ConfinsV103PaymentRequestRow[];
};

function quarterFromMonth(month: number): string {
  return `Q${Math.ceil(month / 3)}`;
}

function ymd(dateIso: string): string {
  const d = new Date(dateIso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function buildV103EnvelopeFromPayments(
  payments: ConfinsCashDisbursement[]
): ConfinsV103Envelope {
  const rows: ConfinsV103PaymentRequestRow[] = payments.map((p, idx) => {
    const source = p.source === 'E-GL' ? 'EGL (Manual Journal)' : 'Confins (FMS_Payment Request)';
    return {
      InterfaceID: p.interfaceId ?? `IF-${p.id}`,
      PaymentRequestNo: p.paymentRequestNo ?? `99PYREQ${p.fiscalYear}${String(p.month).padStart(2, '0')}${String(idx + 1).padStart(5, '0')}`,
      JournalNo: p.journalNo ?? `99PRQ${p.fiscalYear}${String(p.month).padStart(2, '0')}${String(idx + 1).padStart(5, '0')}`,
      RequestDate: p.requestDate ? ymd(p.requestDate) : ymd(p.postDate),
      RequestBy: p.requestBy ?? 'requestor.mock@company.local',
      InvoiceDate: p.invoiceDate ? ymd(p.invoiceDate) : ymd(p.postDate),
      InvoiceNo: p.invoiceNo ?? `INV-${p.id}`,
      PostDate: ymd(p.postDate),
      Year: p.fiscalYear,
      Month: p.month,
      Quarter: quarterFromMonth(p.month),
      OriginOffice: 'HEAD OFFICE',
      DepartmentName: p.departmentCode ?? 'N/A',
      GLAccount: p.glAccountCode,
      GLAccountName: p.glAccountName,
      BusinessRole: p.businessRole ?? 'GENERAL',
      Activity: p.activity ?? p.glAccountName,
      SubActivity: p.subActivity ?? p.description,
      VendorName: p.vendorName ?? 'PT MOCK VENDOR',
      Description: p.description,
      Currency: p.currency,
      Amount: Number(p.amount),
      EbudgetRequestCode: p.incomingReferenceId,
      Source: source,
    };
  });

  return {
    ReturnCode: '00',
    ReturnMessage: 'SUCCESS',
    ReturnObject: rows,
  };
}

export function mapV103RowsToPayments(rows: ConfinsV103PaymentRequestRow[]): ConfinsCashDisbursement[] {
  return rows.map((r, idx) => {
    const year = Number(r.Year) || new Date().getFullYear();
    const month = Number(r.Month) || 1;
    const postDateIso = new Date(r.PostDate).toISOString();
    return {
      id: `${r.InterfaceID}-${idx + 1}`,
      incomingReferenceId: r.EbudgetRequestCode,
      voucherNumber: r.JournalNo,
      postDate: postDateIso,
      fiscalYear: year,
      month,
      source: r.Source.includes('EGL') ? 'E-GL' : 'Core',
      ebudgetPlanId: null,
      ebudgetPlanCode: null,
      ebudgetRequestId: null,
      ebudgetRequestCode: r.EbudgetRequestCode,
      description: r.Description,
      glAccountCode: r.GLAccount,
      glAccountName: r.GLAccountName,
      amount: String(r.Amount),
      currency: r.Currency || 'IDR',
      departmentId: null,
      departmentCode: null,
      interfaceId: r.InterfaceID,
      paymentRequestNo: r.PaymentRequestNo,
      journalNo: r.JournalNo,
      requestDate: r.RequestDate,
      requestBy: r.RequestBy,
      invoiceDate: r.InvoiceDate,
      invoiceNo: r.InvoiceNo,
      businessRole: r.BusinessRole,
      activity: r.Activity,
      subActivity: r.SubActivity,
      vendorName: r.VendorName,
      rawPayload: r,
      updatedAt: new Date().toISOString(),
    };
  });
}
