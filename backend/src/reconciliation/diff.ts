export interface ReconcileItem {
  key: string;
  label: string;
}

export interface ReconcileDiff {
  matched: ReconcileItem[];
  inFileOnly: ReconcileItem[];
  inSystemOnly: ReconcileItem[];
}

/** Case-insensitive set difference on a match key. */
export function reconcileSets(file: ReconcileItem[], system: ReconcileItem[]): ReconcileDiff {
  const fileMap = new Map<string, ReconcileItem>();
  for (const item of file) {
    const k = item.key.trim().toLowerCase();
    if (k && !fileMap.has(k)) fileMap.set(k, { ...item, key: k });
  }
  const systemMap = new Map<string, ReconcileItem>();
  for (const item of system) {
    const k = item.key.trim().toLowerCase();
    if (k && !systemMap.has(k)) systemMap.set(k, { ...item, key: k });
  }

  const matched: ReconcileItem[] = [];
  const inFileOnly: ReconcileItem[] = [];
  const inSystemOnly: ReconcileItem[] = [];

  for (const [k, item] of fileMap) {
    if (systemMap.has(k)) matched.push(item);
    else inFileOnly.push(item);
  }
  for (const [k, item] of systemMap) {
    if (!fileMap.has(k)) inSystemOnly.push(item);
  }

  const byKey = (a: ReconcileItem, b: ReconcileItem) => a.key.localeCompare(b.key);
  return {
    matched: matched.sort(byKey),
    inFileOnly: inFileOnly.sort(byKey),
    inSystemOnly: inSystemOnly.sort(byKey),
  };
}
