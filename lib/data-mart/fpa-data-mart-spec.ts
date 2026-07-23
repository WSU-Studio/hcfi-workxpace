/**
 * Pedoman FP&A × Data Mart — mapping kolom nominal vs sisi kode staging/API.
 * Baris pertama array = guideline klien; fieldKey mengacu kolom/canonical slug di codebase.
 */

export type FpaFieldSourceBucket = 'confinsEgL' | 'ebudgetDict' | 'ebudgetManual' | 'computed' | 'mixed';

export type FpaSpecRow = {
  no: number;
  fieldLabel: string;
  fieldKey: string;
  source: FpaFieldSourceBucket;
  description: string;
  /** Nama API kemungkinan (Confins Payment Request / E-GL) — bisa berubah. */
  apiHints?: string[];
  /** Nama field pada model Prisma staging (camelCase) jika sudah ada. */
  stagingColumn?: string;
};

/** Semua guideline (termasuk yang belum punya kolom dedicates — lihat notes). */
export const FPA_DATA_MART_SPEC_ROWS: readonly FpaSpecRow[] = [
  { no: 1, fieldLabel: 'Data Interface Source', fieldKey: 'dataInterfaceSource', source: 'mixed', description: 'Confins vs E-GL; bisa dimapping sistem.', stagingColumn: 'dataInterfaceSource' },
  { no: 2, fieldLabel: 'Interface ID', fieldKey: 'interfaceId', source: 'confinsEgL', description: '', apiHints: ['InterfaceID'], stagingColumn: 'interfaceId' },
  { no: 3, fieldLabel: 'Budget Year', fieldKey: 'fiscalYear', source: 'ebudgetDict', description: 'Periode Budget Plan.', stagingColumn: 'fiscalYear' },
  { no: 4, fieldLabel: 'Period', fieldKey: 'period', source: 'confinsEgL', description: 'YYYY-MM dari interface atau derivasi konsisten.', stagingColumn: 'period' },
  { no: 5, fieldLabel: 'Month', fieldKey: 'month', source: 'confinsEgL', description: '', apiHints: ['Month'], stagingColumn: 'month' },
  { no: 6, fieldLabel: 'Quarter', fieldKey: 'quarter', source: 'computed', description: '', stagingColumn: 'quarter' },
  { no: 7, fieldLabel: 'Year', fieldKey: 'year', source: 'confinsEgL', description: 'Setara FY kalender/periode pembukuan.', stagingColumn: 'fiscalYear' },
  { no: 8, fieldLabel: 'Origin Office', fieldKey: 'originOffice', source: 'mixed', description: 'Prefer API Org; fallback plan eBudget.', apiHints: ['OriginOffice'], stagingColumn: 'originOffice' },
  { no: 9, fieldLabel: 'Division Name', fieldKey: 'divisionName', source: 'ebudgetDict', description: 'Workxpace Division master via Department mapping (not from Confins)', stagingColumn: 'divisionName', apiHints: [] },
  { no: 10, fieldLabel: 'Department Name', fieldKey: 'departmentName', source: 'mixed', description: 'Prefer API Payment Request.', apiHints: ['DepartmentName'], stagingColumn: 'departmentName' },
  { no: 11, fieldLabel: 'GL Account', fieldKey: 'glAccountCode', source: 'confinsEgL', description: '', stagingColumn: 'glAccountCode' },
  { no: 12, fieldLabel: 'GL Account Name', fieldKey: 'glAccountName', source: 'confinsEgL', description: '', stagingColumn: 'glAccountName' },
  { no: 13, fieldLabel: 'Expense Category', fieldKey: 'expenseCategory', source: 'ebudgetDict', description: '', stagingColumn: 'expenseCategory' },
  { no: 14, fieldLabel: 'Expense Type (Capex/Opex)', fieldKey: 'expenseTypeFp', source: 'ebudgetManual', description: 'Klasifikasi review BR.', stagingColumn: 'expenseTypeFp' },
  { no: 15, fieldLabel: 'Category Key Index', fieldKey: 'categoryKeyIndex', source: 'ebudgetDict', description: '', stagingColumn: 'categoryKeyIndex' },
  { no: 16, fieldLabel: 'Opex Allocation', fieldKey: 'opexAllocation', source: 'mixed', description: '', stagingColumn: 'opexAllocation' },
  { no: 17, fieldLabel: 'Opex Type (Fixed/Variable)', fieldKey: 'opexType', source: 'ebudgetManual', description: '', stagingColumn: 'opexType' },
  { no: 18, fieldLabel: 'Project Code', fieldKey: 'projectCode', source: 'ebudgetDict', description: '', stagingColumn: 'projectCode' },
  { no: 19, fieldLabel: 'Project Name', fieldKey: 'projectName', source: 'ebudgetDict', description: '', stagingColumn: 'projectName' },
  { no: 20, fieldLabel: 'BR / GR No', fieldKey: 'budgetRequestCode', source: 'ebudgetDict', description: '', stagingColumn: 'budgetRequestCode' },
  { no: 21, fieldLabel: 'BR / GR Requestor', fieldKey: 'requestorName', source: 'ebudgetDict', description: '', stagingColumn: 'requestorName' },
  { no: 22, fieldLabel: 'BR / GR Approved Date', fieldKey: 'budgetRequestApprovedAt', source: 'ebudgetDict', description: 'Saat ini proxy: updatedAt jika status Approved — perlu field approval resmi.', stagingColumn: 'budgetRequestApprovedAt' },
  { no: 23, fieldLabel: 'Payment Request No.', fieldKey: 'paymentRequestNo', source: 'confinsEgL', description: '', apiHints: ['PaymentRequestNo'], stagingColumn: 'paymentRequestNo' },
  { no: 24, fieldLabel: 'Journal No.', fieldKey: 'journalNo', source: 'confinsEgL', description: '', apiHints: ['JournalNo', 'JournalNumber'], stagingColumn: 'journalNo' },
  { no: 25, fieldLabel: 'Voucher E-GL', fieldKey: 'voucherEgl', source: 'confinsEgL', description: '', apiHints: ['VoucherEgl', 'VoucherNo'], stagingColumn: 'voucherEgl' },
  { no: 26, fieldLabel: 'Request Date', fieldKey: 'paymentRequestDate', source: 'confinsEgL', description: '', apiHints: ['RequestDate', 'PaymentRequestDate', 'postDate'], stagingColumn: 'paymentRequestDate' },
  { no: 27, fieldLabel: 'Request By', fieldKey: 'requestedByEmail', source: 'confinsEgL', description: '', apiHints: ['RequestBy', 'RequestedBy', 'RequestByEmail'], stagingColumn: 'requestedByEmail' },
  { no: 28, fieldLabel: 'Invoice Date', fieldKey: 'invoiceDate', source: 'confinsEgL', description: '', apiHints: ['InvoiceDate'], stagingColumn: 'invoiceDate' },
  { no: 29, fieldLabel: 'Invoice No.', fieldKey: 'invoiceNo', source: 'confinsEgL', description: '', apiHints: ['InvoiceNo'], stagingColumn: 'invoiceNo' },
  { no: 30, fieldLabel: 'Business Role', fieldKey: 'businessRole', source: 'confinsEgL', description: '', stagingColumn: 'businessRole' },
  { no: 31, fieldLabel: 'Activity', fieldKey: 'activityLabel', source: 'confinsEgL', description: '', stagingColumn: 'activityLabel' },
  { no: 32, fieldLabel: 'Sub Activity', fieldKey: 'subActivityLabel', source: 'confinsEgL', description: '', stagingColumn: 'subActivityLabel' },
  { no: 33, fieldLabel: 'Vendor Name', fieldKey: 'vendorName', source: 'confinsEgL', description: '', stagingColumn: 'vendorName' },
  { no: 34, fieldLabel: 'Description', fieldKey: 'paymentDescription', source: 'confinsEgL', description: '', stagingColumn: 'paymentDescription' },
  { no: 35, fieldLabel: 'Cost Driver Metric', fieldKey: 'costDriverMetric', source: 'ebudgetManual', description: 'Agregasi Σ qty dari line items BR untuk grain pembayaran (bukan grain baris invoice).', stagingColumn: 'costDriverMetric' },
  { no: 36, fieldLabel: 'Cost per Unit', fieldKey: 'costPerUnit', source: 'computed', description: 'Origin Amount ÷ metric (FP guideline). Di staging: paidAmount ÷ Σqty.', stagingColumn: 'costPerUnit' },
  { no: 37, fieldLabel: 'Origin Amount (Actual)', fieldKey: 'paidAmount', source: 'confinsEgL', description: '', stagingColumn: 'paidAmount' },
  { no: 38, fieldLabel: 'BR / GR Approved Amount', fieldKey: 'expectedAmount', source: 'ebudgetDict', description: 'Grand total / expected pada simpan rekonsiliasi.', stagingColumn: 'expectedAmount' },
  { no: 39, fieldLabel: 'Plan Amount', fieldKey: 'planAmount', source: 'ebudgetDict', description: `Alokasi bulan plan (budget_plan_allocations bulan rekonsiliasi). Grain: header BR + bulan filter.`, stagingColumn: 'planAmount' },
] as const;
