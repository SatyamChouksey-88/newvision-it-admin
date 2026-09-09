import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Phase 2 — maintenance, warranty alerts & reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    adminToken = await login(app, 'itadmin@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  async function createAssignedAsset(employeeId: number) {
    const created = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, brand: 'Dell', model: 'Latitude' })
      .expect(201);
    await request(server())
      .post(`/api/assets/${created.body.id}/assign`)
      .set(auth(adminToken))
      .send({ employeeId })
      .expect(201);
    return created.body.id as number;
  }

  // ---------------------------------------------------------------- maintenance

  it('runs a repair ticket through reported → under_repair → repaired → reassigned, coupling the asset', async () => {
    const assetId = await createAssignedAsset(ids.employeeA);

    const ticket = await request(server())
      .post('/api/maintenance')
      .set(auth(adminToken))
      .send({ assetId, issue: 'Keyboard not working', vendor: 'Dell Service', estimatedCost: 1500 })
      .expect(201);
    expect(ticket.body.status).toBe('reported');

    // reported → under_repair moves the asset to under_repair
    const toRepair = await request(server())
      .patch(`/api/maintenance/${ticket.body.id}/transition`)
      .set(auth(adminToken))
      .send({ status: 'under_repair' })
      .expect(200);
    expect(toRepair.body.asset.status).toBe('under_repair');

    // under_repair → repaired records completion + actual cost, asset stays under_repair
    const repaired = await request(server())
      .patch(`/api/maintenance/${ticket.body.id}/transition`)
      .set(auth(adminToken))
      .send({ status: 'repaired', actualCost: 1200 })
      .expect(200);
    expect(repaired.body.status).toBe('repaired');
    expect(repaired.body.completedAt).not.toBeNull();
    expect(repaired.body.asset.status).toBe('under_repair');

    // repaired → reassigned returns the asset to its previous assignee
    const reassigned = await request(server())
      .patch(`/api/maintenance/${ticket.body.id}/transition`)
      .set(auth(adminToken))
      .send({ status: 'reassigned' })
      .expect(200);
    expect(reassigned.body.status).toBe('reassigned');
    expect(reassigned.body.asset.status).toBe('assigned');
    expect(reassigned.body.asset.assignedEmployeeId).toBe(ids.employeeA);

    // audit trail written for the ticket
    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'AssetMaintenance', entityId: String(ticket.body.id) },
    });
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects an invalid maintenance transition (reported → reassigned) with 400', async () => {
    const assetId = await createAssignedAsset(ids.employeeA);
    const ticket = await request(server())
      .post('/api/maintenance')
      .set(auth(adminToken))
      .send({ assetId, issue: 'Screen flicker' })
      .expect(201);
    await request(server())
      .patch(`/api/maintenance/${ticket.body.id}/transition`)
      .set(auth(adminToken))
      .send({ status: 'reassigned' })
      .expect(400);
  });

  it('lets an employee report an issue on their own asset but not on someone else’s', async () => {
    const employeeToken = await login(app, 'employee@newvision.local'); // employeeA
    const ownAsset = await createAssignedAsset(ids.employeeA);
    const otherAsset = await createAssignedAsset(ids.employeeB);

    await request(server())
      .post('/api/maintenance')
      .set(auth(employeeToken))
      .send({ assetId: ownAsset, issue: 'Battery drains fast' })
      .expect(201);

    await request(server())
      .post('/api/maintenance')
      .set(auth(employeeToken))
      .send({ assetId: otherAsset, issue: 'Not my asset' })
      .expect(403);
  });

  it('forbids employees from viewing the maintenance queue (RBAC)', async () => {
    const employeeToken = await login(app, 'employee@newvision.local');
    await request(server()).get('/api/maintenance').set(auth(employeeToken)).expect(403);
  });

  // ---------------------------------------------------------------- warranty alerts

  it('creates warranty notifications when an asset hits a 30-day threshold', async () => {
    const created = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationHyd, brand: 'HP', model: 'ProBook' })
      .expect(201);
    // Warranty ends exactly 30 days out → matches the 30-day alert threshold today.
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    await prisma.asset.update({ where: { id: created.body.id }, data: { warrantyEnd: in30 } });

    const run = await request(server())
      .post('/api/warranty/run-check')
      .set(auth(adminToken))
      .expect(201);
    expect(run.body.created).toBeGreaterThanOrEqual(1);
    expect(run.body.byThreshold['30']).toBeGreaterThanOrEqual(1);

    const notes = await prisma.notification.findMany({
      where: { type: 'warranty_expiry', assetId: created.body.id },
    });
    expect(notes.length).toBe(1);

    // Re-running is de-duplicated (no second notification for the same asset+threshold).
    await request(server()).post('/api/warranty/run-check').set(auth(adminToken)).expect(201);
    const after = await prisma.notification.count({
      where: { type: 'warranty_expiry', assetId: created.body.id },
    });
    expect(after).toBe(1);
  });

  it('exposes notifications to the current user', async () => {
    const res = await request(server()).get('/api/notifications').set(auth(adminToken)).expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ---------------------------------------------------------------- reports

  it('generates the asset report as CSV', async () => {
    const res = await request(server())
      .get('/api/reports/assets?format=csv')
      .set(auth(adminToken))
      .expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Asset Code');
  });

  it('generates the warranty report as a PDF', async () => {
    const res = await request(server())
      .get('/api/reports/warranty?format=pdf')
      .set(auth(adminToken))
      .buffer(true)
      .expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('rejects an unknown report type with 400', async () => {
    await request(server()).get('/api/reports/bogus').set(auth(adminToken)).expect(400);
  });

  it('allows a Manager to run reports but forbids an Employee (RBAC)', async () => {
    const managerToken = await login(app, 'manager@newvision.local');
    const employeeToken = await login(app, 'employee@newvision.local');
    await request(server()).get('/api/reports/locations?format=csv').set(auth(managerToken)).expect(200);
    await request(server()).get('/api/reports/locations?format=csv').set(auth(employeeToken)).expect(403);
  });
});
