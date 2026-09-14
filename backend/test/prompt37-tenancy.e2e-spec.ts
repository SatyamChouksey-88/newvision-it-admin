import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { auth, createTestApp, DEMO_PASSWORD } from './helpers';

const password = 'TrialPassword1!';

async function signup(
  app: INestApplication,
  company: string,
  email: string,
  loadSample = false,
) {
  const res = await request(app.getHttpServer())
    .post('/api/auth/signup')
    .send({ companyName: company, fullName: 'Owner', email, password, loadSample })
    .expect(201);
  expect(res.body.access_token).toBeTruthy();
  return res.body.access_token as string;
}

describe('Prompt 37 — tenant isolation, signup, plan gating', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs up two tenants and blocks cross-tenant reads via the API', async () => {
    const tokenA = await signup(app, 'Acme Isolation', `a-${Date.now()}@acme.test`);
    const tokenB = await signup(app, 'Beta Isolation', `b-${Date.now()}@beta.test`);

    await request(app.getHttpServer()).post('/api/tenant/onboarding/skip').set(auth(tokenA)).expect(201);
    await request(app.getHttpServer()).post('/api/tenant/onboarding/skip').set(auth(tokenB)).expect(201);

    const locA = await request(app.getHttpServer())
      .post('/api/locations')
      .set(auth(tokenA))
      .send({ code: 'PUN', name: 'Pune', city: 'Pune' })
      .expect(201);
    const catsA = await request(app.getHttpServer()).get('/api/asset-categories').set(auth(tokenA)).expect(200);
    const catId = (catsA.body.data ?? catsA.body)[0]?.id;
    expect(catId).toBeTruthy();
    const ticketCats = await request(app.getHttpServer())
      .get('/api/ticket-categories')
      .set(auth(tokenA))
      .expect(200);
    const ticketCatId = (Array.isArray(ticketCats.body) ? ticketCats.body : ticketCats.body.data)?.[0]
      ?.id;
    expect(ticketCatId).toBeTruthy();

    const empA = await request(app.getHttpServer())
      .post('/api/employees')
      .set(auth(tokenA))
      .send({
        employeeCode: 'EMP-A1',
        firstName: 'Ada',
        lastName: 'Acme',
        email: `ada-${Date.now()}@acme.test`,
        locationId: locA.body.id,
        dateJoined: new Date().toISOString(),
      })
      .expect(201);

    const assetA = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(tokenA))
      .send({
        categoryId: catId,
        locationId: locA.body.id,
        brand: 'Dell',
        model: 'Latitude 5440',
        serialNumber: `SN-A-${Date.now()}`,
      })
      .expect(201);

    const assetsA = await request(app.getHttpServer()).get('/api/assets').set(auth(tokenA)).expect(200);
    const listA = assetsA.body.data ?? assetsA.body;
    expect((Array.isArray(listA) ? listA : []).some((row: { id: number }) => row.id === assetA.body.id)).toBe(
      true,
    );

    const ticketA = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(tokenA))
      .send({
        subject: 'Outlook search is empty',
        description: 'Index rebuild',
        categoryId: ticketCatId,
        raisedByEmployeeId: empA.body.id,
        autoAssign: false,
      })
      .expect(201);

    await request(app.getHttpServer()).get(`/api/assets/${assetA.body.id}`).set(auth(tokenB)).expect(404);
    await request(app.getHttpServer()).get(`/api/employees/${empA.body.id}`).set(auth(tokenB)).expect(404);
    await request(app.getHttpServer())
      .get(`/api/support-tickets/${ticketA.body.id}`)
      .set(auth(tokenB))
      .expect(404);

    const assetsB = await request(app.getHttpServer()).get('/api/assets').set(auth(tokenB)).expect(200);
    const list = assetsB.body.data ?? assetsB.body;
    expect(Array.isArray(list) ? list : []).toEqual([]);

    const vendorA = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(tokenA))
      .send({ legalName: 'Acme Vendor Pvt Ltd' })
      .expect(201);
    await request(app.getHttpServer()).get(`/api/vendors/${vendorA.body.id}`).set(auth(tokenB)).expect(404);

    const notesA = await request(app.getHttpServer()).get('/api/notifications').set(auth(tokenA));
    const notesB = await request(app.getHttpServer()).get('/api/notifications').set(auth(tokenB));
    if (notesA.status === 200 && notesB.status === 200) {
      const idsA = new Set((notesA.body.data ?? notesA.body).map((n: { id: number }) => n.id));
      for (const n of notesB.body.data ?? notesB.body) {
        expect(idsA.has(n.id)).toBe(false);
      }
    }
  });

  it('gates procurement and chat on Starter even with a valid JWT', async () => {
    process.env.PLATFORM_ADMIN_SECRET = 'platform-test-secret';
    const token = await signup(app, 'Starter Shop', `starter-${Date.now()}@shop.test`);
    const me = await request(app.getHttpServer()).get('/api/auth/me').set(auth(token)).expect(200);
    const tenantId = me.body.tenantId ?? me.body.tenant?.id;
    expect(tenantId).toBeTruthy();

    await request(app.getHttpServer())
      .patch(`/api/platform/tenants/${tenantId}`)
      .send({ secret: 'platform-test-secret', plan: 'starter', status: 'active' })
      .expect(200);

    await request(app.getHttpServer()).get('/api/vendors').set(auth(token)).expect(403);
    await request(app.getHttpServer()).get('/api/chat/unread').set(auth(token)).expect(403);
    await request(app.getHttpServer()).get('/api/assets').set(auth(token)).expect(200);
  });

  it('exports tenant data and reports a real health check', async () => {
    const token = await signup(app, 'Export Co', `export-${Date.now()}@ex.test`);
    const exported = await request(app.getHttpServer()).get('/api/tenant/export').set(auth(token)).expect(200);
    expect(exported.body.employees).toBeDefined();
    expect(exported.body.assets).toBeDefined();
    const health = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(health.body.ok).toBe(true);
    expect(health.body.db).toBe('up');
    expect(health.body.residency).toBeTruthy();
  });

  it('does not print demo credentials on login with a random email', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.test', password: DEMO_PASSWORD })
      .expect(401);
    expect(JSON.stringify(res.body)).not.toMatch(/Password123/);
  });
});
