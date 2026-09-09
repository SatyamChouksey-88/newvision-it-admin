/** Currency in ₹ with thousands separators, rounded to whole rupees. */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) {
    return '—';
  }
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
}

/** Plain "N days" text for warranty urgency (sortable, scannable). */
export function warrantyDaysLabel(warrantyEnd: string | null | undefined): {
  text: string;
  days: number | null;
} {
  if (!warrantyEnd) {
    return { text: 'No warranty', days: null };
  }
  const end = new Date(warrantyEnd);
  const msPerDay = 86400000;
  const a = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );
  const b = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const days = Math.round((b - a) / msPerDay);
  if (days < 0) {
    return { text: `Expired ${Math.abs(days)} days ago`, days };
  }
  if (days === 0) {
    return { text: 'Expires today', days };
  }
  return { text: `${days} days`, days };
}
