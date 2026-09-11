/** Stable, muted avatar hues from a user id. Not the UI accent. */

const PALETTE = [
  '#475569',
  '#0F766E',
  '#1D4ED8',
  '#6D28D9',
  '#9A3412',
  '#166534',
  '#9F1239',
  '#075985',
  '#854D0E',
  '#334155',
];

export function avatarColor(id: number | string): string {
  const s = String(id);
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function avatarInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
