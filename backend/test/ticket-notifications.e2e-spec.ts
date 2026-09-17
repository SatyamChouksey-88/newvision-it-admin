import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

/** Phase 6 — in-app notification rows for the six ticket lifecycle events. */
describe('Support ticket in-app notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let support: string;
  let employee: string;
  let categoryId: number;
  let supportUserId: number;
  let employeeUserId: number;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedCore(prisma, app);
    admin = await login(app, 'itadmin@newvision.local');
    support = await login(app, 'support@newvision.local');
    employee = await login(app, 'employee@newvision.local');
    const cats = await request(app.getHttpServer()).get('/api/ticket-categories').set(auth(employee)).expect(200);
    categoryId = cats.body.find((c: { code: string }) => c.code === 'general').id;
    supportUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'support@newvision.local' } })).id;
    employeeUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'employee@newvision.local' } })).id;
  });

  afterAll(async () => app.close());

  const countForTicket = (ticketId: number, userId: number) =>
    prisma.notification.count({ where: { supportTicketId: ticketId, userId } });

  it('covers create, assign, status change, reply, resolve, and reopen', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Notification matrix',
        description: 'Phase 6 e2e',
        categoryId,
        autoAssign: false,
      })
      .expect(201);
    const ticketId = created.body.id as number;

    expect(await countForTicket(ticketId, employeeUserId)).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticketId}/assign`)
      .set(auth(admin))
      .send({ userId: supportUserId })
      .expect(201);
    expect(await countForTicket(ticketId, supportUserId)).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${ticketId}/transition`)
      .set(auth(support))
      .send({ status: 'in_progress' })
      .expect(200);
    expect(await countForTicket(ticketId, employeeUserId)).toBeGreaterThanOrEqual(2);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticketId}/comments`)
      .set(auth(support))
      .send({ body: 'We are looking into it.' })
      .expect(201);
    expect(await countForTicket(ticketId, employeeUserId)).toBeGreaterThanOrEqual(3);

    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${ticketId}/transition`)
      .set(auth(support))
      .send({ status: 'resolved' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${ticketId}/transition`)
      .set(auth(support))
      .send({ status: 'reopened' })
      .expect(200);
    expect(await countForTicket(ticketId, employeeUserId)).toBeGreaterThanOrEqual(4);
  });
});
