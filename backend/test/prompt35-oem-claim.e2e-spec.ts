import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 35 Item 4 — OEM/AMC claim on maintenance (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let prisma: PrismaService;
  let ids: Awaited<ReturnType<typeof seedCore>>;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    admin = await login(app, 'itadmin@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('files an OEM case, copies serial/invoice, moves to under_repair, and flags a loaner', async () => {
    const asset = await prisma.asset.create({
      data: {
        assetCode: 'AST-PUN-LAP-OEM35',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'assigned',
        assignedEmployeeId: ids.employeeA,
        serialNumber: 'SN-OEM-35',
        invoiceNo: 'INV-OEM-35',
      },
    });
    const ticket = await request(app.getHttpServer())
      .post('/api/maintenance')
      .set(auth(admin))
      .send({ assetId: asset.id, issue: 'Motherboard dead after BIOS flash' })
      .expect(201);
    expect(ticket.body.status).toBe('reported');

    const claimed = await request(app.getHttpServer())
      .post(`/api/maintenance/${ticket.body.id}/oem-claim`)
      .set(auth(admin))
      .send({
        oemCaseId: 'SR9990001',
        coverage: 'oem_warranty',
        incidentKind: 'defect',
      })
      .expect(201);

    expect(claimed.body.status).toBe('under_repair');
    expect(claimed.body.oemCaseId).toBe('SR9990001');
    expect(claimed.body.claimInvoiceNo).toBe('INV-OEM-35');
    expect(claimed.body.notes).toMatch(/SN-OEM-35/);
    expect(claimed.body.notes).toMatch(/INV-OEM-35/);
    expect(claimed.body.loanerNeeded).toBe(true);

    const row = await prisma.assetMaintenance.findUniqueOrThrow({ where: { id: ticket.body.id } });
    expect(row.coverage).toBe('oem_warranty');
    const assetRow = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(assetRow.status).toBe('under_repair');
  });
});
