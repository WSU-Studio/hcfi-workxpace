'use client';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  BudgetRequestClassificationSection,
  BudgetRequestDetailSummarySection,
  BudgetRequestLineItemsSection,
  type BudgetRequestDetailSectionsData,
} from '@/components/budget-requests/BudgetRequestDetailSections';

type BudgetRequestDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  data: BudgetRequestDetailSectionsData;
  originOfficeLabel: string;
  accountLabel: string;
  opexType: string;
  totals: {
    transactionAmount: number;
    vatAmount: number;
    whtAmount: number;
    invoiceAmount: number;
    grandTotal: number;
  };
};

export default function BudgetRequestDetailModal({
  isOpen,
  onClose,
  data,
  originOfficeLabel,
  accountLabel,
  opexType,
  totals,
}: BudgetRequestDetailModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Budget Request Detail</h2>
          <p className="text-sm text-gray-500">{data.code}</p>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="space-y-6 overflow-y-auto px-6 py-5">
        <BudgetRequestDetailSummarySection data={data} originOfficeLabel={originOfficeLabel} />
        <BudgetRequestLineItemsSection lineItems={data.lineItems} totals={totals} />
        <div className="border-t border-gray-100 pt-6">
          <BudgetRequestClassificationSection data={data} accountLabel={accountLabel} opexType={opexType} />
        </div>
      </div>
    </Modal>
  );
}
