import { useCallback, useMemo, useState } from 'react';

export interface ColumnPref {
  key: string;
  width?: number;
  visible: boolean;
}

interface StoredPrefs {
  order: string[];
  columns: Record<string, { width?: number; visible: boolean }>;
}

function loadPrefs(tableKey: string): StoredPrefs | null {
  try {
    const raw = localStorage.getItem(`nv-grid-${tableKey}`);
    return raw ? (JSON.parse(raw) as StoredPrefs) : null;
  } catch {
    return null;
  }
}

function savePrefs(tableKey: string, prefs: StoredPrefs) {
  localStorage.setItem(`nv-grid-${tableKey}`, JSON.stringify(prefs));
}

export function useColumnPrefs(
  tableKey: string,
  defaultKeys: string[],
  defaultVisible: Record<string, boolean> = {},
) {
  const stored = useMemo(() => loadPrefs(tableKey), [tableKey]);

  const [order, setOrder] = useState<string[]>(() => {
    if (stored?.order?.length) {
      const merged = [...stored.order];
      for (const k of defaultKeys) {
        if (!merged.includes(k)) merged.push(k);
      }
      return merged;
    }
    return defaultKeys;
  });

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
      v[k] =
        stored?.columns?.[k]?.visible ??
        defaultVisible[k] ??
        true;
    }
    return v;
  });

  const persist = useCallback(
    (nextOrder: string[], nextVisible: Record<string, boolean>, nextWidths: Record<string, number>) => {
      const columns: StoredPrefs['columns'] = {};
      for (const k of nextOrder) {
        columns[k] = { visible: nextVisible[k] ?? true, width: nextWidths[k] };
      }
      savePrefs(tableKey, { order: nextOrder, columns });
    },
    [tableKey],
  );

  const setColumnWidth = useCallback(
    (key: string, width: number) => {
      setWidths((prev) => {
        const next = { ...prev, [key]: width };
        persist(order, visible, next);
        return next;
      });
    },
    [order, visible, persist],
  );

  const toggleColumn = useCallback(
    (key: string, show: boolean) => {
      setVisible((prev) => {
        const next = { ...prev, [key]: show };
        persist(order, next, widths);
        return next;
      });
    },
    [order, widths, persist],
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
        persist(next, visible, widths);
        return next;
      });
    },
    [visible, widths, persist],
  );

  return {
    order,
    widths,
    visible,
    setColumnWidth,
    toggleColumn,
    reorderColumn,
  };
}
