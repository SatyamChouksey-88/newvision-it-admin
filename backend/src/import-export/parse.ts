import * as ExcelJS from 'exceljs';
import Papa from 'papaparse';

export type Row = Record<string, string>;

/** Parse an uploaded CSV or XLSX buffer into an array of string-keyed rows. */
export async function parseTabular(buffer: Buffer, filename: string): Promise<Row[]> {
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseXlsx(buffer);
  }
  return parseCsv(buffer);
}

/** Row-by-row tabular parse (CSV or XLSX) without holding all rows in memory. */
export async function forEachTabularRow(
  buffer: Buffer,
  filename: string,
  onRow: (row: Row, rowIndex: number) => void | Promise<void>,
): Promise<{ rowCount: number }> {
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return forEachXlsxRow(buffer, onRow);
  }
  return parseCsvStreaming(buffer, onRow);
}

function parseCsv(buffer: Buffer): Row[] {
  const text = buffer.toString('utf-8');
  const result = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return (result.data || []).map((r) => normalizeRow(r));
}

/** Stream-parse CSV without loading all rows into one array (memory-friendly for large files). */
export async function parseCsvStreaming(
  buffer: Buffer,
  onRow: (row: Row, index: number) => void | Promise<void>,
): Promise<{ rowCount: number }> {
  const text = buffer.toString('utf-8');
  let rowCount = 0;
  await new Promise<void>((resolve, reject) => {
    Papa.parse<Row>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      step: (results) => {
        const row = normalizeRow(results.data);
        if (Object.values(row).some((v) => v !== '')) {
          rowCount += 1;
          void Promise.resolve(onRow(row, rowCount)).catch(reject);
        }
      },
      complete: () => resolve(),
      error: (err: Error) => reject(err),
    });
  });
  return { rowCount };
}

async function forEachXlsxRow(
  buffer: Buffer,
  onRow: (row: Row, rowIndex: number) => void | Promise<void>,
): Promise<{ rowCount: number }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return { rowCount: 0 };
  const headers: string[] = [];
  let rowCount = 0;
  for (let rowNumber = 1; rowNumber <= ws.rowCount; rowNumber++) {
    const row = ws.getRow(rowNumber);
    const values = row.values as unknown[];
    if (rowNumber === 1) {
      for (let i = 1; i < values.length; i++) {
        headers[i] = String(values[i] ?? '').trim();
      }
      continue;
    }
    const obj: Row = {};
    for (let i = 1; i < headers.length; i++) {
      const key = headers[i];
      if (!key) continue;
      obj[key] = cellToString(values[i]);
    }
    if (Object.values(obj).some((v) => v !== '')) {
      rowCount += 1;
      await onRow(obj, rowCount);
    }
  }
  return { rowCount };
}

async function parseXlsx(buffer: Buffer): Promise<Row[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) {
    return [];
  }
  const headers: string[] = [];
  const rows: Row[] = [];
  ws.eachRow((row, rowNumber) => {
    const values = row.values as unknown[]; // 1-based; index 0 is empty
    if (rowNumber === 1) {
      for (let i = 1; i < values.length; i++) {
        headers[i] = String(values[i] ?? '').trim();
      }
      return;
    }
    const obj: Row = {};
    for (let i = 1; i < headers.length; i++) {
      const key = headers[i];
      if (!key) continue;
      const cell = values[i];
      obj[key] = cellToString(cell);
    }
    if (Object.values(obj).some((v) => v !== '')) {
      rows.push(obj);
    }
  });
  return rows;
}

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell === 'object') {
    const obj = cell as { text?: string; result?: unknown; hyperlink?: string };
    if (typeof obj.text === 'string') return obj.text;
    if (obj.result !== undefined) return String(obj.result);
  }
  return String(cell).trim();
}

function normalizeRow(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim()] = typeof v === 'string' ? v.trim() : String(v ?? '');
  }
  return out;
}
