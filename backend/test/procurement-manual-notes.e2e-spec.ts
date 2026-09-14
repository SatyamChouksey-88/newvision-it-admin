import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

/**
 * Prompt 26 Part 1.2 — manual correction and free-text notes were previously only wired up
 * for assets/employees/accessories/consumables/maintenance/tickets/locations. Vendors,
 * requisitions, purchase orders, and contracts had no way to fix a typo or leave a note
 * without going through the module's full formal workflow. These tests cover the extension.
 */
describe('Procurement manual correction & notes (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let superTok: string;
  let manager: string;
  let vendorId: number;
  let requisitionId: number;
  let purchaseOrderId: number;
  let contractId: number;

  beforeAll(async () => {
    app = await createTestApp();
    await seedCore(app.get(PrismaService));
    admin = await login(app, 'itadmin@newvision.local');
    superTok = await login(app, 'superadmin@newvision.local');
    manager = await login(app, 'manager@newvision.local');

    const vendor = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({ legalName: 'Manual Edit Test Vendor', categories: ['Hardware'], paymentTerms: 'Net 30' })
      .expect(201);
    vendorId = vendor.body.id;
    await request(app.getHttpServer())
      .patch(`/api/vendors/${vendorId}/status`)
      .set(auth(superTok))
      .send({ status: 'active', reason: 'Test setup', override: true })
      .expect(200);

    const pr = await request(app.getHttpServer())
      .post('/api/purchase-requisitions')
      .set(auth(manager))
      .send({
        title: 'Manual edit test PR',
        businessRequirement: 'Testing',
        category: 'Hardware',
        procurementType: 'Hardware',
        vendorId,
        lineItems: [{ product: 'Laptop', unitCost: 1000, quantity: 1 }],
      })
      .expect(201);
    requisitionId = pr.body.id;
    await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${requisitionId}/submit`)
      .set(auth(manager))
      .expect(200);
    // Manager-raised PR needs one non-requester approval level to clear (parallel/required by default).
    const detail = await request(app.getHttpServer())
      .get(`/api/purchase-requisitions/${requisitionId}`)
      .set(auth(admin))
      .expect(200);
    for (const approver of detail.body.approvers) {
      const tok = approver.user.email === 'superadmin@newvision.local' ? superTok : admin;
      await request(app.getHttpServer())
        .post(`/api/purchase-requisitions/${requisitionId}/decide`)
        .set(auth(tok))
        .send({ decision: 'approved' })
        .expect(200);
    }

    const po = await request(app.getHttpServer())
      .post(`/api/purchase-orders/from-requisition/${requisitionId}`)
      .set(auth(admin))
      .expect(201);
    purchaseOrderId = po.body.id;

    const contract = await request(app.getHttpServer())
      .post('/api/vendor-contracts')
      .set(auth(admin))
      .send({ vendorId, type: 'amc', startDate: '2026-01-01', endDate: '2027-01-01', value: 100000 })
      .expect(201);
    contractId = contract.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('manually corrects a vendor field with a reason, and it is audited', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/records/Vendor/${vendorId}/manual`)
      .set(auth(admin))
      .send({ reason: 'Fixed a typo in payment terms', fields: { paymentTerms: 'Net 45' } })
      .expect(201);
    expect(res.body.paymentTerms).toBe('Net 45');

    const audit = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set(auth(admin))
      .query({ entityType: 'Vendor', entityId: String(vendorId), _start: 0, _end: 10 })
      .expect(200);
    expect(audit.body.data.some((r: { action: string }) => r.action === 'manual_override')).toBe(true);
  });

  it('rejects a manual correction on a vendor field outside the allowlist (status)', async () => {
    await request(app.getHttpServer())
      .post(`/api/records/Vendor/${vendorId}/manual`)
      .set(auth(admin))
      .send({ reason: 'Trying to bypass the status workflow', fields: { status: 'blacklisted' } })
      .expect(400);
  });

  it('manually corrects a requisition, purchase order, and contract', async () => {
    await request(app.getHttpServer())
      .post(`/api/records/PurchaseRequisition/${requisitionId}/manual`)
      .set(auth(admin))
      .send({ reason: 'Clarified the requirement text', fields: { businessRequirement: 'Updated requirement' } })
      .expect(201)
      .then((r) => expect(r.body.businessRequirement).toBe('Updated requirement'));

    await request(app.getHttpServer())
      .post(`/api/records/PurchaseOrder/${purchaseOrderId}/manual`)
      .set(auth(admin))
      .send({ reason: 'Added delivery terms', fields: { terms: 'FOB destination' } })
      .expect(201)
      .then((r) => expect(r.body.terms).toBe('FOB destination'));

    await request(app.getHttpServer())
      .post(`/api/records/VendorContract/${contractId}/manual`)
      .set(auth(admin))
      .send({ reason: 'Corrected SLA text', fields: { slaTerms: '99.9% uptime' } })
      .expect(201)
      .then((r) => expect(r.body.slaTerms).toBe('99.9% uptime'));
  });

  it('a manual correction cannot clear a required contract date', async () => {
    await request(app.getHttpServer())
      .post(`/api/records/VendorContract/${contractId}/manual`)
      .set(auth(admin))
      .send({ reason: 'Clearing by mistake', fields: { endDate: '' } })
      .expect(400);
  });

  it('adds and lists a free-text note on a vendor, requisition, PO, and contract', async () => {
    for (const [entityType, id] of [
      ['Vendor', vendorId],
      ['PurchaseRequisition', requisitionId],
      ['PurchaseOrder', purchaseOrderId],
      ['VendorContract', contractId],
    ] as const) {
      await request(app.getHttpServer())
        .post('/api/notes')
        .set(auth(admin))
        .send({ entityType, entityId: String(id), body: `Note on ${entityType}` })
        .expect(201);
      const list = await request(app.getHttpServer())
        .get('/api/notes')
        .set(auth(admin))
        .query({ entityType, entityId: String(id) })
        .expect(200);
      expect(list.body.some((n: { body: string }) => n.body === `Note on ${entityType}`)).toBe(true);
    }
  });

  it('the requisition owner (a manager) can add a note on their own requisition', async () => {
    await request(app.getHttpServer())
      .post('/api/notes')
      .set(auth(manager))
      .send({ entityType: 'PurchaseRequisition', entityId: String(requisitionId), body: 'Requester follow-up' })
      .expect(201);
  });

  it('a manager cannot add a note on a requisition they did not raise', async () => {
    const other = await request(app.getHttpServer())
      .post('/api/purchase-requisitions')
      .set(auth(admin))
      .send({
        title: 'Admin-raised PR',
        businessRequirement: 'Testing',
        category: 'Hardware',
        procurementType: 'Hardware',
        lineItems: [{ product: 'Monitor', unitCost: 500, quantity: 1 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/notes')
      .set(auth(manager))
      .send({ entityType: 'PurchaseRequisition', entityId: String(other.body.id), body: 'Should be blocked' })
      .expect(403);
  });

  it('IT Support cannot manually correct or add notes on procurement records', async () => {
    const support = await login(app, 'support@newvision.local');
    await request(app.getHttpServer())
      .post(`/api/records/Vendor/${vendorId}/manual`)
      .set(auth(support))
      .send({ reason: 'Trying anyway', fields: { paymentTerms: 'Net 60' } })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/notes')
      .set(auth(support))
      .send({ entityType: 'PurchaseOrder', entityId: String(purchaseOrderId), body: 'Should be blocked' })
      .expect(403);
  });
});
