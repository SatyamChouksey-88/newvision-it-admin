import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { provisionTenant } from '../src/tenancy/provision';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { RbacService } from '../src/common/rbac/rbac.service';
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

const E2E_ADVISORY_LOCK_KEY = 0x4e56_5349; // "NVS" — one seed/reset at a time across all e2e apps

/** Truncate every application table on a dedicated pg client (avoids Prisma pool overlap). */
async function truncateAllTables(): Promise<void> {
  await withAdminClient(async (client) => {
    await client.query('SELECT pg_advisory_lock($1)', [E2E_ADVISORY_LOCK_KEY]);
    try {
      const tables = await client.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
      );
      if (tables.rows.length === 0) return;
      const list = tables.rows.map((r) => `"${r.tablename}"`).join(', ');
      await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [E2E_ADVISORY_LOCK_KEY]);
    }
  });
}

export async function resetDatabase(_prisma?: PrismaService): Promise<void> {
  await truncateAllTables();
}

let seedQueue: Promise<unknown> = Promise.resolve();

function enqueueSeed<T>(fn: () => Promise<T>): Promise<T> {
  const next = seedQueue.then(fn, fn);
  seedQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/**
 * Seed a small, deterministic fixture and the five role users. Returns key ids.
 * Pass `app` so {@link RbacService} reloads after TRUNCATE — otherwise the first
 * `onModuleInit` snapshot (pre-seed) leaks across specs in one Jest process.
 */
export async function seedCore(
  prisma: PrismaService,
  app?: INestApplication,
): Promise<TestContext['ids']> {
  return enqueueSeed(async () => {
    await resetDatabase(prisma);
    setTestTenant(1);

    await runUnscoped(async () => {
      await prisma.tenant.create({
        data: {
          id: 1,
          slug: 'newvision',
          name: 'NewVision Softcom',
          plan: 'team',
          status: 'active',
          modules: { procurement: true, chat: true, maintenance: true },
        },
      });
      await withAdminClient((client) =>
        client.query(
          `SELECT setval(pg_get_serial_sequence('tenants', 'id'), GREATEST(1, (SELECT MAX(id) FROM tenants)))`,
        ),
      );
    });

    const ids = await runWithTenant(1, async () => {
    const permKeys = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));
    await prisma.permission.createMany({
      data: permKeys.map((key) => ({ key })),
      skipDuplicates: true,
    });

    const permissions = await prisma.permission.findMany();
    const permByKey = new Map(permissions.map((p) => [p.key, p.id]));
    const roleIds = new Map<RoleName, number>();
    for (const name of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
      const role = await prisma.role.upsert({
        where: { name },
        create: {
          name,
          permissions: {
            connect: ROLE_PERMISSIONS[name].map((k) => ({ id: permByKey.get(k)! })),
          },
        },
        update: {
          permissions: {
            set: ROLE_PERMISSIONS[name].map((k) => ({ id: permByKey.get(k)! })),
          },
        },
      });
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
        { code: 'vdi', name: 'VDI / Client desktop', defaultPriority: 'medium' },
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

    if (app) {
      await app.get(RbacService).refreshFromDatabase();
    }

    return ids;
  });
}

/** Provision an isolated trial tenant (replaces removed `POST /auth/signup` in e2e). */
export async function provisionTrialTenant(
  app: INestApplication,
  company: string,
  email: string,
  password = 'TrialPassword1!',
): Promise<string> {
  const prisma = app.get(PrismaService);
  await provisionTenant(prisma, {
    companyName: company,
    email: email.toLowerCase(),
    fullName: 'Owner',
    passwordHash: await bcrypt.hash(password, 10),
  });
  return login(app, email, password);
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
