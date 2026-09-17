import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 28 — RBAC leaks (notes, inventory, search)', () => {
  let app: INestApplication;
  let admin: string;
  let manager: string;
  let employee: string;
  let support: string;
  let ids: Awaited<ReturnType<typeof seedCore>>;

  beforeAll(async () => {
    app = await createTestApp();
    ids = await seedCore(app.get(PrismaService), app);
    admin = await login(app, 'itadmin@newvision.local');
    manager = await login(app, 'manager@newvision.local');
    employee = await login(app, 'employee@newvision.local');
    support = await login(app, 'support@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('employees cannot read notes on assets they do not hold', async () => {
    const asset = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, model: 'NoteLeak' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/notes')
      .set(auth(admin))
      .send({ entityType: 'Asset', entityId: String(asset.body.id), body: 'Vendor RMA pending' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/notes')
      .query({ entityType: 'Asset', entityId: String(asset.body.id) })
      .set(auth(employee))
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/assets/${asset.body.id}/assign`)
      .set(auth(admin))
      .send({ employeeId: ids.employeeA })
      .expect(201);

    const own = await request(app.getHttpServer())
      .get('/api/notes')
      .query({ entityType: 'Asset', entityId: String(asset.body.id) })
      .set(auth(employee))
      .expect(200);
    expect(own.body).toHaveLength(1);
  });

  it('employees and managers cannot list accessory or consumable inventory', async () => {
    await request(app.getHttpServer()).get('/api/accessories').set(auth(employee)).expect(403);
    await request(app.getHttpServer()).get('/api/consumables').set(auth(employee)).expect(403);
    await request(app.getHttpServer()).get('/api/accessories').set(auth(manager)).expect(403);
    await request(app.getHttpServer()).get('/api/consumables').set(auth(manager)).expect(403);
    await request(app.getHttpServer()).get('/api/accessories').set(auth(support)).expect(200);
  });

  it('managers only search their own requisitions, not the full catalog', async () => {
    const secretTitle = `Audit28-secret-PR-${Date.now()}`;
    const created = await request(app.getHttpServer())
      .post('/api/purchase-requisitions')
      .set(auth(admin))
      .send({
        title: secretTitle,
        departmentFreeText: 'IT',
        businessRequirement: 'Hidden from other managers.',
        category: 'Licenses/Software',
        procurementType: 'Licenses',
        lineItems: [{ product: 'Seat', unitCost: 10, quantity: 1, kind: 'license' }],
        locationIds: [ids.locationPune],
      })
      .expect(201);
    expect(created.body.requisitionNumber).toBeTruthy();

    const asManager = await request(app.getHttpServer())
      .get('/api/search')
      .query({ q: 'Audit28-secret-PR' })
      .set(auth(manager))
      .expect(200);
    expect(asManager.body.requisitions).toHaveLength(0);
    expect(asManager.body.vendors).toHaveLength(0);

    const otherEmp = await request(app.getHttpServer())
      .get('/api/search')
      .query({ q: 'Bala' })
      .set(auth(manager))
      .expect(200);
    expect(otherEmp.body.employees).toHaveLength(0);

    const asAdmin = await request(app.getHttpServer())
      .get('/api/search')
      .query({ q: 'Audit28-secret-PR' })
      .set(auth(admin))
      .expect(200);
    expect(asAdmin.body.requisitions.some((r: { title: string }) => r.title === secretTitle)).toBe(
      true,
    );
  });

  it('managers cannot export estate-wide inventory or vendor reports', async () => {
    const other = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({
        categoryId: ids.categoryLap,
        locationId: ids.locationHyd,
        model: 'HiddenFromManager',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/assets/${other.body.id}/assign`)
      .set(auth(admin))
      .send({ employeeId: ids.employeeB })
      .expect(201);

    const csv = await request(app.getHttpServer())
      .get('/api/reports/assets')
      .query({ format: 'csv' })
      .set(auth(manager))
      .expect(200);
    expect(csv.text).not.toContain(other.body.assetCode);
    expect(csv.text).not.toContain('HiddenFromManager');

    await request(app.getHttpServer())
      .get('/api/reports/supplies')
      .query({ format: 'csv' })
      .set(auth(manager))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/reports/procurement-spend')
      .query({ format: 'csv' })
      .set(auth(manager))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/reports/procurement-scorecards')
      .query({ format: 'csv' })
      .set(auth(support))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/dashboard/trends')
      .query({ months: '6' })
      .set(auth(employee))
      .expect(403);
  });
});
