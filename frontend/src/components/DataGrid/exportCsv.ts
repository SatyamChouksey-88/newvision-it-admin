/** Export visible rows/columns to CSV (Excel-compatible). */
export function exportToCsv(
  filename: string,
  columns: { title: string; key: string }[],
  rows: Record<string, unknown>[],
) {
  const escapeCell = (v: unknown) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escapeCell(c.title)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
