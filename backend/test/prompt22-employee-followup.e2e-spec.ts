import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Prompt 22 #7 — contracts ending and incomplete checklists (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let admin: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    admin = await login(app, 'itadmin@newvision.local');

    await prisma.employee.update({
      where: { id: ids.employeeB },
      data: {
        employmentType: 'contract',
        contractEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the contractor under contractEndingInDays=14', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/employees?contractEndingInDays=14&isActive=true')
      .set(auth(admin))
      .expect(200);
    const rows = res.body.data as { id: number; employmentType: string }[];
    expect(rows.some((e) => e.id === ids.employeeB)).toBe(true);
    expect(rows.every((e) => e.employmentType === 'contract')).toBe(true);
    expect(rows.some((e) => e.id === ids.employeeA)).toBe(false);
  });

  it('lists incomplete checklists and exposes incompleteChecklistKind', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/employees?incompleteChecklist=true')
      .set(auth(admin))
      .expect(200);
    const rows = res.body.data as { id: number; incompleteChecklistKind?: string | null }[];
    const row = rows.find((e) => e.id === ids.employeeA);
    expect(row).toBeTruthy();
    expect(row?.incompleteChecklistKind).toBe('onboard');
  });

  it('includes the contractor on the dashboard My work list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/attention')
      .set(auth(admin))
      .expect(200);
    const myWork = res.body.myWork as { type: string; id: number; detail: string }[];
    expect(myWork.some((r) => r.type === 'contract' && r.id === ids.employeeB)).toBe(true);
    expect(myWork.some((r) => r.type === 'checklist' && r.detail.includes('onboard'))).toBe(true);
  });
});
