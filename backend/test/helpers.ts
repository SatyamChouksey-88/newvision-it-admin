import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ROLE_PERMISSIONS } from '../src/common/rbac/permissions';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { runUnscoped, runWithTenant, setTestTenant } from '../src/tenancy/context';

async function withAdminClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const url =
    process.env.DATABASE_URL ||
    'postgresql://newvision:newvision@localhost:5432/newvision_test?schema=public';
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export const DEMO_PASSWORD = 'Password123!';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  ids: {
    locationPune: number;
    locationHyd: number;
    categoryLap: number;
    department: number;
    employeeA: number;
    employeeB: number;
    managerEmployee: number;
  };
}

export async function createTestApp(): Promise<INestApplication> {
  setTestTenant(1);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export async function resetDatabase(_prisma: PrismaService): Promise<void> {
  // Dedicated connection — sharing Prisma's Pool with TRUNCATE races pg clients
  // ("query() when already executing") and can leave the fixture half-applied.
  await withAdminClient((client) =>
    client.query('TRUNCATE TABLE tenants, roles, permissions RESTART IDENTITY CASCADE'),
  );
}

/** Seed a small, deterministic fixture and the five role users. Returns key ids. */
export async function seedCore(prisma: PrismaService): Promise<TestContext['ids']> {
  await resetDatabase(prisma);
  setTestTenant(1);

  await runUnscoped(async () => {
    await prisma.tenant.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        slug: 'newvision',
        name: 'NewVision Softcom',
        plan: 'team',
        status: 'active',
        modules: { procurement: true, chat: true, maintenance: true },
      },
      update: {
        slug: 'newvision',
        name: 'NewVision Softcom',
        plan: 'team',
        status: 'active',
        trialEndsAt: null,
        modules: { procurement: true, chat: true, maintenance: true },
      },
    });
    await prisma.pool.query(
      `SELECT setval(pg_get_serial_sequence('tenants', 'id'), GREATEST(1, (SELECT MAX(id) FROM tenants)))`,
    );
  });

  return runWithTenant(1, async () => {
    const permKeys = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));
    await prisma.permission.createMany({
      data: permKeys.map((key) => ({ key })),
      skipDuplicates: true,
    });

    const roleIds = new Map<RoleName, number>();
    for (const name of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
      const role = await prisma.role.create({ data: { name } });
      roleIds.set(name, role.id);
    }

    const pune = await prisma.location.create({ data: { code: 'PUN', name: 'Pune', city: 'Pune' } });
    const hyd = await prisma.location.create({
      data: { code: 'HYD', name: 'Hyderabad', city: 'Hyderabad' },
    });
    const category = await prisma.assetCategory.create({ data: { code: 'LAP', name: 'Laptop' } });
    await prisma.assetCategory.createMany({
      data: [
        { code: 'MON', name: 'Monitor' },
        { code: 'MOU', name: 'Mouse' },
        { code: 'HDS', name: 'Headset' },
      ],
    });
    const department = await prisma.department.create({ data: { name: 'Engineering' } });

    const manager = await prisma.employee.create({
      data: {
        employeeCode: 'EMP-M001',
        firstName: 'Meena',
        lastName: 'Manager',
        email: 'meena.manager@newvision.local',
        locationId: pune.id,
        departmentId: department.id,
      },
    });
    const empA = await prisma.employee.create({
      data: {
        employeeCode: 'EMP-00001',
        firstName: 'Asha',
        lastName: 'Apte',
        email: 'asha.apte@newvision.local',
        locationId: pune.id,
        departmentId: department.id,
        managerId: manager.id,
        dateJoined: new Date('2024-01-15T00:00:00.000Z'),
      },
    });
    const empB = await prisma.employee.create({
      data: {
        employeeCode: 'EMP-00002',
        firstName: 'Bala',
        lastName: 'Bose',
        email: 'bala.bose@newvision.local',
        locationId: hyd.id,
        departmentId: department.id,
      },
    });

    const itEmp = await prisma.employee.create({
      data: {
        employeeCode: 'EMP-ITADM',
        firstName: 'Ishan',
        lastName: 'Admin',
        email: 'itadmin@newvision.local',
        locationId: pune.id,
        departmentId: department.id,
      },
    });
    const superEmp = await prisma.employee.create({
      data: {
        employeeCode: 'EMP-SADM',
        firstName: 'Sara',
        lastName: 'Admin',
        email: 'superadmin@newvision.local',
        locationId: pune.id,
        departmentId: department.id,
      },
    });
    const supportEmp = await prisma.employee.create({
      data: {
        employeeCode: 'EMP-ITSUP',
        firstName: 'Sunil',
        lastName: 'Support',
        email: 'support@newvision.local',
        locationId: pune.id,
        departmentId: department.id,
      },
    });

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userDefs: { email: string; role: RoleName; employeeId: number | null }[] = [
      { email: 'superadmin@newvision.local', role: RoleName.SUPER_ADMIN, employeeId: superEmp.id },
      { email: 'itadmin@newvision.local', role: RoleName.IT_ADMIN, employeeId: itEmp.id },
      { email: 'support@newvision.local', role: RoleName.IT_SUPPORT, employeeId: supportEmp.id },
      { email: 'manager@newvision.local', role: RoleName.MANAGER, employeeId: manager.id },
      { email: 'employee@newvision.local', role: RoleName.EMPLOYEE, employeeId: empA.id },
    ];
    for (const u of userDefs) {
      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash,
          fullName: u.email,
          roleId: roleIds.get(u.role)!,
          employeeId: u.employeeId,
        },
      });
    }

    await prisma.ticketCategory.createMany({
      data: [
        { code: 'software', name: 'Software', defaultPriority: 'medium' },
        { code: 'network', name: 'Network', defaultPriority: 'high' },
        { code: 'access_account', name: 'Access & Account', defaultPriority: 'high' },
        { code: 'hardware_other', name: 'Hardware-other', defaultPriority: 'medium' },
        { code: 'general', name: 'General', defaultPriority: 'low' },
      ],
    });

    await prisma.approvalMatrixRule.createMany({
      data: [
        { minAmount: 0, role: RoleName.IT_ADMIN, level: 1, kind: 'required', routing: 'parallel' },
        { minAmount: 50000, role: RoleName.SUPER_ADMIN, level: 2, kind: 'required', routing: 'parallel' },
      ],
    });

    return {
      locationPune: pune.id,
      locationHyd: hyd.id,
      categoryLap: category.id,
      department: department.id,
      employeeA: empA.id,
      employeeB: empB.id,
      managerEmployee: manager.id,
    };
  });
}

export async function login(
  app: INestApplication,
  email: string,
  password = DEMO_PASSWORD,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body.access_token as string;
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
