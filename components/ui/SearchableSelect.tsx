'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { inputFieldClassName } from '@/components/ui/Input';
import {
  computeDropdownLayout,
  DEFAULT_LIST_MAX_HEIGHT,
  type DropdownLayout,
} from '@/components/ui/searchableDropdownLayout';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Extra text used for matching (defaults to `label`). */
  searchText?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noResultsMessage?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  triggerClassName?: string;
  label?: ReactNode;
  /** Max height (px) of the scrollable option list. Defaults to 240. */
  dropdownMaxHeight?: number;
  /** Minimum width (px) of the dropdown panel; may exceed trigger width. */
  dropdownMinWidth?: number;
}

function normalizeSearch(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Generic searchable dropdown (combobox).
 *
 * Behaviour:
 * - Click / Enter / Space / ArrowDown on the trigger opens the panel and
 *   focuses the search box.
 * - While the search box is focused: ArrowDown / ArrowUp move the highlight,
 *   Enter selects the highlighted option, Escape closes.
 * - Mouse hover also drives the highlight; clicking an option selects it.
 *
 * The dropdown panel renders in a portal with fixed positioning so it is never
 * clipped by an ancestor `overflow-hidden` (e.g. collapsible cards) and flips
 * upward when there is not enough room below.
 *
 * Reusable across any form field that maps a `value` to a list of options
 * (origin office, project, account, department, etc.).
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No options',
  noResultsMessage = 'No matches found',
  disabled = false,
  required = false,
  id,
  className,
  triggerClassName,
  label,
  dropdownMaxHeight = DEFAULT_LIST_MAX_HEIGHT,
  dropdownMinWidth,
}: SearchableSelectProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const listboxId = `${controlId}-listbox`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [layout, setLayout] = useState<DropdownLayout | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return options;
    return options.filter((option) =>
      normalizeSearch(option.searchText ?? option.label).includes(q),
    );
  }, [options, query]);

  /** Positions in `filtered` that are actually selectable (skip disabled). */
  const selectableIndices = useMemo(
    () =>
      filtered
        .map((option, index) => (option.disabled ? -1 : index))
        .filter((index) => index >= 0),
    [filtered],
  );

  const updateLayout = useCallback(() => {
    if (!triggerRef.current) return;
    setLayout(computeDropdownLayout(triggerRef.current, dropdownMaxHeight, dropdownMinWidth));
  }, [dropdownMaxHeight, dropdownMinWidth]);

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

  const selectByHighlight = useCallback(
    (highlightPos: number) => {
      const filteredIndex = selectableIndices[highlightPos];
      if (filteredIndex === undefined) return;
      const option = filtered[filteredIndex];
      if (!option || option.disabled) return;
      onChange(option.value);
      close();
    },
    [close, filtered, onChange, selectableIndices],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateLayout();
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, updateLayout]);

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

  // Keep highlight within bounds when the filtered list shrinks.
  useEffect(() => {
    if (highlightIndex >= selectableIndices.length) {
      setHighlightIndex(Math.max(0, selectableIndices.length - 1));
    }
  }, [highlightIndex, selectableIndices.length]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const filteredIndex = selectableIndices[highlightIndex];
    if (filteredIndex === undefined) return;
    const item = listRef.current.querySelector<HTMLElement>(`[data-index="${filteredIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, open, selectableIndices]);

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, selectableIndices.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      selectByHighlight(highlightIndex);
    }
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      openDropdown();
    }
  };

  const triggerText = selected?.label ?? (options.length === 0 ? emptyMessage : placeholder);

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
            type="search"
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
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">{noResultsMessage}</li>
          ) : (
            filtered.map((option, index) => {
              const highlightPos = selectableIndices.indexOf(index);
              const isHighlighted = highlightPos === highlightIndex;
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => {
                    if (!option.disabled && highlightPos >= 0) setHighlightIndex(highlightPos);
                  }}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    close();
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                    option.disabled && 'cursor-not-allowed opacity-50',
                    isHighlighted && 'bg-blue-50',
                    isSelected && !isHighlighted && 'bg-gray-50',
                  )}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0 text-blue-600',
                      isSelected ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{option.label}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div className={cn('relative w-full', className)}>
      {label ? <span className="mb-1.5 block font-medium">{label}</span> : null}

      <button
        ref={triggerRef}
        type="button"
        id={controlId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-required={required}
        aria-invalid={required && !value ? true : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openDropdown())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          inputFieldClassName,
          'flex items-center justify-between gap-2 text-left cursor-pointer hover:border-blue-500',
          !selected && 'text-gray-400',
          open && 'border-blue-500',
          triggerClassName,
        )}
      >
        <span className="truncate">{triggerText}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {/* Preserve native `required` validation without exposing a second control. */}
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      ) : null}

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
