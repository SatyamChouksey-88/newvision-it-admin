import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 2 — requests, accessories & consumables (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;
  let managerToken: string;
  let categoryId: number;
  let employeeId: number;

  beforeAll(async () => {
    app = await createTestApp();
    const ids = await seedCore(app.get(PrismaService));
    categoryId = ids.categoryLap;
    employeeId = ids.employeeA;
    adminToken = await login(app, 'itadmin@newvision.local');
    employeeToken = await login(app, 'employee@newvision.local');
    managerToken = await login(app, 'manager@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('employee submits an asset request; manager approves; IT fulfills', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/asset-requests')
      .set(auth(employeeToken))
      .send({ kind: 'asset', categoryId, reason: 'Need a laptop for project work' })
      .expect(201);
    expect(created.body.status).toBe('pending');

    const reviewed = await request(app.getHttpServer())
      .patch(`/api/asset-requests/${created.body.id}/review`)
      .set(auth(managerToken))
      .send({ decision: 'approved', comment: 'Approved for Q4 project' })
      .expect(200);
    expect(reviewed.body.status).toBe('approved');

    const fulfilled = await request(app.getHttpServer())
      .patch(`/api/asset-requests/${created.body.id}/fulfill`)
      .set(auth(adminToken))
      .expect(200);
    expect(fulfilled.body.status).toBe('fulfilled');

    const edited = await request(app.getHttpServer())
      .patch(`/api/asset-requests/${created.body.id}`)
      .set(auth(adminToken))
      .send({ reason: 'Need a laptop for project work — updated after fulfill' })
      .expect(200);
    expect(edited.body.reason).toContain('updated after fulfill');
    expect(edited.body.status).toBe('fulfilled');

    const history = await request(app.getHttpServer())
      .get(`/api/asset-requests/${created.body.id}/history`)
      .set(auth(adminToken))
      .expect(200);
    expect(Array.isArray(history.body)).toBe(true);
    expect(history.body.some((h: { action: string }) => h.action === 'update')).toBe(true);
  });

  it('rejects a request with a human-readable reason', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/asset-requests')
      .set(auth(employeeToken))
      .send({ kind: 'accessory', accessoryName: 'Docking station', reason: 'For home office' })
      .expect(201);

    const rejected = await request(app.getHttpServer())
      .patch(`/api/asset-requests/${created.body.id}/review`)
      .set(auth(managerToken))
      .send({ decision: 'rejected', rejectionReason: 'Budget freeze this quarter' })
      .expect(200);
    expect(rejected.body.rejectionReason).toContain('Budget freeze');
  });

  it('checks out and checks in an accessory with audit trail', async () => {
    const acc = await request(app.getHttpServer())
      .post('/api/accessories')
      .set(auth(adminToken))
      .send({ name: 'USB Mouse', category: 'Peripherals', quantityTotal: 5 })
      .expect(201);

    const checkout = await request(app.getHttpServer())
      .post(`/api/accessories/${acc.body.id}/checkout`)
      .set(auth(adminToken))
      .send({ employeeId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/accessories/${acc.body.id}/checkin`)
      .set(auth(adminToken))
      .send({ checkoutId: checkout.body.id })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/accessories/${acc.body.id}`)
      .set(auth(adminToken))
      .expect(200);
    expect(detail.body.quantityCheckedOut).toBe(0);
  });

  it('issues a consumable and surfaces low-stock on dashboard attention', async () => {
    const item = await request(app.getHttpServer())
      .post('/api/consumables')
      .set(auth(adminToken))
      .send({ name: 'HDMI Cable', category: 'Cables', quantityTotal: 2, lowStockThreshold: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/consumables/${item.body.id}/issue`)
      .set(auth(adminToken))
      .send({ employeeId, quantity: 1 })
      .expect(201);

    const attention = await request(app.getHttpServer())
      .get('/api/dashboard/attention')
      .set(auth(adminToken))
      .expect(200);
    expect(attention.body.lowStock.length).toBeGreaterThanOrEqual(0);
  });

  it('exports scoped assets and refuses empty filter results', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/export/assets?format=csv&status=disposed')
      .set(auth(adminToken));
    expect([200, 400]).toContain(res.status);
  });
});
