import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 36 A5 — cancelled cheque + PAN before activate', () => {
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

  it('blocks activating an Indian vendor without PAN and cancelled cheque unless Super Admin overrides', async () => {
    const missing = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(itAdmin))
      .send({ legalName: 'Cheque Needed Pvt Ltd', pan: 'AAAPL1234C' })
      .expect(201);

    const blocked = await request(app.getHttpServer())
      .patch(`/api/vendors/${missing.body.id}/status`)
      .set(auth(superAdmin))
      .send({ status: 'active', reason: 'Ready to buy' })
      .expect(400);
    expect(String(blocked.body.message)).toMatch(/cancelled-cheque|PAN/i);

    await request(app.getHttpServer())
      .patch(`/api/vendors/${missing.body.id}/status`)
      .set(auth(superAdmin))
      .send({ status: 'active', reason: 'Bank letter on file at AP', override: true })
      .expect(200);

    const withDocs = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(itAdmin))
      .send({ legalName: 'Cheque Filed Pvt Ltd', pan: 'BBBPK5678D' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/vendors/${withDocs.body.id}/compliance`)
      .set(auth(itAdmin))
      .field('title', 'Cancelled cheque')
      .field('docKind', 'cancelled_cheque')
      .attach('file', Buffer.from('%PDF-1.4 cheque'), 'cheque.pdf')
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/vendors/${withDocs.body.id}/status`)
      .set(auth(superAdmin))
      .send({ status: 'active', reason: 'KYC complete' })
      .expect(200);
  });
});
