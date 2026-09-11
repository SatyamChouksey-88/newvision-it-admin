import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Prompt 22 #9–#20 ops (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let admin: string;
  let support: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    admin = await login(app, 'itadmin@newvision.local');
    support = await login(app, 'support@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('issues a kit: next available laptop plus accessories', async () => {
    const mouse = await prisma.accessory.create({
      data: { name: 'Kit mouse', category: 'Peripherals', quantityTotal: 10, quantityCheckedOut: 0 },
    });
    const kit = await request(app.getHttpServer())
      .post('/api/issue-kits')
      .set(auth(admin))
      .send({
        name: 'Pune laptop standard',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        accessoryIds: [mouse.id],
      })
      .expect(201);
    const asset = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-KIT1',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
        brand: 'Dell',
        model: 'Kit',
      },
    });
    const issued = await request(app.getHttpServer())
      .post(`/api/issue-kits/${kit.body.id}/issue`)
      .set(auth(admin))
      .send({ employeeId: ids.employeeA })
      .expect(201);
    expect(issued.body.asset.id).toBe(asset.id);
    expect(issued.body.asset.status).toBe('assigned');
    const checkout = await prisma.accessoryCheckout.findFirst({
      where: { accessoryId: mouse.id, employeeId: ids.employeeA, checkedInAt: null },
    });
    expect(checkout).toBeTruthy();
  });

  it('bulk-assigns available assets to one employee', async () => {
    const a = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-BLK1',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
      },
    });
    const b = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-BLK2',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
      },
    });
    const res = await request(app.getHttpServer())
      .post('/api/assets/bulk')
      .set(auth(admin))
      .send({ ids: [a.id, b.id], action: 'assign', employeeId: ids.employeeB })
      .expect(201);
    expect(res.body.succeeded).toBe(2);
    const again = await prisma.asset.findUniqueOrThrow({ where: { id: a.id } });
    expect(again.assignedEmployeeId).toBe(ids.employeeB);
  });

  it('stamps lastAuditedAt and filters unaudited', async () => {
    const asset = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-AUD1',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
      },
    });
    await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/audit`)
      .set(auth(admin))
      .send({})
      .expect(201);
    const stamped = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(stamped.lastAuditedAt).toBeTruthy();
    const list = await request(app.getHttpServer())
      .get('/api/assets')
      .query({ unaudited: 'true', _start: 0, _end: 50 })
      .set(auth(admin))
      .expect(200);
    expect(list.body.data.some((row: { id: number }) => row.id === asset.id)).toBe(false);
  });

  it('stores expectedReturnAt on assign and lists overdue loaners on My work', async () => {
    const asset = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-LOAN1',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
      },
    });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await request(app.getHttpServer())
      .post(`/api/assets/${asset.id}/assign`)
      .set(auth(admin))
      .send({ employeeId: ids.employeeA, expectedReturnAt: yesterday.toISOString() })
      .expect(201);
    const att = await request(app.getHttpServer())
      .get('/api/dashboard/attention')
      .set(auth(admin))
      .expect(200);
    expect(att.body.myWork.some((row: { type: string; label: string }) => row.type === 'loaner' && row.label === 'AST-PUN-LAP-LOAN1')).toBe(
      true,
    );
  });

  it('lists my-due-tomorrow tickets and records presence', async () => {
    const cat = await prisma.ticketCategory.findFirstOrThrow({ where: { code: 'software' } });
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: 'itadmin@newvision.local' } });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: `TCK-DUE-${Date.now()}`,
        subject: 'Due tomorrow',
        description: 'Check backup',
        categoryId: cat.id,
        priority: 'medium',
        status: 'assigned',
        raisedById: ids.employeeA,
        assignedToId: adminUser.id,
        dueDate: tomorrow,
      },
    });
    const list = await request(app.getHttpServer())
      .get('/api/support-tickets')
      .query({ view: 'due_tomorrow', _start: 0, _end: 20 })
      .set(auth(admin))
      .expect(200);
    expect(list.body.data.some((t: { id: number }) => t.id === ticket.id)).toBe(true);
    const dash = await request(app.getHttpServer()).get('/api/dashboard/tickets').set(auth(admin)).expect(200);
    expect(dash.body.myDueTomorrow).toBeGreaterThanOrEqual(1);
    const presence = await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.id}/presence`)
      .set(auth(support))
      .expect(201);
    expect(Array.isArray(presence.body.viewers)).toBe(true);
    const asAdmin = await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.id}/presence`)
      .set(auth(admin))
      .expect(201);
    expect(asAdmin.body.viewers.some((v: { name: string }) => /support/i.test(v.name))).toBe(true);
  });

  it('jumps to an exact EMP-code and creates a login from the runbook', async () => {
    const exact = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ q: 'EMP-00001', _start: 0, _end: 20 })
      .set(auth(admin))
      .expect(200);
    expect(exact.body.data).toHaveLength(1);
    expect(exact.body.data[0].employeeCode).toBe('EMP-00001');

    const bare = await prisma.employee.create({
      data: {
        employeeCode: 'EMP-NLOGIN',
        firstName: 'No',
        lastName: 'Login',
        email: 'nologin@newvision.local',
        locationId: ids.locationPune,
        departmentId: ids.department,
      },
    });
    await request(app.getHttpServer())
      .post(`/api/employees/${bare.id}/create-login`)
      .set(auth(admin))
      .expect(201);
    const user = await prisma.user.findUnique({ where: { employeeId: bare.id } });
    expect(user?.email).toBe('nologin@newvision.local');
  });

  it('fills {{employee}} / {{asset}} on ticket create from a template', async () => {
    const cat = await prisma.ticketCategory.findFirstOrThrow({ where: { code: 'software' } });
    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'itadmin@newvision.local' },
    });
    const asset = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-TPL1',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'assigned',
        assignedEmployeeId: ids.employeeA,
      },
    });
    const tpl = await prisma.ticketTemplate.create({
      data: {
        title: 'Install app',
        subject: 'Software for {{employee}}',
        description: 'Install on {{asset}}',
        categoryId: cat.id,
        createdById: adminUser.id,
      },
    });
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(admin))
      .send({
        subject: 'Software for {{employee}}',
        description: 'Install on {{asset}}',
        categoryId: cat.id,
        templateId: tpl.id,
        assetId: asset.id,
        raisedByEmployeeId: ids.employeeA,
      })
      .expect(201);
    expect(created.body.subject).toContain('EMP-00001');
    expect(created.body.description).toContain('AST-PUN-LAP-TPL1');
  });

  it('rejects kit issue for IT Support', async () => {
    await request(app.getHttpServer())
      .post('/api/issue-kits')
      .set(auth(support))
      .send({ name: 'Nope', categoryId: ids.categoryLap })
      .expect(403);
  });
});
