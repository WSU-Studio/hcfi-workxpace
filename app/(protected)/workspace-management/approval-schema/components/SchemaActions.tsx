'use client';

import { Edit, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';

interface SchemaActionsProps {
  schemaId: string;
  onDelete: () => void;
}

export default function SchemaActions({ schemaId, onDelete }: SchemaActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Delete this approval scheme?')) return false;
    const res = await fetch(`/api/workspace-management/approval-schema/${schemaId}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete();
      return true;
    } else {
      alert('Failed to delete');
      return false;
    }
  };

  return (
    <ActionsDropdown
      triggerAriaLabel="Open approval schema actions"
      actions={[
        {
          label: 'Edit',
          icon: Edit,
          onSelect: () => router.push(`/workspace-management/approval-schema/${schemaId}/edit`),
        },
        {
          label: 'Delete',
          icon: Trash,
          variant: 'danger',
          onSelect: handleDelete,
        },
      ]}
      menuClassName="right-0 top-8"
    />
  );
}
