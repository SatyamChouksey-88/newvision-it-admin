import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MailerService } from '../src/notifications/mailer.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

/**
 * Confirms each helpdesk lifecycle event triggers the right email — subject and template
 * selection — without actually delivering mail (MailerService.send is spied and never hits
 * SMTP in this env, since SMTP_HOST is unset in test config).
 */
describe('Support ticket lifecycle emails (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailer: MailerService;
  let sendSpy: jest.SpiedFunction<MailerService['send']>;
  let admin: string;
  let support: string;
  let employee: string;
  let categoryId: number;
  let supportUserId: number;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    mailer = app.get(MailerService);
    await seedCore(prisma);
    admin = await login(app, 'itadmin@newvision.local');
    support = await login(app, 'support@newvision.local');
    employee = await login(app, 'employee@newvision.local');
    const cats = await request(app.getHttpServer()).get('/api/ticket-categories').set(auth(employee)).expect(200);
    categoryId = cats.body.find((c: { code: string }) => c.code === 'general').id;
    const supportUser = await prisma.user.findUniqueOrThrow({ where: { email: 'support@newvision.local' } });
    supportUserId = supportUser.id;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    sendSpy = jest.spyOn(mailer, 'send').mockResolvedValue(undefined);
  });

  it('emails the requester a confirmation and staff an unassigned alert on create', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Printer offline',
        description: 'The 3rd floor printer is not responding.',
        categoryId,
        autoAssign: false,
      })
      .expect(201);
    const ticketNumber = res.body.ticketNumber as string;

    const calls = sendSpy.mock.calls.map(([msg]) => msg);
    const confirmation = calls.find((m) => m.subject.startsWith("We've got your ticket"));
    expect(confirmation).toBeDefined();
    expect(confirmation?.to).toBe('employee@newvision.local');
    expect(confirmation?.html).toContain(ticketNumber);
    expect(confirmation?.html).toContain('Your ticket has been logged');

    const staffAlert = calls.find((m) => m.subject === `New ticket ${ticketNumber}`);
    expect(staffAlert).toBeDefined();
    expect(staffAlert?.html).toContain('New ticket needs an owner');
  });

  it('emails the assignee when a ticket is assigned', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({ subject: 'VPN drops', description: 'VPN disconnects every 10 minutes.', categoryId, autoAssign: false })
      .expect(201);
    sendSpy.mockClear();

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/assign`)
      .set(auth(admin))
      .send({ userId: supportUserId })
      .expect(201);

    const calls = sendSpy.mock.calls.map(([msg]) => msg);
    const assigned = calls.find((m) => m.subject === `${created.body.ticketNumber} assigned to you`);
    expect(assigned).toBeDefined();
    expect(assigned?.to).toBe('support@newvision.local');
    expect(assigned?.html).toContain('A ticket was assigned to you');
  });

  it('emails the requester when a public comment is added', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({ subject: 'Monitor flicker', description: 'External monitor flickers.', categoryId, autoAssign: false })
      .expect(201);
    sendSpy.mockClear();

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/comments`)
      .set(auth(admin))
      .send({ body: 'Can you try a different cable?' })
      .expect(201);

    const calls = sendSpy.mock.calls.map(([msg]) => msg);
    const commentMail = calls.find((m) => m.subject === `New comment on ${created.body.ticketNumber}`);
    expect(commentMail).toBeDefined();
    expect(commentMail?.to).toBe('employee@newvision.local');
    expect(commentMail?.html).toContain('New comment on your ticket');
    expect(commentMail?.html).toContain('Can you try a different cable?');
  });

  it('emails the requester on status change and prompts for a rating on resolve', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({ subject: 'Keyboard dead keys', description: 'Some keys stopped working.', categoryId, autoAssign: false })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/assign`)
      .set(auth(admin))
      .send({ userId: supportUserId })
      .expect(201);
    sendSpy.mockClear();

    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${created.body.id}/transition`)
      .set(auth(support))
      .send({ status: 'in_progress' })
      .expect(200);

    let calls = sendSpy.mock.calls.map(([msg]) => msg);
    const inProgress = calls.find((m) => m.subject === `${created.body.ticketNumber} is now in progress`);
    expect(inProgress).toBeDefined();
    expect(inProgress?.html).toContain('Ticket status: in progress');

    sendSpy.mockClear();
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${created.body.id}/transition`)
      .set(auth(support))
      .send({ status: 'resolved' })
      .expect(200);

    calls = sendSpy.mock.calls.map(([msg]) => msg);
    const resolved = calls.find((m) => m.subject === `${created.body.ticketNumber} is now resolved`);
    expect(resolved).toBeDefined();
    const rating = calls.find((m) => m.subject === `How did we do on ${created.body.ticketNumber}?`);
    expect(rating).toBeDefined();
    expect(rating?.to).toBe('employee@newvision.local');
    expect(rating?.html).toContain('How did we do?');
  });

  it('sends a daily digest email with the branded template', async () => {
    await request(app.getHttpServer())
      .patch('/api/support-tickets/notify-pref')
      .set(auth(support))
      .send({ pref: 'daily_digest' })
      .expect(200);
    sendSpy.mockClear();

    await request(app.getHttpServer())
      .post('/api/support-tickets/digest/run')
      .set(auth(admin))
      .expect(201);

    const calls = sendSpy.mock.calls.map(([msg]) => msg);
    const digest = calls.find((m) => m.subject === 'NewVision daily ticket digest');
    expect(digest).toBeDefined();
    expect(digest?.html).toContain('Your daily ticket digest');
  });
});
