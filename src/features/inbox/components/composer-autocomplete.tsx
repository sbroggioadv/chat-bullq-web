'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface AutocompleteItem {
  id: string;
  primary: string;
  secondary?: string;
}

interface Props {
  open: boolean;
  query: string;
  items: AutocompleteItem[];
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
  emptyLabel?: string;
}

export function ComposerAutocomplete({
  open,
  query,
  items,
  onSelect,
  onClose,
  emptyLabel = 'Nada encontrado',
}: Props) {
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.primary.toLowerCase().includes(q) ||
        (it.secondary?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setActive(0);
  }, [query, items.length]);

  useEffect(() => {
    if (!open) return;
    function onDocKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        if (filtered[active]) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(filtered[active]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onDocKey, true);
    return () => document.removeEventListener('keydown', onDocKey, true);
  }, [open, filtered, active, onSelect, onClose]);

  if (!open) return null;

  return (
    <div
      role="listbox"
      className="absolute bottom-full left-0 right-0 mb-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      {filtered.length === 0 ? (
        <div className="px-4 py-2 text-sm text-zinc-500">{emptyLabel}</div>
      ) : (
        <ul ref={listRef} className="py-1">
          {filtered.map((it, idx) => (
            <li
              key={it.id}
              role="option"
              aria-selected={idx === active}
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(it);
              }}
              className={`cursor-pointer px-4 py-2 text-sm ${
                idx === active
                  ? 'bg-primary/10 text-primary'
                  : 'text-zinc-700 dark:text-zinc-200'
              }`}
            >
              <div className="font-medium">{it.primary}</div>
              {it.secondary && (
                <div className="truncate text-xs text-zinc-500">
                  {it.secondary}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
