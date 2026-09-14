import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ACCOUNT_LOCKOUT_TEMPLATE, RESET_COMPLETED_MACRO } from '../src/tickets/account-playbook';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 35 Item 1 — account lockout / MFA playbook (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let support: string;
  let employee: string;
  let accessId: number;
  let softwareId: number;
  let employeeA: number;
  let employeeB: number;

  beforeAll(async () => {
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    const ids = await seedCore(prisma);
    employeeA = ids.employeeA;
    employeeB = ids.employeeB;
    admin = await login(app, 'itadmin@newvision.local');
    support = await login(app, 'support@newvision.local');
    employee = await login(app, 'employee@newvision.local');
    const cats = await request(app.getHttpServer()).get('/api/ticket-categories').set(auth(employee)).expect(200);
    accessId = cats.body.find((c: { code: string }) => c.code === 'access_account').id;
    softwareId = cats.body.find((c: { code: string }) => c.code === 'software').id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('seeds the lockout template (access_account / high) and the resolve macro', async () => {
    const templates = await request(app.getHttpServer())
      .get('/api/ticket-templates')
      .set(auth(admin))
      .expect(200);
    const lockout = templates.body.find((t: { title: string }) => t.title === ACCOUNT_LOCKOUT_TEMPLATE.title);
    expect(lockout).toBeTruthy();
    expect(lockout.categoryId).toBe(accessId);
    expect(lockout.category.defaultPriority).toBe('high');
    expect(lockout.description).toMatch(/Do not reset/i);
    expect(lockout.description).toMatch(/NewVision/i);
    expect(lockout.description).toMatch(/M365/i);

    const canned = await request(app.getHttpServer())
      .get('/api/canned-responses')
      .set(auth(admin))
      .expect(200);
    const macro = canned.body.find((c: { title: string }) => c.title === RESET_COMPLETED_MACRO.title);
    expect(macro).toBeTruthy();
    expect(macro.statusOnSend).toBe('resolved');
  });

  it('applies the lockout template, gates the reset on identity verify, then resolves via the macro', async () => {
    const ticket = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Locked out of Outlook',
        description: 'Password not working this morning.',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);

    const templates = await request(app.getHttpServer())
      .get('/api/ticket-templates')
      .set(auth(support))
      .expect(200);
    const lockout = templates.body.find((t: { title: string }) => t.title === ACCOUNT_LOCKOUT_TEMPLATE.title);

    const applied = await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/apply-template`)
      .set(auth(support))
      .send({ templateId: lockout.id })
      .expect(201);
    expect(applied.body.categoryId).toBe(accessId);
    expect(applied.body.priority).toBe('high');
    expect(applied.body.subject).toBe(ACCOUNT_LOCKOUT_TEMPLATE.subject);
    expect(applied.body.description).toMatch(/EMP-00001/);
    expect(applied.body.raisedBy.user?.email).toBe('employee@newvision.local');

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/send-reset-link`)
      .set(auth(support))
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/verify-identity`)
      .set(auth(employee))
      .expect(403);

    const verified = await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/verify-identity`)
      .set(auth(support))
      .expect(201);
    expect(verified.body.identityVerifiedAt).toBeTruthy();
    expect(verified.body.verifiedBy?.fullName).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/send-reset-link`)
      .set(auth(support))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/record-idp-reset`)
      .set(auth(support))
      .send({ system: 'm365' })
      .expect(201);

    const canned = await request(app.getHttpServer())
      .get('/api/canned-responses')
      .set(auth(support))
      .expect(200);
    const macro = canned.body.find((c: { title: string }) => c.title === RESET_COMPLETED_MACRO.title);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/comments`)
      .set(auth(support))
      .send({ body: macro.body, cannedResponseId: macro.id })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/support-tickets/${ticket.body.id}`)
      .set(auth(support))
      .expect(200);
    expect(detail.body.status).toBe('resolved');
    expect(detail.body.comments.some((c: { body: string }) => /Microsoft 365/.test(c.body))).toBe(true);
  });

  it('refuses a NewVision reset when the requester has no login', async () => {
    const ticket = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(admin))
      .send({
        subject: 'VPN lockout',
        description: 'Need a VPN password reset.',
        categoryId: accessId,
        raisedByEmployeeId: employeeB,
        autoAssign: false,
      })
      .expect(201);
    expect(ticket.body.raisedById).toBe(employeeB);
    expect(ticket.body.raisedBy.user).toBeFalsy();

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/verify-identity`)
      .set(auth(admin))
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/send-reset-link`)
      .set(auth(admin))
      .expect(400);
    expect(res.body.message).toMatch(/no NewVision login/i);
  });

  it('does not apply a template to a resolved ticket', async () => {
    const ticket = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Already done',
        description: 'Please close.',
        categoryId: accessId,
        autoAssign: false,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${ticket.body.id}/transition`)
      .set(auth(admin))
      .send({ status: 'resolved' })
      .expect(200);
    const templates = await request(app.getHttpServer())
      .get('/api/ticket-templates')
      .set(auth(admin))
      .expect(200);
    const lockout = templates.body.find((t: { title: string }) => t.title === ACCOUNT_LOCKOUT_TEMPLATE.title);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/apply-template`)
      .set(auth(admin))
      .send({ templateId: lockout.id })
      .expect(400);
    expect(employeeA).toBeGreaterThan(0);
  });
});
