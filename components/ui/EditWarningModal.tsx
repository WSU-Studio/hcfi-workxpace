'use client';

import Modal from '@/components/ui/Modal';

export type EditWarningEntityType = 'budget-plan' | 'budget-request' | 'payment-request';

const COPY: Record<
  EditWarningEntityType,
  {
    title: string;
    entityLabel: string | null;
    body?: string;
    cancelLabel: string;
    continueLabel: string;
  }
> = {
  'budget-plan': {
    title: 'Do you want to edit budget plan?',
    entityLabel: 'budget plan',
    cancelLabel: 'Cancel',
    continueLabel: 'Continue',
  },
  'budget-request': {
    title: 'Do you want to edit budget request?',
    entityLabel: 'budget request',
    cancelLabel: 'Cancel',
    continueLabel: 'Continue',
  },
  'payment-request': {
    title: 'Edit payment request?',
    entityLabel: null,
    body: 'Status akan dikembalikan dan approval dimulai ulang.',
    cancelLabel: 'Batal',
    continueLabel: 'Lanjutkan',
  },
};

export interface EditWarningModalProps {
  isOpen: boolean;
  entityType: EditWarningEntityType;
  subject?: string;
  onCancel: () => void;
  onContinue: () => void;
}

export default function EditWarningModal({
  isOpen,
  entityType,
  subject,
  onCancel,
  onContinue,
}: EditWarningModalProps) {
  const copy = COPY[entityType];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      panelClassName="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
    >
      <h2 className="text-lg font-semibold text-slate-900">{copy.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {copy.body ?? (
          <>
            The status of the {copy.entityLabel}
            {subject ? (
              <span className="font-medium text-slate-800"> &quot;{subject}&quot;</span>
            ) : (
              ''
            )}{' '}
            will be reverted to the initial status and needs to go through the approval process again.
          </>
        )}
        {copy.body && subject ? (
          <span className="font-medium text-slate-800"> &quot;{subject}&quot;</span>
        ) : null}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {copy.cancelLabel}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {copy.continueLabel}
        </button>
      </div>
    </Modal>
  );
}
