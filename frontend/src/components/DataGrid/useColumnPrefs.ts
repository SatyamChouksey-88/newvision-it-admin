import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ColumnPref {
  key: string;
  width?: number;
  visible: boolean;
}

interface StoredPrefs {
  order: string[];
  columns: Record<string, { width?: number; visible: boolean }>;
  wrapText?: boolean;
}

const storageKey = (tableKey: string) => `nv-grid-${tableKey}`;

function loadPrefs(tableKey: string): StoredPrefs | null {
  try {
    const raw = localStorage.getItem(storageKey(tableKey));
    return raw ? (JSON.parse(raw) as StoredPrefs) : null;
  } catch {
    return null;
  }
}

function savePrefs(tableKey: string, prefs: StoredPrefs) {
  try {
    localStorage.setItem(storageKey(tableKey), JSON.stringify(prefs));
  } catch {
    /* storage full or disabled — prefs simply don't persist */
  }
}

function clearPrefs(tableKey: string) {
  try {
    localStorage.removeItem(storageKey(tableKey));
  } catch {
    /* ignore */
  }
}

/**
 * Per-table column order / width / visibility / wrap prefs persisted to localStorage.
 * Column keys that appear later (new columns, role-dependent columns) are merged in.
 */
export function useColumnPrefs(
  tableKey: string,
  defaultKeys: string[],
  defaultVisible: Record<string, boolean> = {},
) {
  const stored = useMemo(() => loadPrefs(tableKey), [tableKey]);

  const buildOrder = useCallback(
    (base: string[] | undefined) => {
      const merged = base ? base.filter((k) => defaultKeys.includes(k)) : [];
      for (const k of defaultKeys) {
        if (!merged.includes(k)) merged.push(k);
      }
      return merged;
    },
    [defaultKeys],
  );

  const [order, setOrder] = useState<string[]>(() => buildOrder(stored?.order));

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    for (const k of defaultKeys) {
      const sw = stored?.columns?.[k]?.width;
      if (sw) w[k] = sw;
    }
    return w;
  });

  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    for (const k of defaultKeys) {
      v[k] = stored?.columns?.[k]?.visible ?? defaultVisible[k] ?? true;
    }
    return v;
  });

  const [wrapText, setWrapTextState] = useState<boolean>(stored?.wrapText ?? false);

  // Keep order/visibility in sync when the column set changes (e.g. role loads after mount).
  const keysSig = defaultKeys.join('|');
  const prevSig = useRef(keysSig);
  useEffect(() => {
    if (prevSig.current === keysSig) return;
    prevSig.current = keysSig;
    setOrder((prev) => buildOrder(prev));
    setVisible((prev) => {
      const next = { ...prev };
      for (const k of defaultKeys) {
        if (next[k] === undefined) next[k] = defaultVisible[k] ?? true;
      }
      return next;
    });
  }, [keysSig, defaultKeys, defaultVisible, buildOrder]);

  const persist = useCallback(
    (
      nextOrder: string[],
      nextVisible: Record<string, boolean>,
      nextWidths: Record<string, number>,
      nextWrap: boolean,
    ) => {
      const columns: StoredPrefs['columns'] = {};
      for (const k of nextOrder) {
        columns[k] = { visible: nextVisible[k] ?? true, width: nextWidths[k] };
      }
      savePrefs(tableKey, { order: nextOrder, columns, wrapText: nextWrap });
    },
    [tableKey],
  );

  const setColumnWidth = useCallback(
    (key: string, width: number) => {
      setWidths((prev) => {
        const next = { ...prev, [key]: width };
        persist(order, visible, next, wrapText);
        return next;
      });
    },
    [order, visible, wrapText, persist],
  );

  const toggleColumn = useCallback(
    (key: string, show: boolean) => {
      setVisible((prev) => {
        const next = { ...prev, [key]: show };
        persist(order, next, widths, wrapText);
        return next;
      });
    },
    [order, widths, wrapText, persist],
  );

  const reorderColumn = useCallback(
    (fromKey: string, toKey: string) => {
      setOrder((prev) => {
        const next = [...prev];
        const fromIdx = next.indexOf(fromKey);
        const toIdx = next.indexOf(toKey);
        if (fromIdx < 0 || toIdx < 0) return prev;
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, fromKey);
        persist(next, visible, widths, wrapText);
        return next;
      });
    },
    [visible, widths, wrapText, persist],
  );

  const setWrapText = useCallback(
    (wrap: boolean) => {
      setWrapTextState(wrap);
      persist(order, visible, widths, wrap);
    },
    [order, visible, widths, persist],
  );

  const resetPrefs = useCallback(() => {
    clearPrefs(tableKey);
    setOrder([...defaultKeys]);
    setWidths({});
    const v: Record<string, boolean> = {};
    for (const k of defaultKeys) v[k] = defaultVisible[k] ?? true;
    setVisible(v);
    setWrapTextState(false);
  }, [tableKey, defaultKeys, defaultVisible]);

  const isCustomised = useMemo(() => {
    if (wrapText) return true;
    if (Object.keys(widths).length > 0) return true;
    if (order.some((k, i) => defaultKeys[i] !== k)) return true;
    return defaultKeys.some((k) => (visible[k] ?? true) !== (defaultVisible[k] ?? true));
  }, [wrapText, widths, order, visible, defaultKeys, defaultVisible]);

  return {
    order,
    widths,
    visible,
    wrapText,
    setColumnWidth,
    toggleColumn,
    reorderColumn,
    setWrapText,
    resetPrefs,
    isCustomised,
  };
}
