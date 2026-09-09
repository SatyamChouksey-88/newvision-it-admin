import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Employees — history & offboarding (e2e)', () => {
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

  it('returns merged employee history sorted by date', async () => {
    const created = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, model: 'HistoryTest' })
      .expect(201);

    await request(server())
      .post(`/api/assets/${created.body.id}/assign`)
      .set(auth(adminToken))
      .send({ employeeId: ids.employeeA })
      .expect(201);

    const history = await request(server())
      .get(`/api/employees/${ids.employeeA}/history`)
      .set(auth(adminToken))
      .expect(200);

    expect(Array.isArray(history.body)).toBe(true);
    expect(history.body.length).toBeGreaterThan(0);
    const kinds = history.body.map((e: { kind: string }) => e.kind);
    expect(kinds.some((k: string) => k.includes('Asset assignment'))).toBe(true);
    for (let i = 1; i < history.body.length; i++) {
      expect(new Date(history.body[i - 1].at).getTime()).toBeGreaterThanOrEqual(
        new Date(history.body[i].at).getTime(),
      );
    }
  });

  it('offboards employee: returns assets, checks in accessories, deactivates account', async () => {
    const accessory = await prisma.accessory.create({
      data: { name: 'Test Mouse', category: 'Peripherals', quantityTotal: 5, quantityCheckedOut: 0 },
    });
    await request(server())
      .post(`/api/accessories/${accessory.id}/checkout`)
      .set(auth(adminToken))
      .send({ employeeId: ids.employeeB, quantity: 1 })
      .expect(201);

    const assetRes = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, model: 'OffboardTest' })
      .expect(201);
    await request(server())
      .post(`/api/assets/${assetRes.body.id}/assign`)
      .set(auth(adminToken))
      .send({ employeeId: ids.employeeB })
      .expect(201);

    const offboarded = await request(server())
      .post(`/api/employees/${ids.employeeB}/offboard`)
      .set(auth(adminToken))
      .send({ notes: 'Leaving company' })
      .expect(201);

    expect(offboarded.body.isActive).toBe(false);

    const asset = await prisma.asset.findUnique({ where: { id: assetRes.body.id } });
    expect(asset?.status).toBe('available');
    expect(asset?.assignedEmployeeId).toBeNull();

    const acc = await prisma.accessory.findUnique({ where: { id: accessory.id } });
    expect(acc?.quantityCheckedOut).toBe(0);

    const openCheckouts = await prisma.accessoryCheckout.count({
      where: { employeeId: ids.employeeB, checkedInAt: null },
    });
    expect(openCheckouts).toBe(0);

    await request(server())
      .post(`/api/employees/${ids.employeeB}/offboard`)
      .set(auth(adminToken))
      .send({})
      .expect(400);
  });

  it('blocks hard delete when employee has inventory history', async () => {
    await request(server())
      .delete(`/api/employees/${ids.employeeA}`)
      .set(auth(await login(app, 'superadmin@newvision.local')))
      .expect(400);
  });
});
