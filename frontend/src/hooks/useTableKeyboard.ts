import { useEffect } from 'react';

/** `/` → focus search, `Esc` → callback, arrow keys → row focus on table. */
export function useTableKeyboard(opts: {
  searchSelector?: string;
  onEscape?: () => void;
  rowCount?: number;
  focusedRow?: number;
  onFocusRow?: (index: number) => void;
  enabled?: boolean;
}) {
  const {
    searchSelector = '#global-search-input',
    onEscape,
    rowCount = 0,
    focusedRow = -1,
    onFocusRow,
    enabled = true,
  } = opts;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      const chordK = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey);
      if ((e.key === '/' && !typing) || chordK) {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(searchSelector);
        el?.focus();
        return;
      }

      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (!onFocusRow || rowCount === 0 || typing) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onFocusRow(Math.min(focusedRow + 1, rowCount - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onFocusRow(Math.max(focusedRow - 1, 0));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchSelector, onEscape, rowCount, focusedRow, onFocusRow, enabled]);
}
