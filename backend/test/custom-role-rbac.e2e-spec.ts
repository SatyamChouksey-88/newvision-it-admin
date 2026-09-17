import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Custom role RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdmin: string;
  let ids: TestContext['ids'];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma, app);
    superAdmin = await login(app, 'superadmin@newvision.local');

    const custom = await prisma.customRole.create({
      data: {
        tenantId: 1,
        key: 'assets-readonly',
        label: 'Assets read only',
        isActive: true,
        permissions: {
          connect: [{ key: 'asset:read' }],
        },
      },
    });

    const employeeRole = await prisma.role.findFirstOrThrow({ where: { name: 'EMPLOYEE' } });
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Password123!', 10);
    await prisma.user.create({
      data: {
        tenantId: 1,
        email: 'custom.reader@newvision.local',
        fullName: 'Custom Reader',
        passwordHash: hash,
        roleId: employeeRole.id,
        customRoleId: custom.id,
        isActive: true,
      },
    });
    const { RbacService } = await import('../src/common/rbac/rbac.service');
    await app.get(RbacService).refreshFromDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  it('custom role with asset:read can list assets but cannot create', async () => {
    const token = await login(app, 'custom.reader@newvision.local');
    await request(app.getHttpServer())
      .get('/api/assets')
      .set(auth(token))
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(token))
      .send({
        assetCode: 'CRB-001',
        name: 'Should fail',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
      })
      .expect(403);
  });

  it('custom role without ticket:manage cannot access ticket staff queue', async () => {
    const token = await login(app, 'custom.reader@newvision.local');
    await request(app.getHttpServer()).get('/api/support-tickets/staff').set(auth(token)).expect(403);
  });

  it('super admin can still create assets', async () => {
    await request(app.getHttpServer())
      .post('/api/assets')
      .set(auth(superAdmin))
      .send({
        assetCode: 'CRB-SA-001',
        name: 'Super create',
        categoryId: ids.categoryLap,
        locationId: ids.locationPune,
        status: 'available',
      })
      .expect(201);
  });
});
