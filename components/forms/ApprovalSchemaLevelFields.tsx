'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Select from '@/components/ui/Select';
import UserMultiSelect, { type UserMultiSelectOption } from '@/components/forms/UserMultiSelect';

export interface ApprovalSchemaRoleOption {
  id: string;
  roleName: string;
}

export interface ApprovalSchemaPicUser {
  id: string;
  name: string;
  employeeId?: string;
}

export interface ApprovalSchemaLevelDraft {
  levelType: string;
  roleId: string;
  picUserIds: string[];
  picUsers: ApprovalSchemaPicUser[];
}

export function emptyApprovalSchemaLevel(): ApprovalSchemaLevelDraft {
  return { levelType: 'Reviewer', roleId: '', picUserIds: [], picUsers: [] };
}

export interface ApprovalSchemaLevelFieldsProps {
  levels: ApprovalSchemaLevelDraft[];
  roles: ApprovalSchemaRoleOption[];
  onChange: (levels: ApprovalSchemaLevelDraft[]) => void;
  error?: string;
  allowRemoveLast?: boolean;
}

interface RoleUserRow {
  id: string;
  name: string;
  email: string;
  employeeId: string;
}

function toOption(user: ApprovalSchemaPicUser | RoleUserRow): UserMultiSelectOption {
  const employeeId = 'employeeId' in user ? user.employeeId : '';
  return {
    id: user.id,
    label: employeeId ? `${user.name} (${employeeId})` : user.name,
    searchText: `${user.name} ${employeeId} ${'email' in user ? user.email : ''}`,
  };
}

/**
 * Stacked approval-schema level editor: Task, Role, optional Specific PIC tags.
 */
export default function ApprovalSchemaLevelFields({
  levels,
  roles,
  onChange,
  error,
  allowRemoveLast = false,
}: ApprovalSchemaLevelFieldsProps) {
  const [usersByRole, setUsersByRole] = useState<Record<string, UserMultiSelectOption[]>>({});

  useEffect(() => {
    const roleIds = [...new Set(levels.map((level) => level.roleId).filter(Boolean))];
    const missing = roleIds.filter((roleId) => usersByRole[roleId] === undefined);
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (roleId) => {
        const response = await fetch(
          `/api/workspace-management/approval-schema/users?roleId=${encodeURIComponent(roleId)}`,
        );
        if (!response.ok) return { roleId, users: [] as UserMultiSelectOption[] };
        const data = await response.json();
        const users = ((data.users ?? []) as RoleUserRow[]).map(toOption);
        return { roleId, users };
      }),
    ).then((results) => {
      if (cancelled) return;
      setUsersByRole((previous) => {
        const next = { ...previous };
        for (const result of results) next[result.roleId] = result.users;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [levels, usersByRole]);

  const updateLevel = (index: number, patch: Partial<ApprovalSchemaLevelDraft>) => {
    onChange(levels.map((level, i) => (i === index ? { ...level, ...patch } : level)));
  };

  const changeRole = (index: number, roleId: string) => {
    updateLevel(index, { roleId, picUserIds: [], picUsers: [] });
  };

  const changePics = (index: number, selected: UserMultiSelectOption[]) => {
    updateLevel(index, {
      picUserIds: selected.map((user) => user.id),
      picUsers: selected.map((user) => ({ id: user.id, name: user.label })),
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="font-medium">Schema</label>
        <button
          type="button"
          onClick={() => onChange([...levels, emptyApprovalSchemaLevel()])}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Level
        </button>
      </div>
      <div className="space-y-3">
        {levels.map((level, index) => {
          const roleOptions = usersByRole[level.roleId] ?? [];
          const selected = (level.picUsers.length > 0
            ? level.picUsers.map(toOption)
            : roleOptions.filter((option) => level.picUserIds.includes(option.id)));
          return (
            <div key={index} className="space-y-3 border-t border-gray-200 py-3">
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm text-gray-500">Level {index + 1}</span>
                <Select
                  name="levelType"
                  value={level.levelType}
                  onChange={(event) => updateLevel(index, { levelType: event.target.value })}
                >
                  <option value="Reviewer">Reviewer</option>
                  <option value="Approver">Approver</option>
                </Select>
                <Select
                  name="roleId"
                  value={level.roleId}
                  onChange={(event) => changeRole(index, event.target.value)}
                  required
                >
                  <option value="">-</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.roleName}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => onChange(levels.filter((_, i) => i !== index))}
                  disabled={!allowRemoveLast && levels.length <= 1}
                  className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="pl-[4.5rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Specific PIC</label>
                <UserMultiSelect
                  options={roleOptions}
                  selected={selected}
                  onChange={(next) => changePics(index, next)}
                  disabled={!level.roleId}
                  placeholder="Search people in this role…"
                  emptyMessage={level.roleId ? 'No users in this role' : 'Select a role first'}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to allow every user with this role. When set, only these people
                  are notified and can approve at this step.
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
