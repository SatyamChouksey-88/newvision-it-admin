import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ImportJobsService } from '../src/import-jobs/import-jobs.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Phase 3 — import jobs, saved views, bulk actions, reconciliation (e2e)', () => {
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

  // ---------------------------------------------------------------- import jobs

  it('uploads a file, dry-runs with column mapping, commits, then rolls back', async () => {
    const csv = [
      'Serial No,Location Code,Category,Brand,Model',
      'SN-JOB-1,PUN,LAP,Lenovo,ThinkPad T14',
      'SN-JOB-DUP,PUN,LAP,Lenovo,Dup In File',
      'SN-JOB-DUP,PUN,LAP,Lenovo,Dup In File 2',
    ].join('\n');

    const created = await request(server())
      .post('/api/import-jobs?kind=assets')
      .set(auth(adminToken))
      .attach('file', Buffer.from(csv), 'job.csv')
      .expect(201);
    expect(created.body.totalRows).toBe(3);
    expect(created.body.mapping['Serial No']).toBe('serialNumber');
    expect(created.body.mapping['Location Code']).toBe('location');

    const previewed = await request(server())
      .post(`/api/import-jobs/${created.body.id}/preview`)
      .set(auth(adminToken))
      .send({ mapping: created.body.mapping })
      .expect(201);
    expect(previewed.body.status).toBe('previewed');
    expect(previewed.body.duplicateCount).toBeGreaterThanOrEqual(1);

    // Process synchronously so the test does not race the in-process queue.
    const jobs = app.get(ImportJobsService);
    const admin = { id: (await prisma.user.findFirstOrThrow({ where: { email: 'itadmin@newvision.local' } })).id } as never;
    const done = await jobs.process(created.body.id, admin);
    expect(done.status).toBe('completed');
    // First occurrence of SN-JOB-DUP is kept; the repeat in the file is skipped.
    expect(done.createdCount).toBe(2);
    expect(done.failedCount).toBe(1);

    const imported = await prisma.asset.findUnique({ where: { serialNumber: 'SN-JOB-1' } });
    expect(imported).not.toBeNull();

    await request(server())
      .post(`/api/import-jobs/${created.body.id}/rollback`)
      .set(auth(adminToken))
      .expect(201);
    expect(await prisma.asset.findUnique({ where: { serialNumber: 'SN-JOB-1' } })).toBeNull();
  });

  it('forbids an Employee from creating an import job (RBAC)', async () => {
    const employeeToken = await login(app, 'employee@newvision.local');
    await request(server())
      .post('/api/import-jobs?kind=assets')
      .set(auth(employeeToken))
      .attach('file', Buffer.from('location,category\nPUN,LAP\n'), 'x.csv')
      .expect(403);
  });

  // ---------------------------------------------------------------- saved views

  it('saves, lists, and deletes a filter view; others cannot delete it', async () => {
    const created = await request(server())
      .post('/api/saved-views')
      .set(auth(adminToken))
      .send({ name: 'Available only', resource: 'assets', filters: { status: 'available' }, isShared: true })
      .expect(201);
    expect(created.body.filters.status).toBe('available');

    const list = await request(server())
      .get('/api/saved-views?resource=assets')
      .set(auth(adminToken))
      .expect(200);
    expect(list.body.data.some((v: { id: number }) => v.id === created.body.id)).toBe(true);

    const employeeToken = await login(app, 'employee@newvision.local');
    await request(server())
      .delete(`/api/saved-views/${created.body.id}`)
      .set(auth(employeeToken))
      .expect(403);

    await request(server()).delete(`/api/saved-views/${created.body.id}`).set(auth(adminToken)).expect(200);
  });

  // ---------------------------------------------------------------- bulk actions

  it('bulk-retires selected assets and reports a per-id failure', async () => {
    const a = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, brand: 'Dell' })
      .expect(201);
    const b = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, brand: 'HP' })
      .expect(201);

    const res = await request(server())
      .post('/api/assets/bulk')
      .set(auth(adminToken))
      .send({ ids: [a.body.id, b.body.id, 999999], action: 'retire' })
      .expect(201);
    expect(res.body.succeeded).toBe(2);
    expect(res.body.failed).toBe(1);

    const retired = await prisma.asset.findUnique({ where: { id: a.body.id } });
    expect(retired?.status).toBe('retired');
  });

  it('bulk-transfers assigned assets to another location', async () => {
    const created = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune })
      .expect(201);
    await request(server())
      .post(`/api/assets/${created.body.id}/assign`)
      .set(auth(adminToken))
      .send({ employeeId: ids.employeeA })
      .expect(201);

    const res = await request(server())
      .post('/api/assets/bulk')
      .set(auth(adminToken))
      .send({ ids: [created.body.id], action: 'transfer', toLocationId: ids.locationHyd })
      .expect(201);
    expect(res.body.succeeded).toBe(1);
    const moved = await prisma.asset.findUnique({ where: { id: created.body.id } });
    expect(moved?.locationId).toBe(ids.locationHyd);
  });

  it('rejects a bulk status change with no target status', async () => {
    await request(server())
      .post('/api/assets/bulk')
      .set(auth(adminToken))
      .send({ ids: [1], action: 'status' })
      .expect(400);
  });

  // ---------------------------------------------------------------- reconciliation

  it('flags employees present only in the HR file or only in the system', async () => {
    const csv = [
      'employeeCode,firstName,lastName',
      `EMP-00001,Asha,Apte`,
      'EMP-HR-ONLY,Hari,Only',
    ].join('\n');

    const res = await request(server())
      .post('/api/reconciliation?kind=employees&matchField=employeeCode')
      .set(auth(adminToken))
      .attach('file', Buffer.from(csv), 'hr.csv')
      .expect(201);

    expect(res.body.matched).toBe(1);
    expect(res.body.inFileOnly).toBe(1);
    expect(res.body.inSystemOnly).toBeGreaterThanOrEqual(1);
    expect(res.body.findings.inFileOnly[0].key).toBe('emp-hr-only');
  });

  it('forbids an Employee from running reconciliation', async () => {
    const employeeToken = await login(app, 'employee@newvision.local');
    await request(server())
      .post('/api/reconciliation?kind=employees')
      .set(auth(employeeToken))
      .attach('file', Buffer.from('employeeCode\nX\n'), 'hr.csv')
      .expect(403);
  });
});
