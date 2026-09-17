import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 36 A4 — maker ≠ checker and account holder', () => {
  let app: INestApplication;
  let itAdmin: string;
  let superAdmin: string;

  beforeAll(async () => {
    app = await createTestApp();
    await seedCore(app.get(PrismaService), app);
    itAdmin = await login(app, 'itadmin@newvision.local');
    superAdmin = await login(app, 'superadmin@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires an account holder when a bank account is stored, with a reason if names differ', async () => {
    const missing = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(itAdmin))
      .send({
        legalName: 'Holder Required Pvt Ltd',
        bankAccountNumber: '111122223333',
      })
      .expect(400);
    expect(String(missing.body.message)).toMatch(/account holder/i);

    const mismatch = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(itAdmin))
      .send({
        legalName: 'Legal Name Pvt Ltd',
        bankAccountNumber: '111122223334',
        accountHolderName: 'Someone Else',
      })
      .expect(400);
    expect(String(mismatch.body.message)).toMatch(/legal name/i);

    const ok = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(itAdmin))
      .send({
        legalName: 'Legal Name Pvt Ltd',
        bankAccountNumber: '111122223335',
        accountHolderName: 'Someone Else',
        accountHolderOverrideReason: 'Escrow account',
      })
      .expect(201);
    expect(ok.body.accountHolderName).toBe('Someone Else');
    expect(ok.body.accountHolderOverrideReason).toBe('Escrow account');
  });

  it('blocks the same IT Admin from approving their own bank change or first activation', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(itAdmin))
      .send({
        legalName: 'Maker Checker Pvt Ltd',
        bankAccountNumber: '998877665544',
        accountHolderName: 'Maker Checker Pvt Ltd',
      })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/vendors/${created.body.id}`)
      .set(auth(itAdmin))
      .send({
        bankAccountNumber: '998877665500',
        accountHolderName: 'Maker Checker Pvt Ltd',
      })
      .expect(200);

    const sameBank = await request(app.getHttpServer())
      .post(`/api/vendors/${created.body.id}/approve-bank`)
      .set(auth(itAdmin))
      .expect(400);
    expect(String(sameBank.body.message)).toMatch(/second (Super Admin|admin)/i);

    await request(app.getHttpServer())
      .post(`/api/vendors/${created.body.id}/approve-bank`)
      .set(auth(superAdmin))
      .expect(200);

    const draft = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(itAdmin))
      .send({ legalName: 'Activate Guard Pvt Ltd', country: 'US' })
      .expect(201);

    const sameActivate = await request(app.getHttpServer())
      .patch(`/api/vendors/${draft.body.id}/status`)
      .set(auth(itAdmin))
      .send({ status: 'active', reason: 'Ready to buy' })
      .expect(400);
    expect(String(sameActivate.body.message)).toMatch(/second (Super Admin|admin)/i);

    await request(app.getHttpServer())
      .patch(`/api/vendors/${draft.body.id}/status`)
      .set(auth(superAdmin))
      .send({ status: 'active', reason: 'Confirmed by second admin', override: true })
      .expect(200);
  });
});
