import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MailerService } from '../src/notifications/mailer.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Email-in pipeline (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailer: MailerService;
  let sendSpy: jest.SpiedFunction<MailerService['send']>;
  let admin: string;
  let employee: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    mailer = app.get(MailerService);
    await seedCore(prisma);
    admin = await login(app, 'itadmin@newvision.local');
    employee = await login(app, 'employee@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('ingests a new email as a ticket and fires the same create notifications', async () => {
    sendSpy = jest.spyOn(mailer, 'send').mockResolvedValue(undefined);
    const raw = `From: Asha Apte <asha.apte@newvision.local>
To: it@newvision.local
Subject: Docking station loose
Message-ID: <e2e-new@mail.test>
Date: Thu, 10 Sep 2026 10:00:00 +0000

The USB-C dock disconnects when I move the laptop.
`;
    const res = await request(app.getHttpServer())
      .post('/api/email-in/ingest')
      .set(auth(admin))
      .send({ raw })
      .expect(201);
    expect(res.body.action).toBe('ticket');
    expect(res.body.ticketNumber).toMatch(/^TCK-\d{6}$/);

    const ticket = await prisma.supportTicket.findUnique({ where: { id: res.body.ticketId } });
    expect(ticket?.channel).toBe('email');
    expect(ticket?.raisedById).toBeDefined();

    const calls = sendSpy.mock.calls.map(([msg]) => msg);
    expect(calls.some((m) => m.subject.includes("We've got your ticket") || m.subject.includes(res.body.ticketNumber))).toBe(
      true,
    );
  });

  it('adds a comment when the subject contains the ticket number', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'VPN drops from email reply test',
        description: 'Original portal ticket',
        categoryId: (await prisma.ticketCategory.findFirstOrThrow({ where: { code: 'general' } })).id,
        autoAssign: false,
      })
      .expect(201);

    const raw = `From: Asha Apte <asha.apte@newvision.local>
To: it@newvision.local
Subject: Re: [${created.body.ticketNumber}] VPN drops from email reply test
Message-ID: <e2e-reply@mail.test>

Still failing after the reboot.
`;
    const res = await request(app.getHttpServer())
      .post('/api/email-in/ingest')
      .set(auth(admin))
      .send({ raw })
      .expect(201);
    expect(res.body.action).toBe('comment');
    expect(res.body.ticketId).toBe(created.body.id);
    const comments = await prisma.ticketComment.findMany({ where: { ticketId: created.body.id } });
    expect(comments.some((c) => c.body.includes('Still failing'))).toBe(true);
  });

  it('waiting_on_employee resumes when the requester comments', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Need screenshot',
        description: 'Please advise',
        categoryId: (await prisma.ticketCategory.findFirstOrThrow({ where: { code: 'general' } })).id,
        autoAssign: false,
      })
      .expect(201);
    const support = await login(app, 'support@newvision.local');
    const supportUser = await prisma.user.findUniqueOrThrow({ where: { email: 'support@newvision.local' } });
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/assign`)
      .set(auth(support))
      .send({ userId: supportUser.id })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${created.body.id}/transition`)
      .set(auth(support))
      .send({ status: 'in_progress' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${created.body.id}/transition`)
      .set(auth(support))
      .send({ status: 'waiting_on_employee' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/comments`)
      .set(auth(employee))
      .send({ body: 'Here is the screenshot.' })
      .expect(201);

    const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(ticket.status).toBe('in_progress');
    expect(ticket.waitingSince).toBeNull();
  });
});
