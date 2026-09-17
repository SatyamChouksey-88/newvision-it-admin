/**
 * Local CSV parse benchmark (Phase 7). Run from backend/: node scripts/benchmark-import.mjs
 */
import Papa from 'papaparse';

const ROWS = Number(process.env.BENCH_ROWS ?? 100_000);
const header = 'employeeCode,firstName,lastName,email\n';
let body = header;
for (let i = 0; i < ROWS; i++) {
  body += `E${i},First${i},Last${i},user${i}@example.com\n`;
}
const buffer = Buffer.from(body, 'utf-8');

const t0 = performance.now();
let count = 0;
Papa.parse(buffer.toString('utf-8'), {
  header: true,
  skipEmptyLines: true,
  step: () => {
    count += 1;
  },
  complete: () => {
    const ms = performance.now() - t0;
    console.log(JSON.stringify({ rows: count, bytes: buffer.length, parseMs: Math.round(ms) }));
  },
});
