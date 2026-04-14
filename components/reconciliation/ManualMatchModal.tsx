'use client';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { formatCurrency } from '@/lib/utils';
import { ReconciliationPlanOption, ReconciliationRow } from '@/types/reconciliation';

interface ManualMatchModalProps {
  open: boolean;
  row: ReconciliationRow | null;
  planOptions: ReconciliationPlanOption[];
  selectedPlanId: string;
  onChangePlan: (planId: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function ManualMatchModal({
  open,
  row,
  planOptions,
  selectedPlanId,
  onChangePlan,
  onClose,
  onSave,
}: ManualMatchModalProps) {
  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Manual Match Payment</h3>
          <p className="text-sm text-gray-600">
            Cocokkan incoming payment ke Budget Plan yang benar ketika auto-match tidak sesuai.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Incoming ID</span>
            <Input value={row.payment.incomingReferenceId} disabled />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Payment Document ID (Confins)</span>
            <Input value={row.payment.id} disabled />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Amount</span>
            <Input value={formatCurrency(row.paidAmount)} disabled />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-gray-700">Pilih Budget Plan</span>
            <Select value={selectedPlanId} onChange={(e) => onChangePlan(e.target.value)}>
              <option value="">Pilih budget plan...</option>
              {planOptions.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {`${plan.code} | ${plan.subject} | ${plan.departmentCode ?? '-'} | exp: ${formatCurrency(plan.expectedAmount)}`}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={!selectedPlanId}>
            Save Manual Match
          </Button>
        </div>
      </div>
    </div>
  );
}
