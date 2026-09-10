import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

/**
 * Regression coverage for the functionality audit: inactive-employee guards, reinstate,
 * employee status filter, audit-log search/filters, ticket search, notifications read-all,
 * and server-side low-stock filtering.
 */
describe('Functionality audit fixes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    adminToken = await login(app, 'itadmin@newvision.local');
    employeeToken = await login(app, 'employee@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  const createAsset = async (model: string) => {
    const res = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, model })
      .expect(201);
    return res.body as { id: number; assetCode: string };
  };

  describe('asset code allocation', () => {
    it('does not reuse a code after the asset with the highest sequence moves location', async () => {
      // Create in Pune, transfer to Hyderabad; the code keeps its AST-PUN-LAP- prefix.
      const a = await createAsset('CodeMoveA');
      await request(server())
        .post(`/api/assets/${a.id}/transfer`)
        .set(auth(adminToken))
        .send({ toLocationId: ids.locationHyd, reason: 'relocation' })
        .expect(201);

      // The next Pune laptop must get a fresh sequence even though `a` no longer sits in Pune.
      const b = await createAsset('CodeMoveB');
      expect(b.assetCode).not.toBe(a.assetCode);
      expect(b.assetCode.startsWith('AST-PUN-LAP-')).toBe(true);
      expect(Number(b.assetCode.split('-').pop())).toBeGreaterThan(
        Number(a.assetCode.split('-').pop()),
      );
    });

    it('returns 409 for an explicit duplicate code', async () => {
      const a = await createAsset('DupCode');
      await request(server())
        .post('/api/assets')
        .set(auth(adminToken))
        .send({
          categoryId: ids.categoryLap,
          locationId: ids.locationPune,
          assetCode: a.assetCode,
          model: 'DupCode2',
        })
        .expect(409);
    });
  });

  describe('inactive employees', () => {
    let inactiveId: number;

    beforeAll(async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP-INACT',
          firstName: 'Ira',
          lastName: 'Inactive',
          email: 'ira.inactive@newvision.local',
          locationId: ids.locationPune,
          isActive: false,
        },
      });
      inactiveId = emp.id;
    });

    it('rejects assigning an asset to an inactive employee', async () => {
      const asset = await createAsset('GuardAssign');
      const res = await request(server())
        .post(`/api/assets/${asset.id}/assign`)
        .set(auth(adminToken))
        .send({ employeeId: inactiveId })
        .expect(400);
      expect(String(res.body.message)).toMatch(/inactive/i);
    });

    it('rejects transferring an asset to an inactive employee', async () => {
      const asset = await createAsset('GuardTransfer');
      await request(server())
        .post(`/api/assets/${asset.id}/assign`)
        .set(auth(adminToken))
        .send({ employeeId: ids.employeeA })
        .expect(201);
      await request(server())
        .post(`/api/assets/${asset.id}/transfer`)
        .set(auth(adminToken))
        .send({ toEmployeeId: inactiveId })
        .expect(400);
    });

    it('rejects accessory checkout and consumable issue to an inactive employee', async () => {
      const accessory = await prisma.accessory.create({
        data: { name: 'Guard Keyboard', category: 'Peripherals', quantityTotal: 3 },
      });
      await request(server())
        .post(`/api/accessories/${accessory.id}/checkout`)
        .set(auth(adminToken))
        .send({ employeeId: inactiveId, quantity: 1 })
        .expect(400);

      const consumable = await prisma.consumable.create({
        data: { name: 'Guard Cable', category: 'Cables', quantityTotal: 10, quantityAvailable: 10 },
      });
      await request(server())
        .post(`/api/consumables/${consumable.id}/issue`)
        .set(auth(adminToken))
        .send({ employeeId: inactiveId, quantity: 1 })
        .expect(400);
    });

    it('filters the employee list by isActive and defaults to everyone', async () => {
      const active = await request(server())
        .get('/api/employees?isActive=true&_start=0&_end=50')
        .set(auth(adminToken))
        .expect(200);
      expect(active.body.data.every((e: { isActive: boolean }) => e.isActive)).toBe(true);
      expect(active.body.data.some((e: { id: number }) => e.id === inactiveId)).toBe(false);

      const inactive = await request(server())
        .get('/api/employees?isActive=false&_start=0&_end=50')
        .set(auth(adminToken))
        .expect(200);
      expect(inactive.body.data.some((e: { id: number }) => e.id === inactiveId)).toBe(true);
      expect(inactive.body.data.every((e: { isActive: boolean }) => !e.isActive)).toBe(true);

      const all = await request(server())
        .get('/api/employees?_start=0&_end=50')
        .set(auth(adminToken))
        .expect(200);
      expect(all.body.total).toBeGreaterThanOrEqual(active.body.total + inactive.body.total);
    });

    it('reinstates an offboarded employee and refuses to reinstate an active one', async () => {
      const reinstated = await request(server())
        .post(`/api/employees/${inactiveId}/reinstate`)
        .set(auth(adminToken))
        .expect(201);
      expect(reinstated.body.isActive).toBe(true);

      await request(server())
        .post(`/api/employees/${inactiveId}/reinstate`)
        .set(auth(adminToken))
        .expect(400);

      const audit = await prisma.auditLog.findFirst({
        where: { entityType: 'Employee', entityId: String(inactiveId), action: 'update' },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit?.summary ?? '').toMatch(/reinstat/i);
    });

    it('is forbidden for non-admin roles', async () => {
      await request(server())
        .post(`/api/employees/${ids.employeeA}/reinstate`)
        .set(auth(employeeToken))
        .expect(403);
    });
  });

  describe('audit log', () => {
    it('filters by one or many actions and searches summaries', async () => {
      const created = await request(server())
        .get('/api/audit-logs?action=create&_start=0&_end=50')
        .set(auth(adminToken))
        .expect(200);
      expect(created.body.data.length).toBeGreaterThan(0);
      expect(created.body.data.every((r: { action: string }) => r.action === 'create')).toBe(true);

      const multi = await request(server())
        .get('/api/audit-logs?action=create,assign&_start=0&_end=50')
        .set(auth(adminToken))
        .expect(200);
      expect(
        multi.body.data.every((r: { action: string }) => ['create', 'assign'].includes(r.action)),
      ).toBe(true);
      expect(multi.body.total).toBeGreaterThanOrEqual(created.body.total);

      // "Reinstated EMP-INACT" was written by the reinstate test above.
      const searched = await request(server())
        .get('/api/audit-logs?q=reinstated&_start=0&_end=50')
        .set(auth(adminToken))
        .expect(200);
      expect(searched.body.total).toBeGreaterThan(0);
      expect(searched.body.data.every((r: { summary: string }) => /reinstated/i.test(r.summary))).toBe(
        true,
      );
    });

    it('ignores unknown actions instead of erroring', async () => {
      const res = await request(server())
        .get('/api/audit-logs?action=not_a_real_action&_start=0&_end=10')
        .set(auth(adminToken))
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('sorts ascending when asked', async () => {
      const res = await request(server())
        .get('/api/audit-logs?_sort=createdAt&_order=asc&_start=0&_end=5')
        .set(auth(adminToken))
        .expect(200);
      const times = res.body.data.map((r: { createdAt: string }) => new Date(r.createdAt).getTime());
      for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    });
  });

  describe('global search', () => {
    it('returns maintenance tickets for IT roles and scopes assets for employees', async () => {
      const asset = await createAsset('SearchTicketAsset');
      const ticket = await request(server())
        .post('/api/maintenance')
        .set(auth(adminToken))
        .send({ assetId: asset.id, issue: 'Keyboard backlight flickers' })
        .expect(201);

      const byIssue = await request(server())
        .get('/api/search?q=backlight')
        .set(auth(adminToken))
        .expect(200);
      expect(byIssue.body.tickets.some((t: { id: number }) => t.id === ticket.body.id)).toBe(true);

      const byId = await request(server())
        .get(`/api/search?q=%23${ticket.body.id}`)
        .set(auth(adminToken))
        .expect(200);
      expect(byId.body.tickets.some((t: { id: number }) => t.id === ticket.body.id)).toBe(true);

      // An employee cannot see unassigned assets or tickets.
      const asEmployee = await request(server())
        .get('/api/search?q=SearchTicketAsset')
        .set(auth(employeeToken))
        .expect(200);
      expect(asEmployee.body.assets).toHaveLength(0);
      expect(asEmployee.body.tickets).toHaveLength(0);
    });

    it('returns empty buckets for an empty query', async () => {
      const res = await request(server()).get('/api/search?q=').set(auth(adminToken)).expect(200);
      expect(res.body).toMatchObject({ assets: [], employees: [], locations: [], tickets: [] });
    });
  });

  describe('notifications', () => {
    it('marks all of the caller’s notifications read', async () => {
      const me = await prisma.user.findUniqueOrThrow({ where: { email: 'itadmin@newvision.local' } });
      const other = await prisma.user.findUniqueOrThrow({
        where: { email: 'superadmin@newvision.local' },
      });
      await prisma.notification.createMany({
        data: [
          { userId: me.id, type: 'warranty_expiry', title: 'A', message: 'a' },
          { userId: me.id, type: 'warranty_expiry', title: 'B', message: 'b' },
          { userId: other.id, type: 'warranty_expiry', title: 'C', message: 'c' },
        ],
      });

      const res = await request(server())
        .patch('/api/notifications/read-all')
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.updated).toBeGreaterThanOrEqual(2);

      const mineUnread = await prisma.notification.count({ where: { userId: me.id, isRead: false } });
      expect(mineUnread).toBe(0);
      const othersUnread = await prisma.notification.count({
        where: { userId: other.id, isRead: false },
      });
      expect(othersUnread).toBe(1);
    });
  });

  describe('consumables low-stock filter', () => {
    it('applies lowStock at the query level so totals and pages agree', async () => {
      await prisma.consumable.createMany({
        data: [
          { name: 'Low Toner', category: 'Toner', quantityTotal: 10, quantityAvailable: 1, lowStockThreshold: 5 },
          { name: 'Full Toner', category: 'Toner', quantityTotal: 10, quantityAvailable: 10, lowStockThreshold: 5 },
        ],
      });
      const res = await request(server())
        .get('/api/consumables?lowStock=true&_start=0&_end=1')
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(
        res.body.data.every(
          (c: { quantityAvailable: number; lowStockThreshold: number }) =>
            c.quantityAvailable <= c.lowStockThreshold,
        ),
      ).toBe(true);
      expect(res.body.data.some((c: { name: string }) => c.name === 'Full Toner')).toBe(false);
    });
  });
});
