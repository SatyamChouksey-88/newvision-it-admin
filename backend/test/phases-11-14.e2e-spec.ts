import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Phases 11–14 — audit cycles, clients, offboard checklist, depreciation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma, app);
    adminToken = await login(app, 'itadmin@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('creates an audit cycle, adds a finding, and closes it', async () => {
    const asset = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-E2E',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
      },
    });
    const cycle = await request(server())
      .post('/api/audit-cycles')
      .set(auth(adminToken))
      .send({ name: 'Q3 spot check', scopeNote: 'Laptops in Pune' })
      .expect(201);
    await request(server()).post(`/api/audit-cycles/${cycle.body.id}/start`).set(auth(adminToken)).expect(201);
    await request(server())
      .post(`/api/audit-cycles/${cycle.body.id}/findings`)
      .set(auth(adminToken))
      .send({ exceptionType: 'missing_asset', assetId: asset.id, notes: 'Not at desk' })
      .expect(201);
    const closed = await request(server())
      .post(`/api/audit-cycles/${cycle.body.id}/close`)
      .set(auth(adminToken))
      .expect(201);
    expect(closed.body.status).toBe('closed');
  });

  it('manages client accounts and VDI environments', async () => {
    const client = await request(server())
      .post('/api/clients')
      .set(auth(adminToken))
      .send({ code: 'ACME', name: 'Acme Corp' })
      .expect(201);
    const vdi = await request(server())
      .post('/api/clients/vdi')
      .set(auth(adminToken))
      .send({ clientId: client.body.id, name: 'Acme VDI Pool', poolName: 'pool-1' })
      .expect(201);
    expect(vdi.body.clientId).toBe(client.body.id);
    const list = await request(server()).get('/api/clients/vdi').set(auth(adminToken)).expect(200);
    expect(list.body.some((r: { id: number }) => r.id === vdi.body.id)).toBe(true);
  });

  it('returns depreciation on asset detail', async () => {
    const asset = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-DEP',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
        purchaseCost: 1000,
        salvageValue: 100,
        depreciationYears: 5,
        purchaseDate: new Date('2020-01-01'),
      },
    });
    const res = await request(server())
      .get(`/api/assets/${asset.id}`)
      .set(auth(adminToken))
      .expect(200);
    expect(res.body.depreciation?.bookValue).toBeDefined();
  });

  it('spawns an offboard checklist when an employee is offboarded', async () => {
    const emp = await prisma.employee.create({
      data: {
        employeeCode: 'OFF-E2E',
        firstName: 'Off',
        lastName: 'Board',
        email: 'offboard-e2e@newvision.local',
        locationId: ids.locationPune,
        tenantId: 1,
        dateJoined: new Date(),
        isActive: true,
      },
    });
    await request(server())
      .post(`/api/employees/${emp.id}/offboard`)
      .set(auth(adminToken))
      .send({ lastWorkingDate: new Date().toISOString().slice(0, 10) })
      .expect(201);
    const checklist = await prisma.employeeChecklist.findFirst({
      where: { employeeId: emp.id, kind: 'offboard' },
      include: { items: true },
    });
    expect(checklist?.items.length).toBeGreaterThan(0);
  });
});
