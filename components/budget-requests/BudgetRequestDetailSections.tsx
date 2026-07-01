import RichTextContent from '@/components/ui/RichTextContent';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';
import { getRequestStatusDisplay } from '@/lib/budget-plan-approval-display';
import { formatCurrency, formatDate } from '@/lib/utils';

export type BudgetRequestDetailSectionsData = {
  code: string;
  subject: string;
  description: string | null;
  notes: string | null;
  requestDate: string;
  requestorName?: string | null;
  fiscalYear: number;
  status: string;
  budgetPlan: {
    code: string;
    subject: string;
    opexType?: string | null;
    project?: { name: string } | null;
    category?: { name: string } | null;
    costCenter?: { name: string } | null;
    categoryKeyIndex?: { name: string } | null;
    opexAllocation?: { name: string } | null;
  };
  department: { name: string };
  lineItems: {
    item: string;
    qty: number;
    unitPrice: number;
    subtotal?: number;
    deduction?: number;
    total: number;
  }[];
};

type AmountTotals = {
  transactionAmount: number;
  vatAmount: number;
  whtAmount: number;
  invoiceAmount: number;
  grandTotal: number;
};

type BudgetRequestDetailSummarySectionProps = {
  data: BudgetRequestDetailSectionsData;
  originOfficeLabel: string;
};

export function BudgetRequestDetailSummarySection({
  data,
  originOfficeLabel,
}: BudgetRequestDetailSummarySectionProps) {
  const statusDisplay = getRequestStatusDisplay(data.status);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:gap-y-2">
      <div>
        <span className="text-gray-500">ID:</span> {data.code}
      </div>
      <div>
        <span className="text-gray-500">Request Date:</span> {formatDate(data.requestDate)}
      </div>
      <div>
        <span className="text-gray-500">Requestor:</span> {data.requestorName ?? '-'}
      </div>
      <div>
        <span className="text-gray-500">Budget Plan:</span>{' '}
        {data.budgetPlan ? `${data.budgetPlan.code} - ${data.budgetPlan.subject}` : '-'}
      </div>
      <div>
        <span className="text-gray-500">Department:</span> {data.department?.name ?? '-'}
      </div>
      <div>
        <span className="text-gray-500">Project:</span> {data.budgetPlan?.project?.name ?? '-'}
      </div>
      <div>
        <span className="text-gray-500">Fiscal Year:</span> {data.fiscalYear}
      </div>
      <div>
        <span className="text-gray-500">Origin Office:</span> {originOfficeLabel}
      </div>
      <div>
        <span className="text-gray-500">Status:</span>{' '}
        <span className={`rounded px-2 py-0.5 text-sm ${statusDisplay.chipClass}`}>{statusDisplay.label}</span>
      </div>
      <div className="md:col-span-2 print:col-span-2">
        <span className="text-gray-500">Description:</span>
        <div className="mt-2 min-h-100 rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <RichTextContent value={data.description} />
        </div>
      </div>
      <div className="md:col-span-2 print:col-span-2">
        <span className="text-gray-500">Notes:</span>
        <p className="mt-1 whitespace-pre-wrap text-gray-700">{data.notes || '-'}</p>
      </div>
    </div>
  );
}

type BudgetRequestLineItemsSectionProps = {
  lineItems: BudgetRequestDetailSectionsData['lineItems'];
  totals: AmountTotals;
};

export function BudgetRequestLineItemsSection({ lineItems, totals }: BudgetRequestLineItemsSectionProps) {
  if (!lineItems.length) return null;

  const { transactionAmount, vatAmount, whtAmount, invoiceAmount, grandTotal } = totals;

  return (
    <Table>
      <thead>
        <TableHeaderRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit Price</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
          <TableHead className="text-right">Deduction</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableHeaderRow>
      </thead>
      <tbody>
        {lineItems.map((li, index) => (
          <TableBodyRow key={`${li.item}-${index}`}>
            <TableCell>{li.item}</TableCell>
            <TableCell className="text-right">{li.qty}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(li.unitPrice ?? 0))}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(Number(li.subtotal ?? li.qty * Number(li.unitPrice ?? 0)))}
            </TableCell>
            <TableCell className="text-right">{formatCurrency(Number(li.deduction ?? 0))}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(li.total ?? 0))}</TableCell>
          </TableBodyRow>
        ))}
        <TableBodyRow className="bg-gray-50 font-medium">
          <TableCell colSpan={5} className="text-right">
            Transaction Amount
          </TableCell>
          <TableCell className="text-right">{formatCurrency(transactionAmount)}</TableCell>
        </TableBodyRow>
        <TableBodyRow>
          <TableCell colSpan={5} className="text-right">
            VAT / PPN
          </TableCell>
          <TableCell className="text-right">{formatCurrency(vatAmount)}</TableCell>
        </TableBodyRow>
        <TableBodyRow>
          <TableCell colSpan={5} className="text-right">
            Invoice Amount
          </TableCell>
          <TableCell className="text-right">{formatCurrency(invoiceAmount)}</TableCell>
        </TableBodyRow>
        <TableBodyRow>
          <TableCell colSpan={5} className="text-right">
            WHT / PPh
          </TableCell>
          <TableCell className="text-right">({formatCurrency(whtAmount)})</TableCell>
        </TableBodyRow>
        <TableBodyRow className="bg-green-200/60 text-base font-semibold hover:bg-green-200/80">
          <TableCell colSpan={5} className="text-right">
            Grandtotal
          </TableCell>
          <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
        </TableBodyRow>
      </tbody>
    </Table>
  );
}

type BudgetRequestClassificationSectionProps = {
  data: BudgetRequestDetailSectionsData;
  accountLabel: string;
  opexType: string;
};

export function BudgetRequestClassificationSection({
  data,
  accountLabel,
  opexType,
}: BudgetRequestClassificationSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium">Classification</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-gray-500">Cost Center:</span> {data.budgetPlan?.costCenter?.name ?? ''}
        </div>
        <div>
          <span className="text-gray-500">Category:</span> {data.budgetPlan?.category?.name ?? ''}
        </div>
        <div>
          <span className="text-gray-500">Category Key Index:</span> {data.budgetPlan?.categoryKeyIndex?.name ?? ''}
        </div>
        <div>
          <span className="text-gray-500">Kode Akun:</span> {accountLabel}
        </div>
        <div>
          <span className="text-gray-500">Type:</span> {opexType}
        </div>
        <div>
          <span className="text-gray-500">Opex Allocation:</span> {data.budgetPlan?.opexAllocation?.name ?? ''}
        </div>
      </div>
    </div>
  );
}
