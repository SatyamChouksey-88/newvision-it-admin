/** Prompt 38: joining, kit, accessory depth, sticky chrome, nv-phone. */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 38 — join / kit / accessories', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;
  let locationId: number;
  let categoryLap: number;
  let employeeA: number;
  let employeeB: number;

  beforeAll(async () => {
    app = await createTestApp();
    const ids = await seedCore(app.get(PrismaService));
    locationId = ids.locationPune;
    categoryLap = ids.categoryLap;
    employeeA = ids.employeeA;
    employeeB = ids.employeeB;
    adminToken = await login(app, 'itadmin@newvision.local');
    employeeToken = await login(app, 'employee@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('lists employees joined within days', async () => {
    const dateJoined = new Date().toISOString();
    await request(server())
      .post('/api/employees')
      .set(auth(adminToken))
      .send({
        employeeCode: 'EMP-JOIN7',
        firstName: 'New',
        lastName: 'Joiner',
        email: 'new.joiner@newvision.local',
        locationId,
        dateJoined,
      })
      .expect(201);

    const listed = await request(server())
      .get('/api/employees')
      .query({ joinedWithinDays: 7, q: 'EMP-JOIN7', _start: 0, _end: 10 })
      .set(auth(adminToken))
      .expect(200);
    expect(listed.body.data.some((e: { employeeCode: string }) => e.employeeCode === 'EMP-JOIN7')).toBe(
      true,
    );
  });

  it('rejects offboard without lastWorkingDate', async () => {
    const created = await request(server())
      .post('/api/employees')
      .set(auth(adminToken))
      .send({
        employeeCode: 'EMP-NOLWD',
        firstName: 'No',
        lastName: 'Lwd',
        email: 'no.lwd@newvision.local',
        locationId,
        dateJoined: new Date().toISOString(),
      })
      .expect(201);

    const res = await request(server())
      .post(`/api/employees/${created.body.id}/offboard`)
      .set(auth(adminToken))
      .send({ notes: 'gone' })
      .expect(400);
    expect(JSON.stringify(res.body)).toMatch(/lastWorkingDate/i);

    const ok = await request(server())
      .post(`/api/employees/${created.body.id}/offboard`)
      .set(auth(adminToken))
      .send({ lastWorkingDate: new Date().toISOString(), notes: 'gone' })
      .expect(201);
    expect(ok.body.isActive).toBe(false);
    expect(ok.body.lastWorkingDate).toBeTruthy();
  });

  it('creates an accessory with catalog fields and checks out with serial + parent asset', async () => {
    const acc = await request(server())
      .post('/api/accessories')
      .set(auth(adminToken))
      .send({
        name: 'USB-C Charger 65W',
        category: 'Power',
        brand: 'Dell',
        model: '65W',
        quantityTotal: 10,
        locationId,
        lowStockThreshold: 2,
      })
      .expect(201);
    expect(acc.body.brand).toBe('Dell');
    expect(acc.body.lowStockThreshold).toBe(2);

    const asset = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: categoryLap, locationId, model: 'KitParent' })
      .expect(201);

    const checkout = await request(server())
      .post(`/api/accessories/${acc.body.id}/checkout`)
      .set(auth(adminToken))
      .send({
        employeeId: employeeA,
        quantity: 2,
        serialNumber: 'CHG-SN-1',
        issuedWithAssetId: asset.body.id,
      })
      .expect(201);
    expect(checkout.body.quantity).toBe(2);
    expect(checkout.body.serialNumber).toBe('CHG-SN-1');
    expect(checkout.body.issuedWithAsset?.assetCode).toBeTruthy();

    const profile = await request(server())
      .get(`/api/employees/${employeeA}/profile`)
      .set(auth(adminToken))
      .expect(200);
    expect(
      profile.body.accessoryCheckouts.some(
        (c: { serialNumber?: string }) => c.serialNumber === 'CHG-SN-1',
      ),
    ).toBe(true);
  });

  it('my-summary includes own accessory checkouts and not the catalog', async () => {
    const stamp = Date.now();
    const mineName = `KitMouse-${stamp}`;
    const otherName = `OtherHeadset-${stamp}`;
    const serial = `MOUSE-SN-${stamp}`;
    const due = new Date(Date.now() + 7 * 86_400_000).toISOString();

    const mine = await request(server())
      .post('/api/accessories')
      .set(auth(adminToken))
      .send({ name: mineName, category: 'Peripherals', quantityTotal: 5, locationId })
      .expect(201);
    const other = await request(server())
      .post('/api/accessories')
      .set(auth(adminToken))
      .send({ name: otherName, category: 'Audio', quantityTotal: 5, locationId })
      .expect(201);

    const checkout = await request(server())
      .post(`/api/accessories/${mine.body.id}/checkout`)
      .set(auth(adminToken))
      .send({ employeeId: employeeA, quantity: 1, serialNumber: serial, expectedReturnAt: due })
      .expect(201);
    expect(checkout.body.serialNumber).toBe(serial);

    await request(server())
      .post(`/api/accessories/${other.body.id}/checkout`)
      .set(auth(adminToken))
      .send({ employeeId: employeeB, quantity: 1 })
      .expect(201);

    const summary = await request(server())
      .get('/api/dashboard/my-summary')
      .set(auth(employeeToken))
      .expect(200);
    const accessories = summary.body.accessories as {
      id: number;
      name: string;
      category: string;
      quantity: number;
      checkedOutAt?: string;
      expectedReturnAt?: string | null;
      serialNumber?: string;
    }[];
    const names = accessories.map((a) => a.name);
    expect(names).toContain(mineName);
    expect(names).not.toContain(otherName);
    const row = accessories.find((a) => a.name === mineName)!;
    expect(row).not.toHaveProperty('serialNumber');
    expect(JSON.stringify(row)).not.toContain(serial);
    expect(row.checkedOutAt).toBeTruthy();
    expect(row.expectedReturnAt).toBeTruthy();
    expect(row.quantity).toBe(1);

    await request(server()).get('/api/accessories').set(auth(employeeToken)).expect(403);

    const assets = await request(server())
      .get('/api/assets')
      .query({ _start: 0, _end: 50 })
      .set(auth(employeeToken))
      .expect(200);
    const assetBlob = JSON.stringify(assets.body.data ?? []);
    expect(assetBlob).not.toContain(mineName);
    expect(assetBlob).not.toContain(otherName);

    await request(server())
      .post(`/api/accessories/${mine.body.id}/checkin`)
      .set(auth(adminToken))
      .send({ checkoutId: checkout.body.id })
      .expect(201);
    const afterIn = await request(server())
      .get('/api/dashboard/my-summary')
      .set(auth(employeeToken))
      .expect(200);
    expect((afterIn.body.accessories as { name: string }[]).map((a) => a.name)).not.toContain(mineName);
  });

  it('search includes kit payload for IT', async () => {
    const res = await request(server())
      .get('/api/search')
      .query({ q: 'Asha' })
      .set(auth(adminToken))
      .expect(200);
    const hit = res.body.employees.find((e: { firstName: string }) => e.firstName === 'Asha');
    expect(hit?.kit).toBeDefined();
    expect(Array.isArray(hit.kit.assetCodes)).toBe(true);
    expect(Array.isArray(hit.kit.accessoryNames)).toBe(true);
  });
});
