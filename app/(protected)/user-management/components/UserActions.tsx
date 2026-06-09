'use client';

import Link from 'next/link';
import { Edit, Eye, KeyRound, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ActionsDropdown, { type DropdownAction } from '@/components/ui/actions/ActionsDropdown';
import { iconActionButtonClassName } from '@/components/ui/actions/IconActionButton';

interface UserActionsProps {
  userId: string;
  sessionUserId?: string;
  canEditUser: boolean;
  canDeleteUser: boolean;
  /**
   * Whether the logged-in user can change another user's access permissions.
   * Independent from `canEditUser`: editing profile data and editing access
   * are separate privileges.
   */
  canChangeAccess: boolean;
  onDelete: () => void;
}

export default function UserActions({
  userId,
  sessionUserId,
  canEditUser,
  canDeleteUser,
  canChangeAccess,
  onDelete,
}: UserActionsProps) {
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

  const dropdownActions: DropdownAction[] = [];
  if (canEditUser) {
    dropdownActions.push({
      label: 'Edit',
      icon: Edit,
      onSelect: () => router.push(`/user-management/${userId}/edit`),
    });
  }
  if (canChangeAccess) {
    dropdownActions.push({
      label: 'Access Control',
      icon: KeyRound,
      onSelect: () => router.push(`/user-management/${userId}/access-control`),
    });
  }
  if (canDeleteUser && sessionUserId !== userId) {
    dropdownActions.push({
      label: 'Delete',
      icon: Trash,
      variant: 'danger',
      onSelect: handleDelete,
    });
  }

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
