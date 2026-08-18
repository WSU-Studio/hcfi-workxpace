'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserMultiSelectOption {
  id: string;
  label: string;
  searchText?: string;
}

export interface UserMultiSelectProps {
  options: UserMultiSelectOption[];
  selected: UserMultiSelectOption[];
  onChange: (selected: UserMultiSelectOption[]) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

function normalizeSearch(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Multi-tag user lookup. Selected people render as removable chips;
 * remaining options are filtered by the in-field search box.
 */
export default function UserMultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Search people…',
  disabled = false,
  emptyMessage = 'Select a role first',
}: UserMultiSelectProps) {
  const [query, setQuery] = useState('');
  const selectedIds = useMemo(() => new Set(selected.map((user) => user.id)), [selected]);

  const available = useMemo(() => {
    const q = normalizeSearch(query);
    return options.filter((option) => {
      if (selectedIds.has(option.id)) return false;
      if (!q) return true;
      return normalizeSearch(option.searchText ?? option.label).includes(q);
    });
  }, [options, query, selectedIds]);

  const addUser = (option: UserMultiSelectOption) => {
    if (selectedIds.has(option.id)) return;
    onChange([...selected, option]);
    setQuery('');
  };

  const removeUser = (id: string) => {
    onChange(selected.filter((user) => user.id !== id));
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 transition-all duration-300 focus-within:border-blue-500',
        disabled && 'cursor-not-allowed bg-slate-50 opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((user) => (
          <span
            key={user.id}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-sm text-blue-800"
          >
            <span className="truncate">{user.label}</span>
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                className="rounded p-0.5 text-blue-600 hover:bg-blue-100"
                aria-label={`Remove ${user.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        ))}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selected.length === 0 ? placeholder : 'Add another…'}
          disabled={disabled}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-gray-400"
        />
      </div>
      {!disabled && (query || selected.length === 0) ? (
        <ul className="mt-1 max-h-40 overflow-y-auto border-t border-gray-100 pt-1">
          {available.length === 0 ? (
            <li className="px-1 py-1.5 text-sm text-gray-500">
              {options.length === 0 ? emptyMessage : 'No matches'}
            </li>
          ) : (
            available.slice(0, 20).map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => addUser(option)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-blue-50"
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
