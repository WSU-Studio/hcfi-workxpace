'use client';

import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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
};

const emptyItem = (): BudgetRequestLineItemInput => ({
  id: crypto.randomUUID(),
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

export default function BudgetRequestItemsEditor({ items, onChange }: BudgetRequestItemsEditorProps) {
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
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200 text-gray-700">
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Unit Price</th>
              <th className="px-3 py-2 text-right font-medium">Subtotal</th>
              <th className="px-3 py-2 text-right font-medium">Deduction</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 focus:border-blue-500 focus:outline-none"
                    placeholder="Nama item"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={item.qty}
                    onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right focus:border-blue-500 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right focus:border-blue-500 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-800">{formatCurrency(getItemSubtotal(item))}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={item.deduction}
                    onChange={(e) => handleItemChange(item.id, 'deduction', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right focus:border-blue-500 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrency(getItemTotal(item))}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    disabled={items.length === 1}
                    className="inline-flex items-center rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
