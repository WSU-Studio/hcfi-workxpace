'use client';

import { Edit, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';

interface RoleActionsProps {
  roleId: string;
  onDelete: () => void;
}

export default function RoleActions({ roleId, onDelete }: RoleActionsProps) {
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

  return (
    <ActionsDropdown
      triggerAriaLabel="Open role actions"
      actions={[
        {
          label: 'Edit',
          icon: Edit,
          onSelect: () => router.push(`/workspace-management/role/${roleId}/edit`),
        },
        {
          label: 'Delete',
          icon: Trash,
          variant: 'danger',
          onSelect: handleDelete,
        },
      ]}
    />
  );
}
