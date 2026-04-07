'use client';

import { Edit, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';

interface SchemaActionsProps {
  schemaId: string;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function SchemaActions({ schemaId, onDelete, canEdit, canDelete }: SchemaActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Delete this approval schema?')) return false;
    const res = await fetch(`/api/workspace-management/approval-schema/${schemaId}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete();
      return true;
    } else {
      alert('Failed to delete');
      return false;
    }
  };

  if (!canEdit && !canDelete) return null;

  return (
    <ActionsDropdown
      triggerAriaLabel="Open approval schema actions"
      actions={[
        ...(canEdit
          ? [
              {
                label: 'Edit',
                icon: Edit,
                onSelect: () => router.push(`/workspace-management/approval-schema/${schemaId}/edit`),
              },
            ]
          : []),
        ...(canDelete
          ? [
              {
                label: 'Delete',
                icon: Trash,
                variant: 'danger' as const,
                onSelect: handleDelete,
              },
            ]
          : []),
      ]}
      menuClassName="right-0 top-8"
    />
  );
}
