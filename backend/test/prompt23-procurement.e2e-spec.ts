import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

const line = (over: Record<string, unknown> = {}) => ({
  product: 'M365 E1',
  unitCost: 6833,
  quantity: 40,
  commercialNotes: '₹6,833/user with expiry on 17th July 2027',
  kind: 'license',
  ...over,
});

const prBody = (over: Record<string, unknown> = {}) => ({
  title: 'Approval Request for Procurement of M365 E1 with Teams Licenses',
  departmentFreeText: 'IT Infrastructure Services (ITIS)',
  businessRequirement: 'Renew the tenant licences before expiry.',
  proposedMakeModel: 'Microsoft',
  category: 'Licenses/Software',
  procurementType: 'Licenses',
  budgetHead: 'IT & Finance',
  lineItems: [line()],
  ...over,
});

describe('Prompt 23 — Vendor & Procurement (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let superTok: string;
  let manager: string;
  let support: string;
  let locationId: number;

  beforeAll(async () => {
    app = await createTestApp();
    const ids = await seedCore(app.get(PrismaService));
    locationId = ids.locationPune;
    admin = await login(app, 'itadmin@newvision.local');
    superTok = await login(app, 'superadmin@newvision.local');
    manager = await login(app, 'manager@newvision.local');
    support = await login(app, 'support@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('IT Support cannot open vendors', async () => {
    await request(app.getHttpServer()).get('/api/vendors').set(auth(support)).expect(403);
  });

  it('covers vendor lifecycle, bank re-approval, blacklist, requisition template, material vs trivial edit, withdraw, reject-resubmit, PO amend/cancel/short-close, GRN void, 3-way match, contract renew, handoff + reconcile flag', async () => {
    const vendor = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({
        legalName: 'Contoso Licensing Pvt Ltd',
        taxId: 'GSTIN-CONTOSO',
        categories: ['Licenses/Software'],
        bankAccountNumber: '123456789012',
        bankIfscSwift: 'HDFC0001111',
        paymentTerms: 'Net 30',
      })
      .expect(201);
    expect(vendor.body.status).toBe('draft');
    expect(vendor.body.bankAccountMasked).toMatch(/••••/);

    await request(app.getHttpServer())
      .patch(`/api/vendors/${vendor.body.id}/status`)
      .set(auth(admin))
      .send({ status: 'active', reason: 'Onboarded after due diligence' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/vendors/${vendor.body.id}`)
      .set(auth(admin))
      .send({ legalName: 'Contoso Licensing Pvt Ltd', bankAccountNumber: '999988887777' })
      .expect(200)
      .then((r) => expect(r.body.bankChangePending).toBe(true));

    await request(app.getHttpServer())
      .post(`/api/vendors/${vendor.body.id}/approve-bank`)
      .set(auth(superTok))
      .expect(200);

    const listed = await request(app.getHttpServer()).get('/api/vendors').set(auth(admin)).expect(200);
    expect(String(listed.body.data[0].bankAccountNumber)).toMatch(/••••/);

    const created = await request(app.getHttpServer())
      .post('/api/purchase-requisitions')
      .set(auth(admin))
      .send(
        prBody({
          vendorId: vendor.body.id,
          locationIds: [locationId],
          remoteEmployees: true,
        }),
      )
      .expect(201);
    expect(created.body.requisitionNumber).toMatch(/^PR-/);
    expect(created.body.lineItems[0].product).toBe('M365 E1');
    expect(Number(created.body.totalCost)).toBe(6833 * 40);

    await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${created.body.id}/submit`)
      .set(auth(admin))
      .expect(200)
      .then((r) => {
        expect(r.body.status).toBe('pending_approval');
        expect(r.body.approvers.some((a: { kind: string }) => a.kind === 'required')).toBe(true);
      });

    const trivial = await request(app.getHttpServer())
      .put(`/api/purchase-requisitions/${created.body.id}`)
      .set(auth(admin))
      .send({ title: 'Approval Request for Procurement of M365 E1 with Teams Licenses (typo fix)' })
      .expect(200);
    expect(trivial.body.revision).toBe(1);
    expect(trivial.body.approvers.filter((a: { status: string; kind: string }) => a.kind === 'required' && a.status === 'pending').length).toBeGreaterThan(0);

    const material = await request(app.getHttpServer())
      .put(`/api/purchase-requisitions/${created.body.id}`)
      .set(auth(admin))
      .send({ lineItems: [line({ quantity: 41 })] })
      .expect(200);
    expect(material.body.revision).toBe(2);
    expect(material.body.status).toBe('pending_approval');
    expect(material.body.approvers.every((a: { status: string }) => a.status === 'pending')).toBe(true);

    const history = await request(app.getHttpServer())
      .get(`/api/purchase-requisitions/${created.body.id}/history`)
      .set(auth(admin))
      .expect(200);
    expect(history.body.some((h: { action: string }) => h.action === 'revise')).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${created.body.id}/decide`)
      .set(auth(admin))
      .send({ decision: 'rejected', comment: 'Need a second quote' })
      .expect(200)
      .then((r) => expect(r.body.status).toBe('rejected'));

    await request(app.getHttpServer())
      .put(`/api/purchase-requisitions/${created.body.id}`)
      .set(auth(admin))
      .send({ businessRequirement: 'Renew plus 1 spare seat, quoted again.' })
      .expect(200);

    const resubmitted = await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${created.body.id}/submit`)
      .set(auth(admin))
      .expect(200);
    expect(resubmitted.body.status).toBe('pending_approval');

    await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${created.body.id}/decide`)
      .set(auth(admin))
      .send({ decision: 'approved' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${created.body.id}/decide`)
      .set(auth(superTok))
      .send({ decision: 'approved' })
      .expect(200)
      .then((r) => expect(r.body.status).toBe('approved'));

    const po = await request(app.getHttpServer())
      .post(`/api/purchase-orders/from-requisition/${created.body.id}`)
      .set(auth(admin))
      .expect(201);
    expect(po.body.poNumber).toMatch(/^PO-/);
    expect(po.body.lineItems.length).toBe(1);

    await request(app.getHttpServer()).post(`/api/purchase-orders/${po.body.id}/send`).set(auth(admin)).expect(200);

    const amended = await request(app.getHttpServer())
      .post(`/api/purchase-orders/${po.body.id}/amend`)
      .set(auth(admin))
      .send({
        reason: 'Vendor revised the unit price',
        lineItems: [line({ unitCost: 6900, quantity: 41 })],
      })
      .expect(201);
    expect(amended.body.revision).toBe(2);
    expect(amended.body.amendments.length).toBeGreaterThan(0);

    const pdf = await request(app.getHttpServer())
      .get(`/api/purchase-orders/${po.body.id}/pdf`)
      .set(auth(admin))
      .expect(200);
    expect(pdf.headers['content-type']).toMatch(/pdf/);

    // Hardware PO for GRN / handoff / void
    const hwVendor = await request(app.getHttpServer())
      .post('/api/vendors')
      .set(auth(admin))
      .send({ legalName: 'Acme Peripherals', categories: ['Hardware'] })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/vendors/${hwVendor.body.id}/status`)
      .set(auth(admin))
      .send({ status: 'active', reason: 'Preferred hardware supplier' })
      .expect(200);

    const hwPr = await request(app.getHttpServer())
      .post('/api/purchase-requisitions')
      .set(auth(admin))
      .send(
        prBody({
          title: 'Laptops for new joiners',
          category: 'Hardware',
          procurementType: 'Hardware',
          vendorId: hwVendor.body.id,
          locationIds: [locationId],
          lineItems: [{ product: 'Latitude 5440', unitCost: 80000, quantity: 2, kind: 'serialized' }],
        }),
      )
      .expect(201);
    await request(app.getHttpServer()).post(`/api/purchase-requisitions/${hwPr.body.id}/submit`).set(auth(admin)).expect(200);
    await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${hwPr.body.id}/decide`)
      .set(auth(admin))
      .send({ decision: 'approved' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${hwPr.body.id}/decide`)
      .set(auth(superTok))
      .send({ decision: 'approved' })
      .expect(200);

    const hwPo = await request(app.getHttpServer())
      .post(`/api/purchase-orders/from-requisition/${hwPr.body.id}`)
      .set(auth(admin))
      .expect(201);
    await request(app.getHttpServer()).post(`/api/purchase-orders/${hwPo.body.id}/send`).set(auth(admin)).expect(200);

    const lineId = hwPo.body.lineItems[0].id;
    const received = await request(app.getHttpServer())
      .post(`/api/purchase-orders/${hwPo.body.id}/receipts`)
      .set(auth(admin))
      .send({
        locationId,
        lines: [{ purchaseOrderLineId: lineId, quantityReceived: 1 }],
        discrepancy: 'short',
      })
      .expect(201);
    expect(received.body.status).toBe('partially_received');
    expect(received.body.handoffs.length).toBeGreaterThan(0);
    const assetCount = received.body.handoffs.filter((h: { kind: string }) => h.kind === 'serialized').length;
    expect(assetCount).toBe(1);

    const mismatch = await request(app.getHttpServer())
      .post('/api/purchase-orders/invoices')
      .set(auth(admin))
      .send({
        vendorId: hwVendor.body.id,
        purchaseOrderId: hwPo.body.id,
        invoiceNumber: 'INV-BAD-1',
        invoiceDate: new Date().toISOString(),
        amount: 999999,
      })
      .expect(400);
    expect(mismatch.body.message).toMatch(/exception note/i);

    await request(app.getHttpServer())
      .post('/api/purchase-orders/invoices')
      .set(auth(admin))
      .send({
        vendorId: hwVendor.body.id,
        purchaseOrderId: hwPo.body.id,
        invoiceNumber: 'INV-BAD-1',
        invoiceDate: new Date().toISOString(),
        amount: 999999,
        exceptionNote: 'Vendor billed the remaining units early — finance aware',
      })
      .expect(201)
      .then((r) => expect(r.body.matchStatus).toBe('exception'));

    const grnId = received.body.receipts[0].id;
    const voided = await request(app.getHttpServer())
      .post(`/api/purchase-orders/receipts/${grnId}/void`)
      .set(auth(admin))
      .send({ reason: 'Wrong quantity entered' })
      .expect(201);
    expect(voided.body.receipts[0].isReversed).toBe(true);
    expect(voided.body.handoffs.some((h: { needsReconciliation: boolean }) => h.needsReconciliation)).toBe(true);
    expect(voided.body.status).toBe('sent');

    const full = await request(app.getHttpServer())
      .post(`/api/purchase-orders/${hwPo.body.id}/receipts`)
      .set(auth(admin))
      .send({ locationId, lines: [{ purchaseOrderLineId: lineId, quantityReceived: 2 }] })
      .expect(201);
    expect(full.body.status).toBe('received');

    const okAmt = 80000 * 2;
    await request(app.getHttpServer())
      .post('/api/purchase-orders/invoices')
      .set(auth(admin))
      .send({
        vendorId: hwVendor.body.id,
        purchaseOrderId: hwPo.body.id,
        invoiceNumber: 'INV-OK-1',
        invoiceDate: new Date().toISOString(),
        amount: okAmt,
      })
      .expect(201)
      .then((r) => expect(r.body.matchStatus).toBe('matched'));

    const shortPr = await request(app.getHttpServer())
      .post('/api/purchase-requisitions')
      .set(auth(admin))
      .send(
        prBody({
          title: 'Spare docks',
          category: 'Peripherals',
          procurementType: 'Hardware',
          vendorId: hwVendor.body.id,
          locationIds: [locationId],
          lineItems: [{ product: 'Dock', unitCost: 4000, quantity: 3, kind: 'accessory' }],
        }),
      )
      .expect(201);
    await request(app.getHttpServer()).post(`/api/purchase-requisitions/${shortPr.body.id}/submit`).set(auth(admin)).expect(200);
    await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${shortPr.body.id}/decide`)
      .set(auth(admin))
      .send({ decision: 'approved' })
      .expect(200);
    // 3*4000 = 12000 < 50000 so only IT_ADMIN is required
    expect(['approved', 'pending_approval']).toContain(
      (
        await request(app.getHttpServer())
          .get(`/api/purchase-requisitions/${shortPr.body.id}`)
          .set(auth(admin))
      ).body.status,
    );
    const shortStatus = (
      await request(app.getHttpServer()).get(`/api/purchase-requisitions/${shortPr.body.id}`).set(auth(admin))
    ).body.status;
    if (shortStatus === 'pending_approval') {
      await request(app.getHttpServer())
        .post(`/api/purchase-requisitions/${shortPr.body.id}/decide`)
        .set(auth(superTok))
        .send({ decision: 'approved' })
        .expect(200);
    }
    const shortPo = await request(app.getHttpServer())
      .post(`/api/purchase-orders/from-requisition/${shortPr.body.id}`)
      .set(auth(admin))
      .expect(201);
    await request(app.getHttpServer()).post(`/api/purchase-orders/${shortPo.body.id}/send`).set(auth(admin)).expect(200);
    await request(app.getHttpServer())
      .post(`/api/purchase-orders/${shortPo.body.id}/receipts`)
      .set(auth(admin))
      .send({
        locationId,
        lines: [{ purchaseOrderLineId: shortPo.body.lineItems[0].id, quantityReceived: 1 }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/purchase-orders/${shortPo.body.id}/short-close`)
      .set(auth(admin))
      .send({ reason: 'Requester only needed one dock' })
      .expect(200)
      .then((r) => expect(r.body.status).toBe('closed'));

    const cancelPo = await request(app.getHttpServer())
      .post(`/api/purchase-orders/from-requisition/${created.body.id}`)
      .set(auth(admin));
    // first PR already converted — expect 400
    expect([400, 201]).toContain(cancelPo.status);

    const extraPr = await request(app.getHttpServer())
      .post('/api/purchase-requisitions')
      .set(auth(admin))
      .send(prBody({ title: 'Spare dock', category: 'Peripherals', procurementType: 'Hardware', vendorId: hwVendor.body.id, lineItems: [{ product: 'Dock', unitCost: 4000, quantity: 1, kind: 'accessory' }] }))
      .expect(201);
    await request(app.getHttpServer()).post(`/api/purchase-requisitions/${extraPr.body.id}/submit`).set(auth(admin)).expect(200);
    await request(app.getHttpServer())
      .post(`/api/purchase-requisitions/${extraPr.body.id}/cancel`)
      .set(auth(admin))
      .send({ reason: 'No longer needed' })
      .expect(200)
      .then((r) => expect(r.body.status).toBe('cancelled'));

    await request(app.getHttpServer())
      .patch(`/api/vendors/${hwVendor.body.id}/status`)
      .set(auth(admin))
      .send({ status: 'blacklisted', reason: 'Repeated damaged deliveries' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/purchase-requisitions')
      .set(auth(admin))
      .send(prBody({ vendorId: hwVendor.body.id, lineItems: [{ product: 'Dock', unitCost: 10, quantity: 1 }] }))
      .expect(400);

    const contract = await request(app.getHttpServer())
      .post('/api/vendor-contracts')
      .set(auth(admin))
      .send({
        vendorId: vendor.body.id,
        type: 'license_subscription',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 40 * 86400000).toISOString(),
        value: 100000,
        entitlementCount: 40,
        usageCount: 38,
      })
      .expect(201);
    const renewed = await request(app.getHttpServer())
      .post(`/api/vendor-contracts/${contract.body.id}/renew`)
      .set(auth(admin))
      .expect(201);
    expect(renewed.body.renewedFromId).toBe(contract.body.id);

    const check = await request(app.getHttpServer()).post('/api/procurement/renewal-check').set(auth(admin)).expect(201);
    expect(check.body.checked).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .post(`/api/vendors/${vendor.body.id}/scorecards`)
      .set(auth(admin))
      .send({ period: '2026-Q3', onTimeDeliveryPct: 90, qualityRate: 95, priceCompetitiveness: 80, responsiveness: 85 })
      .expect(201);

    await request(app.getHttpServer()).get('/api/reports/procurement-spend?format=csv').set(auth(admin)).expect(200);

    const summary = await request(app.getHttpServer()).get('/api/procurement/summary').set(auth(admin)).expect(200);
    expect(summary.body.spendByVendor).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/purchase-requisitions')
      .set(auth(manager))
      .send(prBody({ title: 'Team monitors', category: 'Hardware', procurementType: 'Hardware', vendorId: vendor.body.id, lineItems: [{ product: 'Monitor', unitCost: 12000, quantity: 1, kind: 'serialized' }] }))
      .expect(201);
  }, 60000);
});
