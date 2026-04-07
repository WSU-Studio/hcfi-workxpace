'use client';

import { Edit, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';

interface RoleActionsProps {
  roleId: string;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function RoleActions({ roleId, onDelete, canEdit, canDelete }: RoleActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Delete this role?')) return false;
    const res = await fetch(`/api/workspace-management/role/${roleId}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete();
      return true;
    } else {
      const d = await res.json();
      alert(d.error ?? 'Failed');
      return false;
    }
  };

  if (!canEdit && !canDelete) return null;

  return (
    <ActionsDropdown
      triggerAriaLabel="Open role actions"
      actions={[
        ...(canEdit
          ? [
              {
                label: 'Edit',
                icon: Edit,
                onSelect: () => router.push(`/workspace-management/role/${roleId}/edit`),
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
    />
  );
}
