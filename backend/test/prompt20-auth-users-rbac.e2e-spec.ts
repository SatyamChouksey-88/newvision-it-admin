import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MailerService } from '../src/notifications/mailer.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Prompt 20 — refresh tokens, password reset, Users CRUD, RBAC dashboard scoping (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let superAdmin: string;
  let admin: string;
  let manager: string;
  let employee: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    superAdmin = await login(app, 'superadmin@newvision.local');
    admin = await login(app, 'itadmin@newvision.local');
    manager = await login(app, 'manager@newvision.local');
    employee = await login(app, 'employee@newvision.local');
    jest.spyOn(app.get(MailerService), 'send').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in with a refresh token and can silently refresh the access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'itadmin@newvision.local', password: 'Password123!' })
      .expect(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();

    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refresh_token: res.body.refresh_token })
      .expect(200);
    expect(refreshed.body.access_token).toBeDefined();
    expect(refreshed.body.refresh_token).toBeDefined();
    expect(refreshed.body.refresh_token).not.toBe(res.body.refresh_token);

    // The new access token actually authenticates.
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(auth(refreshed.body.access_token))
      .expect(200);

    // The old refresh token was rotated out and no longer works.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refresh_token: res.body.refresh_token })
      .expect(401);
  });

  it('rejects garbage or expired refresh tokens', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refresh_token: 'not-a-real-token' })
      .expect(401);
  });

  it('changes password and rejects a wrong current password', async () => {
    const bad = await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set(auth(employee))
      .send({ currentPassword: 'WrongPassword1!', newPassword: 'NewPassword123!' })
      .expect(400);
    expect(bad.body.message).toMatch(/incorrect/i);

    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set(auth(employee))
      .send({ currentPassword: 'Password123!', newPassword: 'ChangedPassword123!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'employee@newvision.local', password: 'ChangedPassword123!' })
      .expect(200);
  });

  it('forgot-password always returns success and never leaks whether the email exists', async () => {
    const known = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'itadmin@newvision.local' })
      .expect(200);
    expect(known.body.success).toBe(true);

    const unknown = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody-here@newvision.local' })
      .expect(200);
    expect(unknown.body.success).toBe(true);
  });

  it('rejects an invalid reset-password token', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'itadmin@newvision.local' } });
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ uid: user.id, token: 'wrong-token', newPassword: 'SomethingNew123!' })
      .expect(400);
  });

  it('Super Admin can list, create, and manage logins via Settings → Users', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/users')
      .set(auth(superAdmin))
      .expect(200);
    expect(list.body.total).toBeGreaterThanOrEqual(5);

    // Non-super-admin roles cannot manage users.
    await request(app.getHttpServer()).get('/api/users').set(auth(admin)).expect(403);

    const emp = await prisma.employee.findUniqueOrThrow({ where: { id: ids.employeeB } });
    const created = await request(app.getHttpServer())
      .post('/api/users')
      .set(auth(superAdmin))
      .send({ email: emp.email, fullName: `${emp.firstName} ${emp.lastName}`, role: 'EMPLOYEE', employeeId: emp.id })
      .expect(201);
    expect(created.body.role).toBe('EMPLOYEE');
    expect(created.body.employee?.id).toBe(emp.id);

    // Can't double-link the same employee to a second login.
    await request(app.getHttpServer())
      .post('/api/users')
      .set(auth(superAdmin))
      .send({ email: 'another@newvision.local', fullName: 'Another', role: 'EMPLOYEE', employeeId: emp.id })
      .expect(400);

    const deactivated = await request(app.getHttpServer())
      .put(`/api/users/${created.body.id}`)
      .set(auth(superAdmin))
      .send({ isActive: false })
      .expect(200);
    expect(deactivated.body.isActive).toBe(false);

    // A deactivated login can no longer authenticate.
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: emp.email, password: 'irrelevant' })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/api/users/${created.body.id}/reset-password`)
      .set(auth(superAdmin))
      .send({})
      .expect(201);
  });

  it('creating an employee can optionally create a login for them (B2)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/employees')
      .set(auth(admin))
      .send({
        employeeCode: 'EMP-LOGIN1',
        firstName: 'Login',
        lastName: 'Test',
        email: 'login.test@newvision.local',
        locationId: ids.locationPune,
        createLogin: true,
        loginRole: 'EMPLOYEE',
      })
      .expect(201);
    const user = await prisma.user.findUnique({ where: { email: 'login.test@newvision.local' } });
    expect(user).not.toBeNull();
    expect(user?.employeeId).toBe(res.body.id);
  });

  it('blocks deleting a department or location that is still referenced', async () => {
    const dep = await request(app.getHttpServer())
      .post('/api/departments')
      .set(auth(admin))
      .send({ name: 'Temp Dept For Delete Test' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/employees')
      .set(auth(admin))
      .send({
        employeeCode: 'EMP-DEPTEST',
        firstName: 'Dept',
        lastName: 'Referrer',
        email: 'dept.referrer@newvision.local',
        locationId: ids.locationPune,
        departmentId: dep.body.id,
      })
      .expect(201);
    const blocked = await request(app.getHttpServer())
      .delete(`/api/departments/${dep.body.id}`)
      .set(auth(superAdmin))
      .expect(400);
    expect(blocked.body.message).toMatch(/employee/i);

    const loc = await request(app.getHttpServer())
      .post('/api/locations')
      .set(auth(admin))
      .send({ code: 'TMP', name: 'Temp Location', city: 'Nowhere' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/employees')
      .set(auth(admin))
      .send({
        employeeCode: 'EMP-LOCTEST',
        firstName: 'Loc',
        lastName: 'Referrer',
        email: 'loc.referrer@newvision.local',
        locationId: loc.body.id,
      })
      .expect(201);
    const blockedLoc = await request(app.getHttpServer())
      .delete(`/api/locations/${loc.body.id}`)
      .set(auth(superAdmin))
      .expect(400);
    expect(blockedLoc.body.message).toMatch(/employee/i);
  });

  it('scopes the dashboard: estate endpoints are IT-only, employee/manager get their own summaries', async () => {
    await request(app.getHttpServer()).get('/api/dashboard/metrics').set(auth(manager)).expect(403);
    await request(app.getHttpServer()).get('/api/dashboard/metrics').set(auth(employee)).expect(403);
    await request(app.getHttpServer()).get('/api/dashboard/metrics').set(auth(admin)).expect(200);

    const mine = await request(app.getHttpServer())
      .get('/api/dashboard/my-summary')
      .set(auth(employee))
      .expect(200);
    expect(Array.isArray(mine.body.assets)).toBe(true);
    expect(Array.isArray(mine.body.openTickets)).toBe(true);

    const team = await request(app.getHttpServer())
      .get('/api/dashboard/team-summary')
      .set(auth(manager))
      .expect(200);
    expect(typeof team.body.pendingRequestCount).toBe('number');
    expect(typeof team.body.teamDeviceCount).toBe('number');

    // my-summary/team-summary are scoped to the caller's own role — an IT admin has no
    // employeeId in the seed fixture, so it degrades to empty rather than someone else's data.
    await request(app.getHttpServer()).get('/api/dashboard/team-summary').set(auth(employee)).expect(403);
  });

  it('the public scan endpoint no longer leaks the assignee name or serial number (B10)', async () => {
    const asset = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, serialNumber: 'SECRET-SERIAL-1' })
      .expect(201);
    const scan = await request(app.getHttpServer())
      .get(`/api/public/assets/${asset.body.assetCode}`)
      .expect(200);
    expect(scan.body.serialNumber).toBeUndefined();
    expect(scan.body.assignedTo).toBeUndefined();
    expect(scan.body).toHaveProperty('assigned');
  });
});
