'use client';

import { Ban } from 'lucide-react';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';
import type { ApprovalDelegationListStatus } from '@/lib/approval-delegation';

interface DelegationActionsProps {
  delegationId: string;
  listStatus: ApprovalDelegationListStatus;
  canCancel: boolean;
  onCancelled: () => void | Promise<void>;
}

export default function DelegationActions({
  delegationId,
  listStatus,
  canCancel,
  onCancelled,
}: DelegationActionsProps) {
  const canCancelRow = canCancel && (listStatus === 'Active' || listStatus === 'Scheduled');
  if (!canCancelRow) return null;

  const handleCancel = async () => {
    if (!confirm('Cancel this approval delegation? The delegator will regain approval rights immediately.')) {
      return false;
    }
    try {
      const res = await fetch(`/api/approval-delegation/${delegationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to cancel');
        return false;
      }
      await onCancelled();
      return true;
    } catch {
      alert('Failed to cancel');
      return false;
    }
  };

  return (
    <ActionsDropdown
      triggerAriaLabel="Open delegation actions"
      actions={[
        {
          label: 'Cancel',
          icon: Ban,
          variant: 'danger',
          onSelect: handleCancel,
        },
      ]}
    />
  );
}
