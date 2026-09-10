import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface TicketExportRow {
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  raisedBy: string;
  assignedTo: string;
  updatedAt: Date | string;
}

export async function ticketsToCsv(rows: TicketExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tickets');
  ws.columns = [
    { header: 'Ticket', key: 'ticketNumber', width: 14 },
    { header: 'Subject', key: 'subject', width: 40 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Raised by', key: 'raisedBy', width: 22 },
    { header: 'Assigned to', key: 'assignedTo', width: 22 },
    { header: 'Updated', key: 'updatedAt', width: 20 },
  ];
  for (const row of rows) {
    ws.addRow({
      ...row,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    });
  }
  const buf = await wb.csv.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

export function ticketsToPdf(title: string, rows: TicketExportRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(16).font('Helvetica-Bold').text(title);
    doc.moveDown(0.4);
    doc.fontSize(8).font('Helvetica').fillColor('#666').text(`${rows.length} rows · ${new Date().toISOString().slice(0, 10)}`);
    doc.fillColor('#000').moveDown(0.4);
    const cols = [
      { h: 'Ticket', k: 'ticketNumber', w: 80 },
      { h: 'Subject', k: 'subject', w: 180 },
      { h: 'Status', k: 'status', w: 70 },
      { h: 'Priority', k: 'priority', w: 60 },
      { h: 'Category', k: 'category', w: 80 },
      { h: 'Raised by', k: 'raisedBy', w: 100 },
      { h: 'Assigned', k: 'assignedTo', w: 100 },
    ];
    let x = 30;
    const xs = cols.map((c) => {
      const left = x;
      x += c.w;
      return left;
    });
    const drawHeader = () => {
      const y = doc.y;
      doc.fontSize(8).font('Helvetica-Bold');
      for (let i = 0; i < cols.length; i++) {
        doc.text(cols[i].h, xs[i], y, { width: cols[i].w - 4 });
      }
      doc.y = y + 14;
      doc.font('Helvetica');
    };
    drawHeader();
    for (const row of rows) {
      if (doc.y > 540) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      const rec = row as unknown as Record<string, string>;
      for (let i = 0; i < cols.length; i++) {
        doc.fontSize(8).text(String(rec[cols[i].k] ?? ''), xs[i], y, {
          width: cols[i].w - 4,
          ellipsis: true,
        });
      }
      doc.y = y + 14;
    }
    doc.end();
  });
}

export async function reportsToCsv(sections: { title: string; rows: Record<string, string | number | null>[] }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const section of sections) {
    const ws = wb.addWorksheet(section.title.slice(0, 31) || 'Sheet');
    const keys = section.rows[0] ? Object.keys(section.rows[0]) : ['value'];
    ws.columns = keys.map((k) => ({ header: k, key: k, width: 22 }));
    for (const row of section.rows) ws.addRow(row);
  }
  const buf = await wb.csv.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

export function reportsToPdf(title: string, lines: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(16).font('Helvetica-Bold').text(title);
    doc.moveDown();
    doc.fontSize(10).font('Helvetica');
    for (const line of lines) doc.text(line);
    doc.end();
  });
}
