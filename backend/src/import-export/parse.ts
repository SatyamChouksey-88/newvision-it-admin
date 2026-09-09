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

function parseCsv(buffer: Buffer): Row[] {
  const text = buffer.toString('utf-8');
  const result = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return (result.data || []).map((r) => normalizeRow(r));
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
