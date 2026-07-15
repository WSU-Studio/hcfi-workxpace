'use client';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { formatSignedCurrency } from '@/lib/utils';
import { ReconciliationRequestOption, ReconciliationRow } from '@/types/reconciliation';

interface ManualMatchModalProps {
  open: boolean;
  row: ReconciliationRow | null;
  requestOptions: ReconciliationRequestOption[];
  selectedRequestId: string;
  onChangeRequest: (requestId: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function ManualMatchModal({
  open,
  row,
  requestOptions,
  selectedRequestId,
  onChangeRequest,
  onClose,
  onSave,
}: ManualMatchModalProps) {
  if (!open || !row) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
      panelClassName="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl"
    >
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Manual Match Payment</h3>
          <p className="text-sm text-gray-600">
            Cocokkan incoming payment ke Budget Request yang benar ketika auto-match tidak sesuai.
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
            <Input value={formatSignedCurrency(row.paidAmount)} disabled />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-gray-700">Pilih Budget Request</span>
            <Select value={selectedRequestId} onChange={(e) => onChangeRequest(e.target.value)}>
              <option value="">Pilih budget request...</option>
              {requestOptions.map((request) => (
                <option key={request.id} value={request.id}>
                  {`${request.code} | ${request.subject} | plan: ${request.budgetPlanCode ?? '-'} | exp: ${formatSignedCurrency(request.expectedAmount)}`}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={!selectedRequestId}>
            Save Manual Match
          </Button>
        </div>
    </Modal>
  );
}
