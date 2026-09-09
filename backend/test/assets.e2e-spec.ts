import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Assets lifecycle (e2e)', () => {
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

  async function createAsset() {
    const res = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        brand: 'Dell',
        model: 'Latitude 5540',
      })
      .expect(201);
    return res.body;
  }

  it('creates an asset with an auto-generated AST code and writes an audit log', async () => {
    const asset = await createAsset();
    expect(asset.assetCode).toMatch(/^AST-PUN-LAP-\d{4}$/);
    expect(asset.status).toBe('available');

    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'Asset', entityId: String(asset.id), action: 'create' },
    });
    expect(logs.length).toBe(1);
  });

  it('forbids non-IT roles from creating assets (RBAC failure path)', async () => {
    const employeeToken = await login(app, 'employee@newvision.local');
    await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(employeeToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune })
      .expect(403);
  });

  it('assigns an asset, moving it to assigned and recording an assignment row', async () => {
    const asset = await createAsset();
    const res = await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/assign`)
      .set(auth(adminToken))
      .send({ employeeId: ids.employeeA })
      .expect(201);
    expect(res.body.status).toBe('assigned');
    expect(res.body.assignedEmployeeId).toBe(ids.employeeA);

    const open = await prisma.assetAssignment.findMany({
      where: { assetId: asset.id, returnedAt: null },
    });
    expect(open.length).toBe(1);
  });

  it('transfers an assigned asset to another employee, closing the old assignment', async () => {
    const asset = await createAsset();
    await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/assign`)
      .set(auth(adminToken))
      .send({ employeeId: ids.employeeA })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/transfer`)
      .set(auth(adminToken))
      .send({ toEmployeeId: ids.employeeB, reason: 'Team change' })
      .expect(201);
    expect(res.body.assignedEmployeeId).toBe(ids.employeeB);

    const open = await prisma.assetAssignment.findMany({
      where: { assetId: asset.id, returnedAt: null },
    });
    expect(open.length).toBe(1);
    expect(open[0].employeeId).toBe(ids.employeeB);

    const transfers = await prisma.assetTransfer.findMany({ where: { assetId: asset.id } });
    expect(transfers.length).toBe(1);
  });

  it('retires an asset and clears its assignee', async () => {
    const asset = await createAsset();
    await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/assign`)
      .set(auth(adminToken))
      .send({ employeeId: ids.employeeA })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/retire`)
      .set(auth(adminToken))
      .send({ reason: 'End of life' })
      .expect(201);
    expect(res.body.status).toBe('retired');
    expect(res.body.assignedEmployeeId).toBeNull();
  });

  it('rejects an invalid status transition (available → disposed) with 400', async () => {
    const asset = await createAsset();
    await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'disposed' })
      .expect(400);
  });

  it('lists assets with pagination metadata', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/assets?_start=0&_end=5')
      .set(auth(adminToken))
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });
});
