import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, DEMO_PASSWORD, login, seedCore } from './helpers';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await seedCore(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in with valid credentials (happy path)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'itadmin@newvision.local', password: DEMO_PASSWORD })
      .expect(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user.role).toBe('IT_ADMIN');
  });

  it('rejects invalid credentials (failure path)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'itadmin@newvision.local', password: 'wrong-password' })
      .expect(401);
  });

  it('rejects malformed login payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
  });

  it('returns the current user and permissions from /auth/me', async () => {
    const token = await login(app, 'itadmin@newvision.local');
    const res = await request(app.getHttpServer()).get('/api/auth/me').set(auth(token)).expect(200);
    expect(res.body.role).toBe('IT_ADMIN');
    expect(res.body.permissions).toEqual(expect.arrayContaining(['asset:create']));
  });

  it('blocks protected routes without a token (401)', async () => {
    await request(app.getHttpServer()).get('/api/assets').expect(401);
  });

  it('restricts the audit log viewer to Super Admin / IT Admin', async () => {
    const employeeToken = await login(app, 'employee@newvision.local');
    await request(app.getHttpServer()).get('/api/audit-logs').set(auth(employeeToken)).expect(403);

    const adminToken = await login(app, 'itadmin@newvision.local');
    await request(app.getHttpServer()).get('/api/audit-logs').set(auth(adminToken)).expect(200);
  });
});
