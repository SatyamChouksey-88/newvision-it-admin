import { describe, expect, it } from '@jest/globals';
import { assertAllowedUpload, assertTabularUpload, TABULAR_UPLOAD_MAX_FILE_BYTES } from './uploads';

describe('assertTabularUpload — Phase 1: import/export/reconciliation upload allowlist', () => {
  it('accepts .csv, .xls, and .xlsx', () => {
    for (const name of ['employees.csv', 'assets.xls', 'assets.xlsx']) {
      expect(() => assertTabularUpload({ originalname: name, size: 1024 })).not.toThrow();
    }
  });

  it('rejects a disguised HTML/script upload even with no size issue', () => {
    expect(() => assertTabularUpload({ originalname: 'assets.html', size: 1024 })).toThrow(
      /Only \.csv, \.xls, or \.xlsx/,
    );
    expect(() => assertTabularUpload({ originalname: 'assets.svg', size: 1024 })).toThrow();
    expect(() => assertTabularUpload({ originalname: 'run.exe', size: 1024 })).toThrow();
  });

  it('rejects a file with no extension', () => {
    expect(() => assertTabularUpload({ originalname: 'assets', size: 1024 })).toThrow();
  });

  it('rejects a file over the default 500MB cap', () => {
    expect(() =>
      assertTabularUpload({ originalname: 'assets.csv', size: TABULAR_UPLOAD_MAX_FILE_BYTES + 1 }),
    ).toThrow(/exceeds 500 MB limit/);
  });

  it('accepts exactly the default cap', () => {
    expect(() =>
      assertTabularUpload({ originalname: 'assets.csv', size: TABULAR_UPLOAD_MAX_FILE_BYTES }),
    ).not.toThrow();
  });

  it('honors a caller-supplied max size override', () => {
    const oneMb = 1024 * 1024;
    expect(() =>
      assertTabularUpload({ originalname: 'assets.csv', size: oneMb + 1 }, oneMb),
    ).toThrow(/exceeds 1 MB limit/);
    expect(() =>
      assertTabularUpload({ originalname: 'assets.csv', size: oneMb }, oneMb),
    ).not.toThrow();
  });
});

describe('assertAllowedUpload — unchanged general-purpose allowlist (chat/tickets/procurement)', () => {
  it('still accepts a PDF', () => {
    expect(() =>
      assertAllowedUpload({ originalname: 'invoice.pdf', mimetype: 'application/pdf', size: 1024 }),
    ).not.toThrow();
  });

  it('still rejects a blocked extension regardless of claimed mimetype', () => {
    expect(() =>
      assertAllowedUpload({ originalname: 'shell.svg', mimetype: 'image/svg+xml', size: 1024 }),
    ).toThrow();
  });
});
