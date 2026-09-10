export function employeeLabel(e?: {
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
} | null) {
  if (!e) return '—';
  const name = `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || 'Unknown';
  return e.employeeCode ? `${name} · ${e.employeeCode}` : name;
}
