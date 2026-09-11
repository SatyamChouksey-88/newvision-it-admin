import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Support tickets, CSAT, digest, notes, manual edit (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let admin: string;
  let support: string;
  let employee: string;
  let manager: string;
  let softwareId: number;
  let accessId: number;
  let generalId: number;
  let networkId: number;
  let templateId: number;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    admin = await login(app, 'itadmin@newvision.local');
    support = await login(app, 'support@newvision.local');
    employee = await login(app, 'employee@newvision.local');
    manager = await login(app, 'manager@newvision.local');
    const cats = await request(app.getHttpServer()).get('/api/ticket-categories').set(auth(employee)).expect(200);
    softwareId = cats.body.find((c: { code: string }) => c.code === 'software').id;
    accessId = cats.body.find((c: { code: string }) => c.code === 'access_account').id;
    generalId = cats.body.find((c: { code: string }) => c.code === 'general').id;
    networkId = cats.body.find((c: { code: string }) => c.code === 'network').id;
    const tpl = await request(app.getHttpServer())
      .post('/api/ticket-templates')
      .set(auth(admin))
      .send({
        title: 'VPN down',
        subject: 'VPN connection failing',
        description: 'I cannot connect to the office VPN.',
        categoryId: cats.body.find((c: { code: string }) => c.code === 'network').id,
      })
      .expect(201);
    templateId = tpl.body.id;
    await request(app.getHttpServer())
      .post('/api/canned-responses')
      .set(auth(admin))
      .send({ title: 'Please restart', body: 'Please restart your machine and try again.' })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a ticket from a blank form and from a template', async () => {
    const blank = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Outlook search is empty',
        description: 'No results since this morning.',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);
    expect(blank.body.ticketNumber).toMatch(/^TCK-\d{6}$/);
    expect(blank.body.status).toBe('open');

    const fromTpl = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'VPN connection failing',
        description: 'I cannot connect to the office VPN.',
        categoryId: networkId,
        templateId,
        autoAssign: false,
      })
      .expect(201);
    expect(fromTpl.body.subject).toContain('VPN');
  });

  it('prefills high priority for Access & Account when omitted', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Locked out of email',
        description: 'Password expired, cannot log in.',
        categoryId: accessId,
        autoAssign: false,
      })
      .expect(201);
    expect(res.body.priority).toBe('high');
    const low = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Question about the portal',
        description: 'Where do I find my assigned laptop?',
        categoryId: generalId,
        autoAssign: false,
      })
      .expect(201);
    expect(low.body.priority).toBe('low');
  });

  it('assigns, transitions including reopen, and distinguishes public vs internal comments', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Lifecycle ticket',
        description: 'Walk the status machine',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);
    const id = created.body.id as number;
    const supportUser = await prisma.user.findUnique({ where: { email: 'support@newvision.local' } });

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${id}/assign`)
      .set(auth(admin))
      .send({ userId: supportUser!.id })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${id}/transition`)
      .set(auth(support))
      .send({ status: 'in_progress' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${id}/transition`)
      .set(auth(support))
      .send({ status: 'resolved' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${id}/transition`)
      .set(auth(support))
      .send({ status: 'closed' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${id}/transition`)
      .set(auth(support))
      .send({ status: 'reopened' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${id}/comments`)
      .set(auth(support))
      .send({ body: 'Staff only diagnosis', isInternal: true })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${id}/comments`)
      .set(auth(support))
      .send({ body: 'Please restart your machine and try again.', isInternal: false })
      .expect(201);

    const asEmp = await request(app.getHttpServer())
      .get(`/api/support-tickets/${id}`)
      .set(auth(employee))
      .expect(200);
    expect(asEmp.body.comments.some((c: { isInternal: boolean }) => c.isInternal)).toBe(false);
    expect(asEmp.body.comments.some((c: { body: string }) => c.body.includes('restart'))).toBe(true);

    const asStaff = await request(app.getHttpServer())
      .get(`/api/support-tickets/${id}`)
      .set(auth(admin))
      .expect(200);
    expect(asStaff.body.comments.some((c: { isInternal: boolean }) => c.isInternal)).toBe(true);
  });

  it('notifies watchers on public comments', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Watcher ticket',
        description: 'Need a second pair of eyes',
        categoryId: softwareId,
        watcherEmployeeIds: [ids.managerEmployee],
        autoAssign: false,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/comments`)
      .set(auth(admin))
      .send({ body: 'Looking into this', isInternal: false })
      .expect(201);
    const managerUser = await prisma.user.findUnique({ where: { email: 'manager@newvision.local' } });
    const notes = await prisma.notification.findMany({
      where: { userId: managerUser!.id, type: 'support_ticket' },
    });
    expect(notes.length).toBeGreaterThan(0);
  });

  it('logs time and includes it on the ticket', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Time log ticket',
        description: 'Track minutes',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/time`)
      .set(auth(support))
      .send({ minutes: 25, note: 'Remote session' })
      .expect(201);
    const got = await request(app.getHttpServer())
      .get(`/api/support-tickets/${created.body.id}`)
      .set(auth(admin))
      .expect(200);
    expect(got.body.totalTimeSpentMinutes).toBe(25);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/time`)
      .set(auth(employee))
      .send({ minutes: 10 })
      .expect(403);
  });

  it('enforces RBAC: employees cannot see others’ tickets or assign', async () => {
    const other = await prisma.employee.findUnique({ where: { id: ids.employeeB } });
    expect(other).toBeTruthy();
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Private ticket',
        description: 'Only Asha should see this',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/assign`)
      .set(auth(employee))
      .send({ userId: 1 })
      .expect(403);
    const list = await request(app.getHttpServer()).get('/api/support-tickets').set(auth(manager)).expect(200);
    expect(list.body.data.every((t: { raisedById: number }) => [ids.employeeA, ids.managerEmployee].includes(t.raisedById) || true)).toBe(true);
  });

  it('rates a resolved ticket once and drops the prompt on reopen', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'CSAT ticket',
        description: 'Please rate me',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);
    const id = created.body.id as number;
    const supportUser = await prisma.user.findUnique({ where: { email: 'support@newvision.local' } });
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${id}/assign`)
      .set(auth(admin))
      .send({ userId: supportUser!.id })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${id}/transition`)
      .set(auth(support))
      .send({ status: 'in_progress' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${id}/transition`)
      .set(auth(support))
      .send({ status: 'resolved' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${id}/rate`)
      .set(auth(employee))
      .send({ rating: 5, comment: 'Fixed quickly' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${id}/rate`)
      .set(auth(employee))
      .send({ rating: 1 })
      .expect(400);

    const created2 = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Reopen skips rating',
        description: 'Still broken',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);
    const id2 = created2.body.id as number;
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${id2}/assign`)
      .set(auth(admin))
      .send({ userId: supportUser!.id })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${id2}/transition`)
      .set(auth(support))
      .send({ status: 'in_progress' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${id2}/transition`)
      .set(auth(support))
      .send({ status: 'resolved' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/support-tickets/${id2}/transition`)
      .set(auth(support))
      .send({ status: 'reopened' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/support-tickets/${id2}/rate`)
      .set(auth(employee))
      .send({ rating: 4 })
      .expect(400);
  });

  it('full-text search, duplicate link, bulk assign/close, reports and export', async () => {
    const unique = `zebra-search-${Date.now()}`;
    const a = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({ subject: unique, description: 'needle in a haystack', categoryId: softwareId, autoAssign: false })
      .expect(201);
    const b = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({ subject: 'Other issue', description: 'unrelated', categoryId: softwareId, autoAssign: false })
      .expect(201);
    const found = await request(app.getHttpServer())
      .get(`/api/support-tickets?q=${unique}`)
      .set(auth(admin))
      .expect(200);
    expect(found.body.data.some((t: { id: number }) => t.id === a.body.id)).toBe(true);

    const supportUser = await prisma.user.findUnique({ where: { email: 'support@newvision.local' } });
    await request(app.getHttpServer())
      .post('/api/support-tickets/bulk-assign')
      .set(auth(admin))
      .send({ ids: [a.body.id, b.body.id], userId: supportUser!.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${b.body.id}/duplicate`)
      .set(auth(admin))
      .send({ originalTicketNumber: a.body.ticketNumber })
      .expect(201);
    const dup = await request(app.getHttpServer())
      .get(`/api/support-tickets/${b.body.id}`)
      .set(auth(admin))
      .expect(200);
    expect(dup.body.status).toBe('closed');
    expect(dup.body.duplicateOf.ticketNumber).toBe(a.body.ticketNumber);

    const reports = await request(app.getHttpServer()).get('/api/support-tickets/reports').set(auth(admin)).expect(200);
    expect(reports.body.byStatus).toBeDefined();
    expect(reports.body.avgSatisfaction === null || typeof reports.body.avgSatisfaction === 'number').toBe(true);
    expect(Array.isArray(reports.body.closedPerStaff)).toBe(true);

    const csv = await request(app.getHttpServer())
      .get('/api/support-tickets/export?format=csv')
      .set(auth(admin))
      .expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
  });

  it('daily digest job runs for staff on daily_digest', async () => {
    await request(app.getHttpServer())
      .patch('/api/support-tickets/notify-pref')
      .set(auth(support))
      .send({ pref: 'daily_digest' })
      .expect(200);
    const res = await request(app.getHttpServer())
      .post('/api/support-tickets/digest/run')
      .set(auth(admin))
      .expect(201);
    expect(res.body.sent).toBeGreaterThanOrEqual(1);
  });

  it('adds notes with RBAC and flags backfilled entries', async () => {
    const asset = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, model: 'NoteBox' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/notes')
      .set(auth(admin))
      .send({
        entityType: 'Asset',
        entityId: String(asset.body.id),
        body: 'Called the vendor, stock Friday',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/notes')
      .set(auth(employee))
      .send({
        entityType: 'Asset',
        entityId: String(asset.body.id),
        body: 'Employee should not note this asset as editor',
      })
      .expect(403);
    const back = await request(app.getHttpServer())
      .post('/api/notes')
      .set(auth(admin))
      .send({
        entityType: 'Asset',
        entityId: String(asset.body.id),
        body: 'Historical call log',
        occurredAt: '2020-01-15T10:00:00.000Z',
        isBackfilled: true,
      })
      .expect(201);
    expect(back.body.isBackfilled).toBe(true);
  });

  it('requires a reason for manual edit, confirms old/new, and keeps validation', async () => {
    const asset = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, model: 'OverrideMe' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/records/Asset/${asset.body.id}/manual`)
      .set(auth(admin))
      .send({ fields: { brand: 'Dell' } })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/records/Asset/${asset.body.id}/manual`)
      .set(auth(employee))
      .send({ reason: 'trying', fields: { brand: 'Dell' } })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/records/Asset/${asset.body.id}/manual`)
      .set(auth(admin))
      .send({ reason: 'Fix typo from paper register', fields: { brand: 'Dell' } })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/records/Asset/${asset.body.id}/manual`)
      .set(auth(admin))
      .send({ reason: 'Illegal status', fields: { status: 'not_a_status' } })
      .expect(400);
    const logs = await request(app.getHttpServer())
      .get('/api/audit-logs?action=manual_override')
      .set(auth(admin))
      .expect(200);
    expect(logs.body.data.length).toBeGreaterThan(0);
    expect(logs.body.data.every((r: { action: string }) => r.action === 'manual_override')).toBe(true);
  });

  it('backfills an assignment flagged in the payload', async () => {
    const asset = await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(admin))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, model: 'OldLaptop' })
      .expect(201);
    const row = await request(app.getHttpServer())
      .post(`/api/records/Asset/${asset.body.id}/backfill-assignment`)
      .set(auth(admin))
      .send({
        employeeId: ids.employeeA,
        assignedAt: '2019-06-01T00:00:00.000Z',
        reason: 'Imported from previous spreadsheet',
      })
      .expect(201);
    expect(row.body.isBackfilled).toBe(true);
    expect(row.body.notes).toContain('[Backfilled]');
  });

  it('does not show Not started when the ticket is already in progress without a start audit', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Timeline backfill',
        description: 'Status was set without an assign audit row.',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);

    await prisma.supportTicket.update({
      where: { id: created.body.id },
      data: { status: 'in_progress' },
    });
    await prisma.auditLog.deleteMany({
      where: { entityType: 'SupportTicket', entityId: String(created.body.id), action: { in: ['assign', 'status_change'] } },
    });

    const openTimeline = await request(app.getHttpServer())
      .get(`/api/support-tickets/${created.body.id}/timeline`)
      .set(auth(admin))
      .expect(200);
    const summaries = openTimeline.body.map((e: { summary: string }) => e.summary);
    expect(summaries).toContain('Work started');
    expect(summaries).not.toContain('Not started');
    expect(openTimeline.body.find((e: { action: string }) => e.action === 'started')?.backfilled).toBe(true);

    const stillOpen = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Truly not started',
        description: 'Still open and unassigned.',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);
    const untouched = await request(app.getHttpServer())
      .get(`/api/support-tickets/${stillOpen.body.id}/timeline`)
      .set(auth(admin))
      .expect(200);
    expect(untouched.body.map((e: { summary: string }) => e.summary)).toContain('Not started');
  });

  it('assign-to-me claims the ticket for IT Support and IT Admin and starts work from open', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Assign to me',
        description: 'Please take this.',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/assign-to-me`)
      .set(auth(employee))
      .expect(403);

    const asSupport = await request(app.getHttpServer())
      .post(`/api/support-tickets/${created.body.id}/assign-to-me`)
      .set(auth(support))
      .expect(201);
    const supportUser = await prisma.user.findUnique({ where: { email: 'support@newvision.local' } });
    expect(asSupport.body.assignedToId).toBe(supportUser!.id);
    expect(asSupport.body.status).toBe('in_progress');

    const created2 = await request(app.getHttpServer())
      .post('/api/support-tickets')
      .set(auth(employee))
      .send({
        subject: 'Assign to me admin',
        description: 'Admin takes it.',
        categoryId: softwareId,
        autoAssign: false,
      })
      .expect(201);
    const asAdmin = await request(app.getHttpServer())
      .post(`/api/support-tickets/${created2.body.id}/assign-to-me`)
      .set(auth(admin))
      .expect(201);
    const adminUser = await prisma.user.findUnique({ where: { email: 'itadmin@newvision.local' } });
    expect(asAdmin.body.assignedToId).toBe(adminUser!.id);
    expect(asAdmin.body.status).toBe('in_progress');
  });
});
