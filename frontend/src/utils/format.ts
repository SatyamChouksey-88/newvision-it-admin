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

/** Compact tenure from joining date (`2y 3m`, `12d`). Future DOJ → `in Nd`. */
export function formatTenure(dateJoined: string | null | undefined, now = new Date()): string {
  if (!dateJoined) return '—';
  const start = new Date(dateJoined);
  if (Number.isNaN(start.getTime())) return '—';
  const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((b - a) / 86_400_000);
  if (days < 0) return `in ${Math.abs(days)}d`;
  if (days < 30) return `${days}d`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0 && months > 0) return `${years}y ${months}m`;
  if (years > 0) return `${years}y`;
  return `${months}m`;
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
