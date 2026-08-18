'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { inputFieldClassName } from '@/components/ui/Input';
import {
  computeDropdownLayout,
  DEFAULT_LIST_MAX_HEIGHT,
  type DropdownLayout,
} from '@/components/ui/searchableDropdownLayout';
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
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  noResultsMessage?: string;
  dropdownMaxHeight?: number;
}

function normalizeSearch(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Multi-tag user lookup. Opens a SearchableSelect-style portal popup and
 * focuses the search box on the first click so typing can start immediately.
 * Picking a person keeps the popup open so more PICs can be added.
 */
export default function UserMultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Search people…',
  searchPlaceholder = 'Search people…',
  disabled = false,
  emptyMessage = 'Select a role first',
  noResultsMessage = 'No matches found',
  dropdownMaxHeight = DEFAULT_LIST_MAX_HEIGHT,
}: UserMultiSelectProps) {
  const controlId = useId();
  const listboxId = `${controlId}-listbox`;

  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [layout, setLayout] = useState<DropdownLayout | null>(null);

  const selectedIds = useMemo(() => new Set(selected.map((user) => user.id)), [selected]);

  const available = useMemo(() => {
    const q = normalizeSearch(query);
    return options.filter((option) => {
      if (selectedIds.has(option.id)) return false;
      if (!q) return true;
      return normalizeSearch(option.searchText ?? option.label).includes(q);
    });
  }, [options, query, selectedIds]);

  const updateLayout = useCallback(() => {
    if (!triggerRef.current) return;
    setLayout(computeDropdownLayout(triggerRef.current, dropdownMaxHeight));
  }, [dropdownMaxHeight]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlightIndex(0);
    setLayout(null);
  }, []);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setQuery('');
    setHighlightIndex(0);
    setOpen(true);
  }, [disabled]);

  const addUser = useCallback(
    (option: UserMultiSelectOption) => {
      if (selectedIds.has(option.id)) return;
      onChange([...selected, option]);
      setQuery('');
      setHighlightIndex(0);
      window.setTimeout(() => searchRef.current?.focus(), 0);
    },
    [onChange, selected, selectedIds],
  );

  const removeUser = (event: ReactMouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    onChange(selected.filter((user) => user.id !== id));
  };

  const selectByHighlight = useCallback(() => {
    const option = available[highlightIndex];
    if (!option) return;
    addUser(option);
  }, [addUser, available, highlightIndex]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateLayout();
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, selected, updateLayout]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updateLayout();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updateLayout]);

  useEffect(() => {
    if (highlightIndex >= available.length) {
      setHighlightIndex(Math.max(0, available.length - 1));
    }
  }, [available.length, highlightIndex]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLElement>(`[data-index="${highlightIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, open]);

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => Math.min(index + 1, available.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      selectByHighlight();
    }
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) openDropdown();
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  };

  const emptyListMessage =
    options.length === 0
      ? emptyMessage
      : options.length === selected.length
        ? 'All people in this role are selected'
        : noResultsMessage;

  const panel =
    open && layout ? (
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          left: layout.left,
          width: layout.width,
          top: layout.top,
          bottom: layout.bottom,
          zIndex: 60,
        }}
        className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlightIndex(0);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-controls={listboxId}
            autoComplete="off"
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={controlId}
          className="overflow-y-auto py-1"
          style={{ maxHeight: layout.maxListHeight }}
        >
          {available.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">{emptyListMessage}</li>
          ) : (
            available.map((option, index) => {
              const isHighlighted = index === highlightIndex;
              return (
                <li
                  key={option.id}
                  data-index={index}
                  role="option"
                  aria-selected={false}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addUser(option)}
                  className={cn(
                    'flex cursor-pointer items-center px-3 py-2 text-sm',
                    isHighlighted && 'bg-blue-50',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div className="relative w-full">
      <div
        ref={triggerRef}
        id={controlId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (disabled) return;
          if (open) {
            searchRef.current?.focus();
            return;
          }
          openDropdown();
        }}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          inputFieldClassName,
          'flex min-h-10 h-auto cursor-pointer items-center justify-between gap-2 py-1.5 text-left hover:border-blue-500',
          selected.length === 0 && 'text-gray-400',
          open && 'border-blue-500',
          disabled && 'cursor-not-allowed bg-slate-50 opacity-60',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selected.map((user) => (
            <span
              key={user.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-sm text-blue-800"
            >
              <span className="truncate">{user.label}</span>
              {!disabled ? (
                <button
                  type="button"
                  data-chip-remove
                  onClick={(event) => removeUser(event, user.id)}
                  className="rounded p-0.5 text-blue-600 hover:bg-blue-100"
                  aria-label={`Remove ${user.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </span>
          ))}
          {selected.length === 0 ? (
            <span className="truncate text-sm">{options.length === 0 ? emptyMessage : placeholder}</span>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </div>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
