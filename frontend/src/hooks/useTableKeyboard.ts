import { useEffect } from 'react';

/** `/` → focus search, `Esc` → callback, arrow keys → row focus on table.
 * Queue keys (tickets): J/K move, Enter open, I assign to me. */
export function useTableKeyboard(opts: {
  searchSelector?: string;
  onEscape?: () => void;
  rowCount?: number;
  focusedRow?: number;
  onFocusRow?: (index: number) => void;
  enabled?: boolean;
  enableQueueKeys?: boolean;
  onOpenFocused?: () => void;
  onAssignFocused?: () => void;
}) {
  const {
    searchSelector = '#global-search-input',
    onEscape,
    rowCount = 0,
    focusedRow = -1,
    onFocusRow,
    enabled = true,
    enableQueueKeys = false,
    onOpenFocused,
    onAssignFocused,
  } = opts;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      const chordK = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey);
      if ((e.key === '/' && !typing && !e.shiftKey && !e.ctrlKey && !e.metaKey) || chordK) {
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
      if (e.key === 'ArrowDown' || (enableQueueKeys && e.key.toLowerCase() === 'j' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        onFocusRow(Math.min((focusedRow < 0 ? -1 : focusedRow) + 1, rowCount - 1));
        return;
      }
      if (e.key === 'ArrowUp' || (enableQueueKeys && e.key.toLowerCase() === 'k' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        onFocusRow(Math.max(focusedRow < 0 ? 0 : focusedRow - 1, 0));
        return;
      }
      if (enableQueueKeys && e.key === 'Enter') {
        e.preventDefault();
        if (focusedRow < 0) onFocusRow(0);
        onOpenFocused?.();
        return;
      }
      if (enableQueueKeys && e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (focusedRow < 0) onFocusRow(0);
        onAssignFocused?.();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    searchSelector,
    onEscape,
    rowCount,
    focusedRow,
    onFocusRow,
    enabled,
    enableQueueKeys,
    onOpenFocused,
    onAssignFocused,
  ]);
}
