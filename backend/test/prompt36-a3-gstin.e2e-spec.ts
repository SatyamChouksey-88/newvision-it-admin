import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 36 A3 — GSTIN and PAN fields', () => {
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

  it('stores GSTIN+PAN, copies taxId, and blocks a GSTIN whose embedded PAN does not match', async () => {
    const ok = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({
        legalName: 'Wellformed GST Vendor',
        gstin: '27ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
      })
      .expect(201);
    expect(ok.body.gstin).toBe('27ABCDE1234F1Z5');
    expect(ok.body.pan).toBe('ABCDE1234F');
    expect(ok.body.taxId).toBe('27ABCDE1234F1Z5');

    const mismatch = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({
        legalName: 'Mismatched PAN Vendor',
        gstin: '27ABCDE1234F1Z5',
        pan: 'WRONGPAN00A',
      })
      .expect(400);
    expect(String(mismatch.body.message)).toMatch(/PAN/i);
  });
});
