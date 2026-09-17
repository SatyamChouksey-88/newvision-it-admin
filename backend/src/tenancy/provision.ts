import { PrismaClient, RoleName } from '@prisma/client';
import { ROLE_PERMISSIONS } from '../common/rbac/permissions';
import { runUnscoped, runWithTenant } from './context';
import { emptyOnboarding, slugify, TEAM_MODULES, TRIAL_DAYS } from './plans';
import { loadSampleCompany } from './sample-company';

type Db = PrismaClient;

export async function ensureRoles(prisma: Db): Promise<void> {
  await runUnscoped(async () => {
    const permKeys = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));
    const existing = await prisma.permission.findMany({ select: { key: true } });
    const have = new Set(existing.map((p) => p.key));
    const missing = permKeys.filter((k) => !have.has(k));
    if (missing.length) await prisma.permission.createMany({ data: missing.map((key) => ({ key })) });
    for (const name of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
      const found = await prisma.role.findUnique({ where: { name } });
      if (!found) await prisma.role.create({ data: { name } });
    }
  });
}

async function uniqueSlug(prisma: Db, base: string): Promise<string> {
  return runUnscoped(async () => {
    let slug = base;
    let n = 2;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    return slug;
  });
}

export async function seedStarterCatalog(prisma: Db): Promise<void> {
  const ticketCount = await prisma.ticketCategory.count();
  if (ticketCount === 0) {
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
  }
  const catCount = await prisma.assetCategory.count();
  if (catCount === 0) {
    await prisma.assetCategory.createMany({
      data: [
        { code: 'LAP', name: 'Laptop' },
        { code: 'MON', name: 'Monitor' },
        { code: 'DES', name: 'Desktop' },
        { code: 'PHN', name: 'Phone' },
        { code: 'TAB', name: 'Tablet' },
        { code: 'PRN', name: 'Printer' },
        { code: 'NET', name: 'Network Device' },
        { code: 'SRV', name: 'Server' },
        { code: 'MOU', name: 'Mouse' },
        { code: 'KEY', name: 'Keyboard' },
        { code: 'HDS', name: 'Headset' },
        { code: 'CAM', name: 'Webcam' },
        { code: 'DOCK', name: 'Dock' },
      ],
    });
  } else {
    const extra = [
      { code: 'MOU', name: 'Mouse' },
      { code: 'KEY', name: 'Keyboard' },
      { code: 'HDS', name: 'Headset' },
      { code: 'CAM', name: 'Webcam' },
      { code: 'DOCK', name: 'Dock' },
    ];
    for (const c of extra) {
      const exists = await prisma.assetCategory.findFirst({ where: { code: c.code } });
      if (!exists) await prisma.assetCategory.create({ data: c });
    }
  }
  const rules = await prisma.approvalMatrixRule.count();
  if (rules === 0) {
    await prisma.approvalMatrixRule.createMany({
      data: [
        { minAmount: 0, role: RoleName.IT_ADMIN, level: 1, kind: 'required', routing: 'parallel' },
        {
          minAmount: 50000,
          role: RoleName.SUPER_ADMIN,
          level: 2,
          kind: 'required',
          routing: 'parallel',
        },
      ],
    });
  }
}

export async function provisionTenant(
  prisma: Db,
  input: {
    companyName: string;
    email: string;
    fullName: string;
    passwordHash: string;
    loadSample?: boolean;
  },
) {
  await ensureRoles(prisma);
  const slug = await uniqueSlug(prisma, slugify(input.companyName));
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const tenant = await runUnscoped(() =>
    prisma.tenant.create({
      data: {
        slug,
        name: input.companyName,
        plan: 'team',
        status: 'trial',
        trialEndsAt,
        modules: TEAM_MODULES,
        onboarding: emptyOnboarding(),
        mailFromName: `${input.companyName} IT`,
        seatCap: 10,
      },
    }),
  );

  return runWithTenant(tenant.id, async () => {
    await seedStarterCatalog(prisma);
    const role = await runUnscoped(() =>
      prisma.role.findUnique({ where: { name: RoleName.SUPER_ADMIN } }),
    );
    if (!role) throw new Error('SUPER_ADMIN role missing');
    const user = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        roleId: role.id,
      },
      include: { role: true, tenant: true, employee: { select: { locationId: true } } },
    });
    if (input.loadSample) {
      await loadSampleCompany(prisma, { adminUserId: user.id });
    }
    return { tenant, user };
  });
}
