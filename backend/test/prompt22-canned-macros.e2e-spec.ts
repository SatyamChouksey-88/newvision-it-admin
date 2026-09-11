import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 22 #8 — canned macros set status with the reply (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let employee: string;
  let softwareId: number;

  beforeAll(async () => {
    app = await createTestApp();
    await seedCore(app.get(PrismaService));
    admin = await login(app, 'itadmin@newvision.local');
    employee = await login(app, 'employee@newvision.local');
    const cats = await request(app.getHttpServer())
      .get('/api/ticket-categories')
      .set(auth(employee))
      .expect(200);
    softwareId = cats.body.find((c: { code: string }) => c.code === 'software').id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('waits on the employee when a canned wait-macro is sent as a public reply', async () => {
    const canned = await request(app.getHttpServer())
      .post('/api/canned-responses')
      .set(auth(admin))
      .send({
        title: 'Need a screenshot',
        body: 'Please attach a screenshot and reply on this ticket.',
        statusOnSend: 'waiting_on_employee',
      })
      .expect(201);
    expect(canned.body.statusOnSend).toBe('waiting_on_employee');

    const ticket = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Excel is blank',
        description: 'The grid is empty.',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/comments`)
      .set(auth(admin))
      .send({
        body: canned.body.body,
        cannedResponseId: canned.body.id,
      })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/support-tickets/${ticket.body.id}`)
      .set(auth(admin))
      .expect(200);
    expect(detail.body.status).toBe('waiting_on_employee');
  });

  it('resolves the ticket when a resolve-macro is sent, and ignores the status on internal notes', async () => {
    const canned = await request(app.getHttpServer())
      .post('/api/canned-responses')
      .set(auth(admin))
      .send({
        title: 'Already fixed',
        body: 'This should work now. Closing the ticket.',
        statusOnSend: 'resolved',
      })
      .expect(201);

    const ticket = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'VPN blip',
        description: 'It dropped once.',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/comments`)
      .set(auth(admin))
      .send({
        body: 'Internal: do not resolve yet',
        isInternal: true,
        cannedResponseId: canned.body.id,
      })
      .expect(201);
    let detail = await request(app.getHttpServer())
      .get(`/api/support-tickets/${ticket.body.id}`)
      .set(auth(admin))
      .expect(200);
    expect(detail.body.status).toBe('open');

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/comments`)
      .set(auth(admin))
      .send({
        body: canned.body.body,
        cannedResponseId: canned.body.id,
      })
      .expect(201);
    detail = await request(app.getHttpServer())
      .get(`/api/support-tickets/${ticket.body.id}`)
      .set(auth(admin))
      .expect(200);
    expect(detail.body.status).toBe('resolved');
  });
});
