'use client';

import Link from 'next/link';
import { Edit, Trash, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';
import { iconActionButtonClassName } from '@/components/ui/actions/IconActionButton';

interface CategoryActionsProps {
  categoryId: string;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function CategoryActions({ categoryId, onDelete, canEdit, canDelete }: CategoryActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Delete this category?')) return false;
    try {
      const res = await fetch(`/api/workspace-management/category/${categoryId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed');
        return false;
      }
      onDelete();
      return true;
    } catch {
      alert('Failed to delete');
      return false;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link href={`/workspace-management/category/${categoryId}`} className={iconActionButtonClassName}>
        <Eye className="w-4 h-4" />
      </Link>
      {(canEdit || canDelete) && (
        <ActionsDropdown
          triggerAriaLabel="Open category actions"
          actions={[
            ...(canEdit ? [{ label: 'Edit', icon: Edit, onSelect: () => router.push(`/workspace-management/category/${categoryId}/edit`) }] : []),
            ...(canDelete ? [{ label: 'Delete', icon: Trash, variant: 'danger' as const, onSelect: handleDelete }] : []),
          ]}
        />
      )}
    </div>
  );
}
