import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, DEMO_PASSWORD, login, seedCore } from './helpers';

describe('Prompt 32 — security & data boundaries', () => {
  let app: INestApplication;
  let admin: string;
  let manager: string;
  let employee: string;
  let support: string;
  let ids: Awaited<ReturnType<typeof seedCore>>;

  beforeAll(async () => {
    app = await createTestApp();
    ids = await seedCore(app.get(PrismaService), app);
    admin = await login(app, 'itadmin@newvision.local');
    manager = await login(app, 'manager@newvision.local');
    employee = await login(app, 'employee@newvision.local');
    support = await login(app, 'support@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets security headers on API responses', async () => {
    await request(app.getHttpServer()).get('/api/health');
    // health is registered in main.ts, not the test app — hit a real route instead.
    const me = await request(app.getHttpServer()).get('/api/auth/me').set(auth(admin)).expect(200);
    expect(me.headers['x-content-type-options']).toBe('nosniff');
    expect(String(me.headers['content-security-policy'] ?? '')).toMatch(/default-src/);
  });

  it('sets an httpOnly refresh cookie on login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'itadmin@newvision.local', password: DEMO_PASSWORD, remember: true })
      .expect(200);
    expect(res.body.access_token).toBeTruthy();
    expect(res.body.refresh_token).toBeTruthy();
    const setCookie = res.headers['set-cookie'];
    const cookie = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie ?? '');
    expect(cookie).toMatch(/nv_refresh=/);
    expect(cookie.toLowerCase()).toMatch(/httponly/);
  });

  it('rejects employee access to estate setup, locations, and vendors', async () => {
    await request(app.getHttpServer()).get('/api/dashboard/setup').set(auth(employee)).expect(403);
    await request(app.getHttpServer()).get('/api/locations').set(auth(employee)).expect(403);
    await request(app.getHttpServer()).get('/api/vendors').set(auth(employee)).expect(403);
    await request(app.getHttpServer()).get('/api/departments').set(auth(employee)).expect(403);
    await request(app.getHttpServer()).get('/api/asset-categories').set(auth(employee)).expect(200);
    await request(app.getHttpServer()).get('/api/issue-kits').set(auth(employee)).expect(403);
  });

  it('rejects manager access to vendors and unmasked bank details', async () => {
    await request(app.getHttpServer()).get('/api/vendors').set(auth(manager)).expect(403);
    const created = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({
        legalName: 'Prompt32 Bank Leak LLC',
        accountHolderName: 'Prompt32 Bank Leak LLC',
        bankAccountNumber: '123456789012',
        gstUnregistered: true,
      })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/vendors/${created.body.id}`)
      .set(auth(manager))
      .expect(403);
    const asAdmin = await request(app.getHttpServer())
      .get(`/api/vendors/${created.body.id}`)
      .set(auth(admin))
      .expect(200);
    expect(asAdmin.body.bankAccountNumber).toBe('123456789012');
  });

  it('lets IT Admin read setup; IT Support cannot see estate setup or vendors', async () => {
    await request(app.getHttpServer()).get('/api/dashboard/setup').set(auth(admin)).expect(200);
    await request(app.getHttpServer()).get('/api/dashboard/setup').set(auth(support)).expect(403);
    await request(app.getHttpServer()).get('/api/locations').set(auth(support)).expect(200);
    await request(app.getHttpServer()).get('/api/locations').set(auth(manager)).expect(200);
    await request(app.getHttpServer()).get('/api/vendors').set(auth(support)).expect(403);
  });

  it('does not return locations in employee search', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/search')
      .query({ q: 'Pune' })
      .set(auth(employee))
      .expect(200);
    expect(res.body.locations).toEqual([]);
  });

  it('strips purchase cost from support and employee asset payloads', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        model: 'CostHide',
        purchaseCost: 99999,
        invoiceNo: 'INV-SECRET',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/assets/${created.body.id}/assign`)
      .set(auth(admin))
      .send({ employeeId: ids.employeeA })
      .expect(201);

    const asSupport = await request(app.getHttpServer())
      .get(`/api/assets/${created.body.id}`)
      .set(auth(support))
      .expect(200);
    expect(asSupport.body.purchaseCost).toBeNull();
    expect(asSupport.body.invoiceNo).toBeNull();

    const asEmployee = await request(app.getHttpServer())
      .get(`/api/assets/${created.body.id}`)
      .set(auth(employee))
      .expect(200);
    expect(asEmployee.body.purchaseCost).toBeNull();
    expect(asEmployee.body.invoiceNo).toBeNull();

    const asAdmin = await request(app.getHttpServer())
      .get(`/api/assets/${created.body.id}`)
      .set(auth(admin))
      .expect(200);
    expect(Number(asAdmin.body.purchaseCost)).toBe(99999);
  });

  it('rejects ticket .html uploads the same way chat does', async () => {
    const cat = await app.get(PrismaService).ticketCategory.findFirstOrThrow({
      where: { code: 'software' },
    });
    const ticket = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(admin))
      .send({
        subject: 'Upload hygiene',
        description: 'Need a screenshot later',
        categoryId: cat.id,
        raisedByEmployeeId: ids.employeeA,
        autoAssign: false,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${ticket.body.id}/attachments`)
      .set(auth(admin))
      .attach('file', Buffer.from('<script>alert(1)</script>'), {
        filename: 'page.html',
        contentType: 'application/octet-stream',
      })
      .expect(400);
  });

  it('rejects the email-in webhook without a matching secret', async () => {
    await request(app.getHttpServer())
      .post('/api/email-in/webhook')
      .send({ raw: 'From: a@b.c\nSubject: x\n\nhi' })
      .expect(403);
  });

  it('revokes refresh tokens after a password change', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'support@newvision.local', password: DEMO_PASSWORD })
      .expect(200);
    const oldRefresh = loginRes.body.refresh_token as string;
    const oldAccess = loginRes.body.access_token as string;

    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set(auth(oldAccess))
      .send({ currentPassword: DEMO_PASSWORD, newPassword: 'SupportChanged12!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refresh_token: oldRefresh })
      .expect(401);

    const next = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'support@newvision.local', password: 'SupportChanged12!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set(auth(next.body.access_token))
      .send({ currentPassword: 'SupportChanged12!', newPassword: DEMO_PASSWORD })
      .expect(200);
    support = await login(app, 'support@newvision.local');
  });

  it('keeps two concurrent refresh tokens alive (desktop + phone)', async () => {
    const desktop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'itadmin@newvision.local', password: DEMO_PASSWORD })
      .expect(200);
    const phone = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'itadmin@newvision.local', password: DEMO_PASSWORD })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refresh_token: desktop.body.refresh_token })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refresh_token: phone.body.refresh_token })
      .expect(200);
  });

  it('does not leak warranty broadcasts to an Employee, and mark-all-read is per-user', async () => {
    const prisma = app.get(PrismaService);
    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'itadmin@newvision.local' },
    });
    const employeeUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'employee@newvision.local' },
    });
    await prisma.notification.createMany({
      data: [
        {
          userId: adminUser.id,
          type: 'warranty_expiry',
          title: 'Warranty expiring AST-HYD-LAP-0126',
          message: 'HP G5 at HYD',
        },
        {
          userId: employeeUser.id,
          type: 'asset_assigned',
          title: 'Your laptop',
          message: 'Assigned AST-PUN-LAP-0001',
        },
      ],
    });

    const asEmployee = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(auth(employee))
      .expect(200);
    const titles = (asEmployee.body.data as { title: string }[]).map((n) => n.title);
    expect(titles.some((t) => t.includes('AST-HYD-LAP-0126'))).toBe(false);

    await request(app.getHttpServer())
      .patch('/api/notifications/read-all')
      .set(auth(employee))
      .expect(200);
    const adminUnread = await prisma.notification.count({
      where: { userId: adminUser.id, isRead: false, title: { contains: 'AST-HYD-LAP-0126' } },
    });
    expect(adminUnread).toBe(1);
  });

  it('writes login and failed-login rows to the auth audit trail', async () => {
    // A wrong password for a REAL user — Phase 1 hardening resolves that user's own tenant for
    // this write (see auth.service.ts login()), so it lands correctly scoped rather than being
    // silently unscoped.
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'itadmin@newvision.local', password: 'wrong-password-12' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'itadmin@newvision.local', password: DEMO_PASSWORD })
      .expect(200);
    const prisma = app.get(PrismaService);
    const failures = await prisma.auditLog.count({
      where: { entityType: 'Auth', action: 'auth_failure' },
    });
    const logins = await prisma.auditLog.count({
      where: { entityType: 'Auth', action: 'login' },
    });
    expect(failures).toBeGreaterThanOrEqual(1);
    expect(logins).toBeGreaterThanOrEqual(1);
  });

  it('Phase 1: a failed login for an email that matches no user anywhere still responds correctly, with no tenant to attribute the audit event to', async () => {
    // There's no tenant to scope this write to, so the tenant-isolation extension now refuses
    // it (Phase 1 hardening) instead of silently landing it in tenant 1 — recordAuth() swallows
    // that by design. The important thing is the login flow itself still behaves correctly.
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody-anywhere@newvision.local', password: 'wrong-password-12' })
      .expect(401);
  });

  it('challenges Super Admin with TOTP once enrolled', async () => {
    const { encryptString } = await import('../src/common/crypto-secret');
    const { generateTotpSecret, totpCode } = await import('../src/auth/totp');
    const prisma = app.get(PrismaService);
    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { email: 'superadmin@newvision.local' },
      data: { totpEnabled: true, totpSecretEnc: encryptString(secret) },
    });

    const challenge = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'superadmin@newvision.local', password: DEMO_PASSWORD })
      .expect(200);
    expect(challenge.body.mfaRequired).toBe(true);
    expect(challenge.body.access_token).toBeUndefined();

    const verified = await request(app.getHttpServer())
      .post('/api/auth/mfa/verify')
      .send({ mfa_token: challenge.body.mfa_token, code: totpCode(secret) })
      .expect(200);
    expect(verified.body.access_token).toBeTruthy();

    await prisma.user.update({
      where: { email: 'superadmin@newvision.local' },
      data: { totpEnabled: false, totpSecretEnc: null },
    });
  });

  it('Phase 1: rate-limits repeated wrong codes on /auth/mfa/verify', async () => {
    const prev = process.env.FORCE_LOGIN_RATE_LIMIT;
    process.env.FORCE_LOGIN_RATE_LIMIT = 'true';
    try {
      const { encryptString } = await import('../src/common/crypto-secret');
      const { generateTotpSecret, totpCode } = await import('../src/auth/totp');
      const prisma = app.get(PrismaService);
      const secret = generateTotpSecret();
      await prisma.user.update({
        where: { email: 'superadmin@newvision.local' },
        data: { totpEnabled: true, totpSecretEnc: encryptString(secret) },
      });

      const challenge = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'superadmin@newvision.local', password: DEMO_PASSWORD })
        .expect(200);
      const mfaToken = challenge.body.mfa_token;

      for (let i = 0; i < 8; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/mfa/verify')
          .send({ mfa_token: mfaToken, code: '000000' })
          .expect(401);
      }
      // Locked out now — even the correct code is refused until the window clears.
      await request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .send({ mfa_token: mfaToken, code: totpCode(secret) })
        .expect(429);

      await prisma.user.update({
        where: { email: 'superadmin@newvision.local' },
        data: { totpEnabled: false, totpSecretEnc: null },
      });
    } finally {
      if (prev === undefined) delete process.env.FORCE_LOGIN_RATE_LIMIT;
      else process.env.FORCE_LOGIN_RATE_LIMIT = prev;
    }
  });

  it('lets IT Support read vendor names but not the vendor ledger', async () => {
    const opts = await request(app.getHttpServer())
      .get('/api/vendors/options')
      .set(auth(support))
      .expect(200);
    expect(Array.isArray(opts.body)).toBe(true);
    expect(JSON.stringify(opts.body)).not.toMatch(/bankAccountNumber/);
    await request(app.getHttpServer()).get('/api/vendors/options').set(auth(employee)).expect(403);
    await request(app.getHttpServer()).get('/api/vendors').set(auth(support)).expect(403);
  });

  it('lets Super Admin raise a ticket after the employee link is missing', async () => {
    const prisma = app.get(PrismaService);
    await prisma.user.update({
      where: { email: 'superadmin@newvision.local' },
      data: { employeeId: null },
    });
    const cat = await prisma.ticketCategory.findFirstOrThrow({ where: { code: 'general' } });
    const token = await login(app, 'superadmin@newvision.local');
    const res = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(token))
      .send({
        subject: 'SA needs a license',
        description: 'Adobe for finance close',
        categoryId: cat.id,
        autoAssign: false,
      })
      .expect(201);
    expect(String(res.body.ticketNumber)).toMatch(/^TCK-/);
    const linked = await prisma.user.findUniqueOrThrow({
      where: { email: 'superadmin@newvision.local' },
    });
    expect(linked.employeeId).toBeTruthy();
  });

  it('lets IT Support stamp an audit by asset code', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        model: 'AuditByCode',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/assets/audit-by-code')
      .set(auth(support))
      .send({ code: created.body.assetCode, notes: 'Seen on desk' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/assets/audit-by-code')
      .set(auth(employee))
      .send({ code: created.body.assetCode })
      .expect(403);
  });

  it('scopes the asset list to a manager’s team', async () => {
    const team = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        model: 'TeamLap',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/assets/${team.body.id}/assign`)
      .set(auth(admin))
      .send({ employeeId: ids.employeeA })
      .expect(201);
    const other = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({
        categoryId: ids.categoryLap,
        locationId: ids.locationHyd,
        model: 'OtherLap',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/assets/${other.body.id}/assign`)
      .set(auth(admin))
      .send({ employeeId: ids.employeeB })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/assets')
      .query({ _start: 0, _end: 100 })
      .set(auth(manager))
      .expect(200);
    const models = (res.body.data as { model: string }[]).map((a) => a.model);
    expect(models).toContain('TeamLap');
    expect(models).not.toContain('OtherLap');
  });

  it('health check talks to Postgres', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe('up');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
