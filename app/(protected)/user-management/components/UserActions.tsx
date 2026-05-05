'use client';

import Link from 'next/link';
import { Edit, Eye, KeyRound, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from '@/components/ui/actions/ActionsDropdown';
import { iconActionButtonClassName } from '@/components/ui/actions/IconActionButton';

interface UserActionsProps {
  userId: string;
  sessionUserId?: string;
  canEditUser: boolean;
  canDeleteUser: boolean;
  onDelete: () => void;
}

export default function UserActions({ userId, sessionUserId, canEditUser, canDeleteUser, onDelete }: UserActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Delete this user?')) return false;
    const res = await fetch(`/api/user-management/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete();
      return true;
    }
    const data = await res.json();
    alert(data.error ?? 'Failed to delete user');
    return false;
  };

  const dropdownActions = [
    canEditUser
      ? {
          label: 'Edit',
          icon: Edit,
          onSelect: () => router.push(`/user-management/${userId}/edit`),
        }
      : null,
    canEditUser
      ? {
          label: 'Access Control',
          icon: KeyRound,
          onSelect: () => router.push(`/user-management/${userId}/access-control`),
        }
      : null,
    canDeleteUser && sessionUserId !== userId
      ? {
          label: 'Delete',
          icon: Trash,
          variant: 'danger' as const,
          onSelect: handleDelete,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-2">
      <Link href={`/user-management/${userId}`} className={iconActionButtonClassName}>
        <Eye className="h-4 w-4" />
      </Link>
      {dropdownActions.length > 0 && (
        <ActionsDropdown triggerAriaLabel="Open user actions" actions={dropdownActions} />
      )}
    </div>
  );
}
