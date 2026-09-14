import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 35 Item 3 — scan-to-audit with location confirm (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let employee: string;
  let prisma: PrismaService;
  let ids: Awaited<ReturnType<typeof seedCore>>;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    admin = await login(app, 'itadmin@newvision.local');
    employee = await login(app, 'employee@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('public card includes location but not warranty/condition, and staff can stamp a new office', async () => {
    const asset = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-SCAN35',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
        brand: 'Dell',
        model: 'Latitude',
      },
    });

    const pub = await request(app.getHttpServer())
      .get(`/api/public/assets/${asset.assetCode}`)
      .expect(200);
    expect(pub.body.assetCode).toBe(asset.assetCode);
    expect(pub.body.locationId).toBe(ids.locationPune);
    expect(pub.body.warrantyEnd).toBeUndefined();
    expect(pub.body.condition).toBeUndefined();
    expect(pub.body.purchaseCost).toBeUndefined();

    await request(app.getHttpServer())
      .post('/api/assets/audit-by-code')
      .set(auth(employee))
      .send({ code: asset.assetCode, locationId: ids.locationHyd })
      .expect(403);

    const stamped = await request(app.getHttpServer())
      .post('/api/assets/audit-by-code')
      .set(auth(admin))
      .send({ code: asset.assetCode, locationId: ids.locationHyd, notes: 'On Hyd desk 12' })
      .expect(201);
    expect(stamped.body.lastAuditedAt).toBeTruthy();
    expect(stamped.body.locationId).toBe(ids.locationHyd);

    const row = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(row.locationId).toBe(ids.locationHyd);
    expect(row.lastAuditedAt).toBeTruthy();
  });
});
