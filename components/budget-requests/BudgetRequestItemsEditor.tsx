'use client';

import { Plus, Trash2 } from 'lucide-react';
import { createLocalId } from '@/lib/local-id';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBodyRow, TableCell, TableHead, TableHeaderRow } from '@/components/ui/Table';

export type BudgetRequestLineItemInput = {
  id: string;
  item: string;
  qty: number;
  unitPrice: number;
  deduction: number;
};

type BudgetRequestItemsEditorProps = {
  items: BudgetRequestLineItemInput[];
  onChange: (items: BudgetRequestLineItemInput[]) => void;
  summary: {
    transactionAmount: number;
    vatAmount: number;
    whtAmount: number;
    invoiceAmount: number;
    grandTotal: number;
  };
  taxConfig: {
    vatPercent: number;
    whtPercent: number;
  };
  onTaxChange: (tax: { vatPercent: number; whtPercent: number }) => void;
  /** Selected months; shows Grand total = item subtotal × months in the footer. */
  monthCount?: number;
};

const emptyItem = (): BudgetRequestLineItemInput => ({
  id: createLocalId(),
  item: '',
  qty: 1,
  unitPrice: 0,
  deduction: 0,
});

const toNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const getItemSubtotal = (item: BudgetRequestLineItemInput) => item.qty * item.unitPrice;
export const getItemTotal = (item: BudgetRequestLineItemInput) => Math.max(0, getItemSubtotal(item) - item.deduction);

export default function BudgetRequestItemsEditor({
  items,
  onChange,
  summary,
  taxConfig,
  onTaxChange,
  monthCount = 0,
}: BudgetRequestItemsEditorProps) {
  const handleItemChange = (id: string, field: keyof Omit<BudgetRequestLineItemInput, 'id'>, value: string) => {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        if (field === 'item') return { ...item, item: value };
        return { ...item, [field]: toNumber(value) };
      })
    );
  };

  const handleAdd = () => onChange([...items, emptyItem()]);

  const handleRemove = (id: string) => onChange(items.filter((item) => item.id !== id));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <Table className="min-w-[860px] text-sm">
          <thead className="bg-gray-50">
            <TableHeaderRow className="border-gray-200 text-gray-700">
              <TableHead className="px-3 py-2">Item</TableHead>
              <TableHead className="px-3 py-2 text-right">Qty</TableHead>
              <TableHead className="px-3 py-2 text-right">Unit Price</TableHead>
              <TableHead className="px-3 py-2 text-right">Subtotal</TableHead>
              <TableHead className="px-3 py-2 text-right">Deduction</TableHead>
              <TableHead className="px-3 py-2 text-right">Total</TableHead>
              <TableHead className="px-3 py-2 text-center">Action</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {items.map((item) => (
              <TableBodyRow key={item.id} className="border-gray-100">
                <TableCell className="px-3 py-2">
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 focus:border-blue-500 focus:outline-none"
                    placeholder="Nama item"
                  />
                </TableCell>
                <TableCell className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={item.qty}
                    onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right focus:border-blue-500 focus:outline-none"
                  />
                </TableCell>
                <TableCell className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right focus:border-blue-500 focus:outline-none"
                  />
                </TableCell>
                <TableCell className="px-3 py-2 text-right font-medium text-gray-800">{formatCurrency(getItemSubtotal(item))}</TableCell>
                <TableCell className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={item.deduction}
                    onChange={(e) => handleItemChange(item.id, 'deduction', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right focus:border-blue-500 focus:outline-none"
                  />
                </TableCell>
                <TableCell className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrency(getItemTotal(item))}</TableCell>
                <TableCell className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    disabled={items.length === 1}
                    className="inline-flex items-center rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableBodyRow>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr className="border-t border-gray-200">
              <td colSpan={5} className="px-3 py-3 text-right font-semibold text-gray-700">Transaction Amount</td>
              <td colSpan={2} className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrency(summary.transactionAmount)}</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td colSpan={3} className="px-3 py-3 text-right font-medium text-gray-700">VAT / PPN</td>
              <td colSpan={2} className="px-3 py-2">
                <div className="flex justify-end">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={taxConfig.vatPercent}
                    onChange={(e) => onTaxChange({ ...taxConfig, vatPercent: toNumber(e.target.value) })}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right focus:border-blue-500 focus:outline-none"
                  />
                  <span className="ml-2 self-center text-sm text-gray-500">%</span>
                </div>
              </td>
              <td colSpan={2} className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrency(summary.vatAmount)}</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td colSpan={5} className="px-3 py-3 text-right font-medium text-gray-700">Invoice Amount</td>
              <td colSpan={2} className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrency(summary.invoiceAmount)}</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td colSpan={3} className="px-3 py-3 text-right font-medium text-gray-700">WHT / PPh</td>
              <td colSpan={2} className="px-3 py-2">
                <div className="flex justify-end">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={taxConfig.whtPercent}
                    onChange={(e) => onTaxChange({ ...taxConfig, whtPercent: toNumber(e.target.value) })}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right focus:border-blue-500 focus:outline-none"
                  />
                  <span className="ml-2 self-center text-sm text-gray-500">%</span>
                </div>
              </td>
              <td colSpan={2} className="px-3 py-3 text-right font-semibold text-gray-900">({formatCurrency(summary.whtAmount)})</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td colSpan={5} className="px-3 py-3 text-right text-sm font-semibold text-gray-700">
                Item subtotal (inc. tax)
              </td>
              <td colSpan={2} className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                {formatCurrency(summary.grandTotal)}
              </td>
            </tr>
            {monthCount > 0 ? (
              <tr className="border-t border-gray-200 bg-green-50">
                <td colSpan={5} className="px-3 py-3 text-right text-base font-bold text-gray-800">
                  Grand total
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({formatCurrency(summary.grandTotal)} × {monthCount} month
                    {monthCount === 1 ? '' : 's'})
                  </span>
                </td>
                <td colSpan={2} className="px-3 py-3 text-right text-base font-bold text-gray-900">
                  {formatCurrency(summary.grandTotal * monthCount)}
                </td>
              </tr>
            ) : null}
          </tfoot>
        </Table>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
      >
        <Plus className="h-4 w-4" />
        Add Item
      </button>
    </div>
  );
}
