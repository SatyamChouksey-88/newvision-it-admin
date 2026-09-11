import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Prompt 22 #6 — My work attention list (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let admin: string;
  let support: string;
  let employee: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    admin = await login(app, 'itadmin@newvision.local');
    support = await login(app, 'support@newvision.local');
    employee = await login(app, 'employee@newvision.local');

    const cat = await prisma.ticketCategory.findFirstOrThrow({ where: { code: 'software' } });
    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'itadmin@newvision.local' },
    });
    const now = Date.now();

    await prisma.supportTicket.create({
      data: {
        ticketNumber: 'TCK-MW0001',
        subject: 'Overdue assigned to admin',
        description: 'Still broken',
        categoryId: cat.id,
        status: 'in_progress',
        priority: 'high',
        raisedById: ids.employeeA,
        assignedToId: adminUser.id,
        dueDate: new Date(now - 24 * 60 * 60 * 1000),
      },
    });
    await prisma.supportTicket.create({
      data: {
        ticketNumber: 'TCK-MW0002',
        subject: 'Nobody owns this',
        description: 'Queue filler',
        categoryId: cat.id,
        status: 'open',
        priority: 'medium',
        raisedById: ids.employeeA,
        assignedToId: null,
      },
    });
    await prisma.supportTicket.create({
      data: {
        ticketNumber: 'TCK-MW0003',
        subject: 'Need a screenshot',
        description: 'Waiting',
        categoryId: cat.id,
        status: 'waiting_on_employee',
        priority: 'medium',
        raisedById: ids.employeeA,
        assignedToId: adminUser.id,
        waitingSince: new Date(now - 4 * 24 * 60 * 60 * 1000),
      },
    });

    const repairAsset = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-MW01',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        brand: 'Dell',
        model: 'Stale repair box',
        status: 'under_repair',
      },
    });
    await prisma.assetMaintenance.create({
      data: {
        assetId: repairAsset.id,
        issue: 'Keyboard died weeks ago',
        status: 'reported',
        reportedAt: new Date(now - 20 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.employeeChecklist.create({
      data: {
        employeeId: ids.employeeA,
        kind: 'onboard',
        status: 'in_progress',
        items: { create: [{ label: 'Issue laptop', done: false, sortOrder: 0 }] },
      },
    });

    await prisma.employee.update({
      where: { id: ids.employeeB },
      data: {
        employmentType: 'contract',
        contractEndDate: new Date(now + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-MW02',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        brand: 'HP',
        model: 'Warranty soon',
        warrantyEnd: new Date(now + 5 * 24 * 60 * 60 * 1000),
        status: 'available',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  function rank(row: { detail: string }): number {
    if (row.detail.startsWith('Overdue')) return 0;
    if (row.detail.startsWith('Unassigned')) return 1;
    if (row.detail.startsWith('Waiting on employee')) return 2;
    if (row.detail.startsWith('Stale repair')) return 3;
    if (row.detail.startsWith('Incomplete')) return 4;
    if (row.detail.startsWith('Contract')) return 5;
    if (row.detail.startsWith('Warranty')) return 6;
    return 99;
  }

  it('returns myWork in priority order with Assign to me on unassigned tickets', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/attention')
      .set(auth(admin))
      .expect(200);

    const myWork = res.body.myWork as { label: string; detail: string; assignTicketId?: number | null }[];
    expect(Array.isArray(myWork)).toBe(true);

    const ranks = myWork.map(rank);
    expect(ranks.includes(99)).toBe(false);
    for (let i = 1; i < ranks.length; i += 1) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
    }
    for (const needed of [0, 1, 2, 3, 4, 5, 6]) {
      expect(ranks).toContain(needed);
    }

    expect(myWork.find((r) => r.label === 'TCK-MW0001')?.detail).toMatch(/^Overdue/);
    const unassigned = myWork.find((r) => r.label === 'TCK-MW0002');
    expect(unassigned?.detail).toMatch(/^Unassigned/);
    expect(unassigned?.assignTicketId).toEqual(expect.any(Number));
    expect(myWork.find((r) => r.label === 'TCK-MW0003')?.detail).toMatch(/^Waiting on employee/);
  });

  it('gives IT Support the same ordered list (their overdue tickets, then shared queues)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/attention')
      .set(auth(support))
      .expect(200);
    const myWork = res.body.myWork as { label: string; detail: string }[];
    expect(myWork.find((r) => r.label === 'TCK-MW0001')).toBeUndefined();
    expect(myWork.find((r) => r.label === 'TCK-MW0002')?.detail).toMatch(/^Unassigned/);
    const ranks = myWork.map(rank);
    for (let i = 1; i < ranks.length; i += 1) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
    }
  });

  it('refuses employees', async () => {
    await request(app.getHttpServer())
      .get('/api/dashboard/attention')
      .set(auth(employee))
      .expect(403);
  });
});
