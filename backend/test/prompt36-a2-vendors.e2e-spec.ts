import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 36 A2 — duplicate vendor guard', () => {
  let app: INestApplication;
  let admin: string;

  beforeAll(async () => {
    app = await createTestApp();
    await seedCore(app.get(PrismaService));
    admin = await login(app, 'itadmin@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 409 with the existing vendor code on the same GSTIN/PAN or bank account', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({
        legalName: 'Dell India Pvt Ltd',
        taxId: '29AABCD1234E1Z5',
        bankAccountNumber: '1234 5678 9012',
        accountHolderName: 'Dell India Pvt Ltd',
      })
      .expect(201);

    const dupGstin = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({
        legalName: 'Dell India again',
        taxId: '29aabcd1234e1z5',
      })
      .expect(409);
    expect(dupGstin.body.vendorCode).toBe(first.body.vendorCode);
    expect(dupGstin.body.existingVendorId).toBe(first.body.id);
    expect(String(dupGstin.body.message)).toMatch(/GSTIN/i);

    const dupBank = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({
        legalName: 'Ghost Dell',
        bankAccountNumber: '123456789012',
        accountHolderName: 'Ghost Dell',
      })
      .expect(409);
    expect(dupBank.body.vendorCode).toBe(first.body.vendorCode);
    expect(dupBank.body.match).toBe('bankAccount');
  });
});
