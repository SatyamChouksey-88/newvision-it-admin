import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Dashboard, search, scoping & import (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    adminToken = await login(app, 'itadmin@newvision.local');

    // create a few assets and assign one to employee A
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/api/assets')
        .set(auth(adminToken))
        .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, model: `M${i}` })
        .expect(201);
    }
    const first = await prisma.asset.findFirst({ orderBy: { id: 'asc' } });
    await request(app.getHttpServer())
      .post(`/api/assets/${first!.id}/assign`)
      .set(auth(adminToken))
      .send({ employeeId: ids.employeeA })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns dashboard metric cards', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/metrics')
      .set(auth(adminToken))
      .expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(res.body.assigned).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('warrantyExpiring');
  });

  it('supports a per-location dashboard filter', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/dashboard/metrics?locationId=${ids.locationHyd}`)
      .set(auth(adminToken))
      .expect(200);
    expect(res.body.total).toBe(0); // all assets are in Pune
  });

  it('returns dashboard chart data (by-location, trends, byStatus)', async () => {
    const metrics = await request(app.getHttpServer())
      .get('/api/dashboard/metrics')
      .set(auth(adminToken))
      .expect(200);
    expect(metrics.body.byStatus).toBeDefined();
    expect(typeof metrics.body.byStatus.assigned).toBe('number');

    const byLoc = await request(app.getHttpServer())
      .get('/api/dashboard/by-location')
      .set(auth(adminToken))
      .expect(200);
    expect(Array.isArray(byLoc.body)).toBe(true);
    expect(byLoc.body.length).toBeGreaterThanOrEqual(2);

    const trends = await request(app.getHttpServer())
      .get('/api/dashboard/trends?months=6')
      .set(auth(adminToken))
      .expect(200);
    expect(Array.isArray(trends.body)).toBe(true);
    expect(trends.body.length).toBe(6);
    expect(trends.body[0]).toHaveProperty('month');
    expect(trends.body[0]).toHaveProperty('count');
  });

  it('finds assets and employees via global search', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/search?q=AST-PUN')
      .set(auth(adminToken))
      .expect(200);
    expect(res.body.assets.length).toBeGreaterThanOrEqual(1);

    const byEmp = await request(app.getHttpServer())
      .get('/api/search?q=Asha')
      .set(auth(adminToken))
      .expect(200);
    expect(byEmp.body.employees.length).toBeGreaterThanOrEqual(1);
  });

  it('scopes an Employee to only their own assigned assets', async () => {
    const employeeToken = await login(app, 'employee@newvision.local');
    const res = await request(app.getHttpServer())
      .get('/api/assets')
      .set(auth(employeeToken))
      .expect(200);
    expect(
      res.body.data.every(
        (a: { assignedEmployeeId: number }) => a.assignedEmployeeId === ids.employeeA,
      ),
    ).toBe(true);
    expect(res.body.total).toBe(1);
  });

  it('imports a CSV of assets, reporting created rows and per-row errors', async () => {
    const csv = [
      'location,category,brand,model,serialNumber',
      'PUN,LAP,HP,EliteBook 840,SN-IMPORT-1',
      'ZZZ,LAP,HP,Bad Location,SN-IMPORT-2',
    ].join('\n');

    const res = await request(app.getHttpServer())
      .post('/api/import/assets')
      .set(auth(adminToken))
      .attach('file', Buffer.from(csv), 'assets.csv')
      .expect(201);

    expect(res.body.total).toBe(2);
    expect(res.body.created).toBe(1);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0].row).toBe(3);
  });

  it('exports assets as CSV', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/export/assets?format=csv')
      .set(auth(adminToken))
      .expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('assetCode');
  });
});
