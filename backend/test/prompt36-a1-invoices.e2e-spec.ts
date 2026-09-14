import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 36 A1 — unique vendor invoice numbers', () => {
  let app: INestApplication;
  let admin: string;
  let superTok: string;
  let vendorId: number;
  let vendorCode: string;

  beforeAll(async () => {
    app = await createTestApp();
    await seedCore(app.get(PrismaService));
    admin = await login(app, 'itadmin@newvision.local');
    superTok = await login(app, 'superadmin@newvision.local');
    const vendor = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({ legalName: 'Unique Invoice Vendor Pvt Ltd', paymentTerms: 'Net 30' })
      .expect(201);
    vendorId = vendor.body.id;
    vendorCode = vendor.body.vendorCode;
    await request(app.getHttpServer())
      .patch(`/api/vendors/${vendorId}/status`)
      .set(auth(superTok))
      .send({ status: 'active', reason: 'Ready for invoice uniqueness tests', override: true })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a second invoice with the same number for the same vendor, allows -CORR for Super Admin, and warns on similar amount+date', async () => {
    const invoiceDate = '2026-09-14T00:00:00.000Z';
    const first = await request(app.getHttpServer())
      .post('/api/purchase-orders/invoices')
      .set(auth(admin))
      .send({
        vendorId,
        invoiceNumber: 'INV-100',
        invoiceDate,
        amount: 12500,
      })
      .expect(201);
    expect(first.body.invoiceNumber).toBe('INV-100');
    expect(first.body.similarInvoices).toEqual([]);

    const dup = await request(app.getHttpServer())
      .post('/api/purchase-orders/invoices')
      .set(auth(admin))
      .send({
        vendorId,
        invoiceNumber: 'INV-100',
        invoiceDate,
        amount: 12500,
      })
      .expect(409);
    expect(String(dup.body.message)).toMatch(/INV-100/);
    expect(dup.body.vendorCode).toBe(vendorCode);
    expect(dup.body.existingInvoiceId).toBe(first.body.id);

    await request(app.getHttpServer())
      .post('/api/purchase-orders/invoices')
      .set(auth(admin))
      .send({
        vendorId,
        invoiceNumber: 'INV-100',
        invoiceDate,
        amount: 12500,
        correction: true,
      })
      .expect(403);

    const corr = await request(app.getHttpServer())
      .post('/api/purchase-orders/invoices')
      .set(auth(superTok))
      .send({
        vendorId,
        invoiceNumber: 'INV-100',
        invoiceDate,
        amount: 12500,
        correction: true,
      })
      .expect(201);
    expect(corr.body.invoiceNumber).toBe('INV-100-CORR');

    const similar = await request(app.getHttpServer())
      .post('/api/purchase-orders/invoices')
      .set(auth(admin))
      .send({
        vendorId,
        invoiceNumber: 'INV-101',
        invoiceDate: '2026-09-16T00:00:00.000Z',
        amount: 12500,
      })
      .expect(201);
    expect(similar.body.similarInvoices.some((r: { invoiceNumber: string }) => r.invoiceNumber === 'INV-100')).toBe(
      true,
    );
  });
});
