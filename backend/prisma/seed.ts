/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AssetCondition,
  AssetStatus,
  MaintenanceStatus,
  PrismaClient,
  RoleName,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ROLE_PERMISSIONS } from '../src/common/rbac/permissions';
import { ACCOUNT_LOCKOUT_TEMPLATE, RESET_COMPLETED_MACRO } from '../src/tickets/account-playbook';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const DEMO_TENANT_ID = 1;

function injectTenantId(data: unknown, tenantId: number): unknown {
  if (Array.isArray(data)) return data.map((row) => injectTenantId(row, tenantId));
  if (data && typeof data === 'object') {
    const row = { ...(data as Record<string, unknown>) };
    const isRelationOp = 'connect' in row || 'connectOrCreate' in row || 'disconnect' in row;
    if (!isRelationOp && row.tenantId == null) row.tenantId = tenantId;
    for (const key of Object.keys(row)) {
      const value = row[key];
      if (!value || typeof value !== 'object') continue;
      const nested = value as Record<string, unknown>;
      if ('create' in nested) {
        row[key] = { ...nested, create: injectTenantId(nested.create, tenantId) };
      }
      if ('createMany' in nested && nested.createMany && typeof nested.createMany === 'object') {
        const createMany = nested.createMany as { data?: unknown };
        row[key] = {
          ...nested,
          createMany: { ...createMany, data: injectTenantId(createMany.data, tenantId) },
        };
      }
    }
    return row;
  }
  return data;
}

const GLOBAL_MODELS = new Set(['Role', 'Permission', 'Tenant']);
const prisma = new PrismaClient({ adapter }).$extends({
  name: 'seed-tenant-default',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (GLOBAL_MODELS.has(model)) return query(args);
        if (operation === 'create' || operation === 'createMany') {
          const next = { ...(args as Record<string, unknown>) };
          next.data = injectTenantId(next.data, DEMO_TENANT_ID);
          return query(next);
        }
        if (operation === 'upsert') {
          const next = { ...(args as Record<string, unknown>) };
          next.create = injectTenantId(next.create, DEMO_TENANT_ID);
          return query(next);
        }
        return query(args);
      },
    },
  },
}) as PrismaClient;

const DEMO_PASSWORD = 'Password123!';

// ---- deterministic-ish helpers ----
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const _chance = (p: number) => Math.random() < p;
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const FIRST_NAMES = [
  'Aarav',
  'Vivaan',
  'Aditya',
  'Vihaan',
  'Arjun',
  'Sai',
  'Reyansh',
  'Krishna',
  'Ishaan',
  'Rohan',
  'Priya',
  'Ananya',
  'Diya',
  'Aadhya',
  'Saanvi',
  'Isha',
  'Riya',
  'Meera',
  'Kavya',
  'Nisha',
  'Rahul',
  'Amit',
  'Neha',
  'Pooja',
  'Sneha',
  'Karan',
  'Vikram',
  'Suresh',
  'Anjali',
  'Deepak',
  'Manish',
  'Shreya',
  'Rakesh',
  'Sunita',
  'Farhan',
  'Zoya',
  'Kabir',
  'Tara',
  'Nikhil',
  'Divya',
];
const LAST_NAMES = [
  'Sharma',
  'Verma',
  'Patel',
  'Reddy',
  'Rao',
  'Iyer',
  'Nair',
  'Gupta',
  'Mehta',
  'Joshi',
  'Kulkarni',
  'Deshmukh',
  'Chauhan',
  'Malhotra',
  'Kapoor',
  'Bose',
  'Das',
  'Mukherjee',
  'Naidu',
  'Pillai',
];

const DEPARTMENTS = [
  'Information Technology',
  'Finance',
  'Human Resources',
  'Sales',
  'Engineering',
  'Operations',
  'Marketing',
  'Customer Support',
];

const LOCATIONS = [
  { code: 'PUN', name: 'Pune Office', city: 'Pune', headcount: 500, assets: 520 },
  { code: 'HYD', name: 'Hyderabad Office', city: 'Hyderabad', headcount: 450, assets: 470 },
  { code: 'BHO', name: 'Bhopal Office', city: 'Bhopal', headcount: 230, assets: 260 },
];

const CATEGORIES = [
  {
    code: 'LAP',
    name: 'Laptop',
    weight: 40,
    brands: ['Dell', 'HP', 'Lenovo', 'Apple'],
    cost: [45000, 120000],
  },
  {
    code: 'DES',
    name: 'Desktop',
    weight: 15,
    brands: ['Dell', 'HP', 'Lenovo'],
    cost: [35000, 80000],
  },
  {
    code: 'MON',
    name: 'Monitor',
    weight: 20,
    brands: ['Dell', 'LG', 'Samsung', 'BenQ'],
    cost: [9000, 35000],
  },
  {
    code: 'PRN',
    name: 'Printer',
    weight: 5,
    brands: ['HP', 'Canon', 'Epson'],
    cost: [12000, 60000],
  },
  {
    code: 'PHN',
    name: 'Phone',
    weight: 8,
    brands: ['Apple', 'Samsung', 'OnePlus'],
    cost: [15000, 90000],
  },
  {
    code: 'TAB',
    name: 'Tablet',
    weight: 4,
    brands: ['Apple', 'Samsung', 'Lenovo'],
    cost: [20000, 80000],
  },
  {
    code: 'NET',
    name: 'Network Device',
    weight: 4,
    brands: ['Cisco', 'Netgear', 'TP-Link'],
    cost: [8000, 150000],
  },
  { code: 'SRV', name: 'Server', weight: 4, brands: ['Dell', 'HP'], cost: [200000, 800000] },
  { code: 'MOU', name: 'Mouse', weight: 0, brands: ['Logitech'], cost: [800, 4500] },
  { code: 'KEY', name: 'Keyboard', weight: 0, brands: ['Logitech', 'Dell'], cost: [800, 6000] },
  { code: 'HDS', name: 'Headset', weight: 0, brands: ['Jabra', 'Logitech'], cost: [2000, 12000] },
  { code: 'CAM', name: 'Webcam', weight: 0, brands: ['Logitech'], cost: [1500, 8000] },
  { code: 'DOCK', name: 'Dock', weight: 0, brands: ['Dell', 'Lenovo'], cost: [4000, 18000] },
];

const MODELS_BY_CATEGORY: Record<string, Record<string, string[]>> = {
  LAP: {
    Dell: ['Latitude 5440', 'Latitude 5540', 'XPS 13 9315'],
    HP: ['EliteBook 840 G10', 'ProBook 450 G10'],
    Lenovo: ['ThinkPad T14 Gen 4', 'ThinkPad X1 Carbon'],
    Apple: ['MacBook Air 13 M3', 'MacBook Pro 14 M3'],
  },
  DES: {
    Dell: ['OptiPlex 7010', 'OptiPlex 5090'],
    HP: ['EliteDesk 800 G9', 'ProDesk 400 G9'],
    Lenovo: ['ThinkCentre M70q', 'ThinkCentre M90a'],
  },
  MON: {
    Dell: ['P2422H', 'U2723QE'],
    LG: ['24MK430H', '27UP850'],
    Samsung: ['S27C390', 'Odyssey G5'],
    BenQ: ['GW2480', 'PD2705U'],
  },
  PRN: {
    HP: ['LaserJet Pro M404', 'OfficeJet Pro 9015'],
    Canon: ['imageCLASS MF445dw', 'PIXMA G3270'],
    Epson: ['EcoTank L3250', 'WorkForce Pro'],
  },
  PHN: {
    Apple: ['iPhone 15', 'iPhone 14'],
    Samsung: ['Galaxy S24', 'Galaxy A55'],
    OnePlus: ['12R', 'Nord 4'],
  },
  TAB: {
    Apple: ['iPad 10th gen', 'iPad Air'],
    Samsung: ['Galaxy Tab S9', 'Galaxy Tab A9'],
    Lenovo: ['Tab P12', 'Tab M10'],
  },
  NET: {
    Cisco: ['Catalyst 9200', 'Meraki MX68'],
    Netgear: ['GS308', 'Orbi RBK752'],
    'TP-Link': ['TL-SG108', 'Archer AX55'],
  },
  SRV: {
    Dell: ['PowerEdge R660', 'PowerEdge T350'],
    HP: ['ProLiant DL360', 'ProLiant ML350'],
  },
};

function brandAndModel(cat: (typeof CATEGORIES)[number]) {
  const brand = pick(cat.brands);
  const models = MODELS_BY_CATEGORY[cat.code]?.[brand];
  return { brand, model: models?.length ? pick(models) : `${brand} ${cat.name}` };
}

const VENDORS = [
  'Computech Solutions',
  'Rashi Peripherals',
  'Ingram Micro',
  'Redington India',
  'Savex Technologies',
];

function weightedCategory(): (typeof CATEGORIES)[number] {
  const total = CATEGORIES.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of CATEGORIES) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return CATEGORIES[0];
}

function weightedStatus(): AssetStatus {
  const roll = Math.random();
  if (roll < 0.6) return AssetStatus.assigned;
  if (roll < 0.82) return AssetStatus.available;
  if (roll < 0.88) return AssetStatus.under_repair;
  if (roll < 0.93) return AssetStatus.pending_assignment;
  if (roll < 0.97) return AssetStatus.retired;
  if (roll < 0.99) return AssetStatus.damaged;
  return AssetStatus.lost;
}

async function seedRolesAndPermissions() {
  const permKeys = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));
  await prisma.permission.createMany({ data: permKeys.map((key) => ({ key })), skipDuplicates: true });
  const permissions = await prisma.permission.findMany();
  const permById = new Map(permissions.map((p) => [p.key, p.id]));
  const roleIds = new Map<RoleName, number>();
  for (const roleName of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
    const existing = await prisma.role.findUnique({ where: { name: roleName } });
    if (existing) {
      roleIds.set(roleName, existing.id);
      continue;
    }
    const role = await prisma.role.create({
      data: {
        name: roleName,
        description: `${roleName} role`,
        permissions: {
          connect: ROLE_PERMISSIONS[roleName].map((k) => ({ id: permById.get(k)! })),
        },
      },
    });
    roleIds.set(roleName, role.id);
  }
  return roleIds;
}

/** Empty production database: one Super Admin, no demo estate. */
async function bootstrapProductionAdmin() {
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
    update: {},
  });
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Super Admin';
  if (!email || !password) {
    throw new Error('SEED_MODE=bootstrap requires BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD');
  }
  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters');
  }
  const roleIds = await seedRolesAndPermissions();
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      fullName: name,
      roleId: roleIds.get(RoleName.SUPER_ADMIN)!,
    },
  });
  console.log(`Bootstrapped Super Admin ${user.email} (id ${user.id}). Change this password after first login.`);
}

async function main() {
  if (process.env.SEED_IF_EMPTY === 'true') {
    const existing = await prisma.user.count();
    if (existing > 0) {
      console.log(`Skipping seed (SEED_IF_EMPTY=true, ${existing} users already exist).`);
      return;
    }
  }

  // Temporarily skip production bootstrap so demo accounts stay the login path.
  // if (process.env.SEED_MODE === 'bootstrap') {
  //   console.log('Production bootstrap (roles + first Super Admin, no demo estate)...');
  //   await bootstrapProductionAdmin();
  //   return;
  // }

  console.log('Resetting demo data...');
  // Delete in dependency order (append-only audit is cleared only for seeding convenience).
  await prisma.procurementHandoff.deleteMany();
  await prisma.asset.updateMany({
    data: { vendorId: null, purchaseOrderId: null, goodsReceiptId: null },
  });
  await prisma.procurementAttachment.deleteMany();
  await prisma.procurementActivityLog.deleteMany();
  await prisma.vendorScorecard.deleteMany();
  await prisma.vendorContractAsset.deleteMany();
  await prisma.vendorInvoice.deleteMany();
  await prisma.goodsReceiptLine.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.purchaseOrderAmendment.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.requisitionApprover.deleteMany();
  await prisma.requisitionQuote.deleteMany();
  await prisma.requisitionLineItem.deleteMany();
  await prisma.purchaseRequisitionLocation.deleteMany();
  await prisma.purchaseRequisition.deleteMany();
  await prisma.vendorComplianceDoc.deleteMany();
  await prisma.vendorContact.deleteMany();
  await prisma.vendorStatusChange.deleteMany();
  await prisma.vendorContract.deleteMany();
  await prisma.approvalMatrixRule.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.consumableIssue.deleteMany();
  await prisma.accessoryCheckout.deleteMany();
  await prisma.issueKitAccessory.deleteMany();
  await prisma.issueKit.deleteMany();
  await prisma.consumable.deleteMany();
  await prisma.accessory.deleteMany();
  await prisma.assetRequest.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.reconciliationRun.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.savedView.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticketTimeLog.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticketWatcher.deleteMany();
  await prisma.recordNote.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.cannedResponse.deleteMany();
  await prisma.ticketTemplate.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.ticketPriorityTarget.deleteMany();
  await prisma.assetMaintenance.deleteMany();
  await prisma.assetTransfer.deleteMany();
  await prisma.assetAssignment.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.employeeChecklist.deleteMany();
  // Chat (Prompt 24) references User without cascade on authorId/createdById — messages and
  // channels must go before users or a reseed on any DB with chat activity throws P2003.
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.department.deleteMany();
  await prisma.location.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

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
    update: {},
  });

  // ---- roles + permissions ----
  console.log('Seeding roles & permissions...');
  const permKeys = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));
  await prisma.permission.createMany({ data: permKeys.map((key) => ({ key })) });
  const permissions = await prisma.permission.findMany();
  const permById = new Map(permissions.map((p) => [p.key, p.id]));

  const roleIds = new Map<RoleName, number>();
  for (const roleName of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
    const role = await prisma.role.create({
      data: {
        name: roleName,
        description: `${roleName} role`,
        permissions: {
          connect: ROLE_PERMISSIONS[roleName].map((k) => ({ id: permById.get(k)! })),
        },
      },
    });
    roleIds.set(roleName, role.id);
  }

  // ---- locations ----
  console.log('Seeding locations...');
  const locationIds = new Map<string, number>();
  for (const l of LOCATIONS) {
    const loc = await prisma.location.create({
      data: { code: l.code, name: l.name, city: l.city, address: `${l.city}, India` },
    });
    locationIds.set(l.code, loc.id);
  }

  // ---- departments ----
  console.log('Seeding departments...');
  const departments = await Promise.all(
    DEPARTMENTS.map((name) => prisma.department.create({ data: { name } })),
  );

  // ---- categories ----
  console.log('Seeding asset categories...');
  const categoryIds = new Map<string, number>();
  for (const c of CATEGORIES) {
    const cat = await prisma.assetCategory.create({ data: { code: c.code, name: c.name } });
    categoryIds.set(c.code, cat.id);
  }

  // ---- employees ----
  console.log('Seeding employees...');
  let empSeq = 1;
  const employeeData: {
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    designation: string;
    locationId: number;
    departmentId: number;
    locationCode: string;
  }[] = [];
  for (const l of LOCATIONS) {
    for (let i = 0; i < l.headcount; i++) {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const code = `EMP-${String(empSeq).padStart(5, '0')}`;
      employeeData.push({
        employeeCode: code,
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}.${empSeq}@newvision.local`,
        designation: pick([
          'Engineer',
          'Senior Engineer',
          'Analyst',
          'Lead',
          'Manager',
          'Executive',
          'Associate',
        ]),
        locationId: locationIds.get(l.code)!,
        departmentId: pick(departments).id,
        locationCode: l.code,
      });
      empSeq++;
    }
  }
  // batch insert
  for (let i = 0; i < employeeData.length; i += 500) {
    const batch = employeeData.slice(i, i + 500).map((e) => ({
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      designation: e.designation,
      locationId: e.locationId,
      departmentId: e.departmentId,
      dateJoined: daysFromNow(-randInt(30, 2000)),
    }));
    await prisma.employee.createMany({ data: batch });
  }
  const employees = await prisma.employee.findMany({
    select: { id: true, locationId: true, employeeCode: true },
  });
  const contractor = employees.find((e) => e.employeeCode === 'EMP-00002') ?? employees[1];
  if (contractor) {
    await prisma.employee.update({
      where: { id: contractor.id },
      data: { employmentType: 'contract', contractEndDate: daysFromNow(8) },
    });
  }
  const checklistHost = employees.find((e) => e.employeeCode === 'EMP-00001') ?? employees[0];
  if (checklistHost) {
    await prisma.employeeChecklist.create({
      data: {
        employeeId: checklistHost.id,
        kind: 'onboard',
        status: 'in_progress',
        items: {
          create: [
            { label: 'Issue kit (laptop + charger + mouse)', sortOrder: 0, done: true, doneAt: new Date() },
            { label: 'Create login', sortOrder: 1, done: false },
            { label: 'VPN / MFA', sortOrder: 2, done: false },
            { label: 'ID badge', sortOrder: 3, done: false },
            { label: 'Signed handover', sortOrder: 4, done: false },
          ],
        },
      },
    });
  }
  const employeesByLocation = new Map<number, typeof employees>();
  for (const e of employees) {
    const list = employeesByLocation.get(e.locationId) ?? [];
    list.push(e);
    employeesByLocation.set(e.locationId, list);
  }

  // Promote ~1 in 15 employees to managers within their location.
  const managerIds: number[] = [];
  for (const [locId, list] of employeesByLocation) {
    const managerCount = Math.max(1, Math.floor(list.length / 15));
    const managers = list.slice(0, managerCount);
    managerIds.push(...managers.map((m) => m.id));
    const reports = list.slice(managerCount);
    for (const r of reports) {
      await prisma.employee.update({
        where: { id: r.id },
        data: { managerId: pick(managers).id },
      });
    }
    void locId;
  }

  const itDept = departments.find((d) => d.name === 'Information Technology') ?? departments[0];
  const saraEmployee = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-SARA',
      firstName: 'Sara',
      lastName: 'Admin',
      email: 'superadmin@newvision.local',
      locationId: locationIds.get('PUN')!,
      departmentId: itDept.id,
      designation: 'Head of IT',
    },
  });
  const itAdminEmployee = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-ITADM',
      firstName: 'Ishan',
      lastName: 'IT',
      email: 'itadmin@newvision.local',
      locationId: locationIds.get('PUN')!,
      departmentId: itDept.id,
      designation: 'IT Administrator',
    },
  });
  const supportEmployee = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-ITSUP',
      firstName: 'Sunil',
      lastName: 'Support',
      email: 'support@newvision.local',
      locationId: locationIds.get('PUN')!,
      departmentId: itDept.id,
      designation: 'IT Support',
    },
  });

  // ---- users (one per role) ----
  console.log('Seeding demo users...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const managerEmployee = await prisma.employee.findFirst({ where: { id: managerIds[0] } });
  const plainEmployee = employees[employees.length - 1];
  if (managerEmployee) {
    await prisma.employee.update({
      where: { id: managerEmployee.id },
      data: {
        firstName: 'Manish',
        lastName: 'Manager',
        email: 'manager@newvision.local',
        employeeCode: 'EMP-MGR01',
        designation: 'Engineering Manager',
        departmentId: itDept.id,
      },
    });
  }
  if (plainEmployee && managerEmployee) {
    await prisma.employee.update({
      where: { id: plainEmployee.id },
      data: {
        firstName: 'Esha',
        lastName: 'Employee',
        email: 'employee@newvision.local',
        employeeCode: 'EMP-ESHA',
        designation: 'Engineer',
        managerId: managerEmployee.id,
        locationId: locationIds.get('PUN')!,
        dateJoined: daysFromNow(-90),
      },
    });
  }
  const users = [
    {
      email: 'superadmin@newvision.local',
      fullName: 'Sara Admin',
      role: RoleName.SUPER_ADMIN,
      employeeId: saraEmployee.id,
    },
    {
      email: 'itadmin@newvision.local',
      fullName: 'Ishan IT Admin',
      role: RoleName.IT_ADMIN,
      employeeId: itAdminEmployee.id,
    },
    {
      email: 'support@newvision.local',
      fullName: 'Sunil Support',
      role: RoleName.IT_SUPPORT,
      employeeId: supportEmployee.id,
    },
    {
      email: 'manager@newvision.local',
      fullName: 'Manish Manager',
      role: RoleName.MANAGER,
      employeeId: managerEmployee?.id ?? null,
    },
    {
      email: 'employee@newvision.local',
      fullName: 'Esha Employee',
      role: RoleName.EMPLOYEE,
      employeeId: plainEmployee?.id ?? null,
    },
  ];
  let itAdminId: number | null = null;
  for (const u of users) {
    const created = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        roleId: roleIds.get(u.role)!,
        employeeId: u.employeeId,
      },
    });
    if (u.email === 'itadmin@newvision.local') itAdminId = created.id;
  }

  // ---- saved filter views (Phase 3) ----
  if (itAdminId) {
    await prisma.savedView.createMany({
      data: [
        {
          name: 'Available in Pune',
          resource: 'assets',
          filters: { status: 'available', locationId: locationIds.get('PUN') },
          isShared: true,
          createdById: itAdminId,
        },
        {
          name: 'Under repair',
          resource: 'assets',
          filters: { status: 'under_repair' },
          isShared: true,
          createdById: itAdminId,
        },
        {
          name: 'Monitors',
          resource: 'assets',
          filters: { categoryId: categoryIds.get('MON') },
          isShared: true,
          createdById: itAdminId,
        },
        {
          name: 'Phones',
          resource: 'assets',
          filters: { categoryId: categoryIds.get('PHN') },
          isShared: true,
          createdById: itAdminId,
        },
      ],
    });
  }

  // ---- assets ----
  console.log('Seeding assets...');
  const seqCounters = new Map<string, number>(); // key: LOC-CAT
  const assetRows: {
    assetCode: string;
    categoryId: number;
    locationId: number;
    departmentId: number | null;
    brand: string;
    model: string;
    serialNumber: string;
    purchaseDate: Date;
    purchaseCost: number;
    warrantyStart: Date;
    warrantyEnd: Date;
    condition: AssetCondition;
    vendor: string;
    invoiceNo: string;
    status: AssetStatus;
    assignedEmployeeId: number | null;
    createdAt: Date;
  }[] = [];

  let serialSeq = 1;
  for (const l of LOCATIONS) {
    const locId = locationIds.get(l.code)!;
    const locEmployees = employeesByLocation.get(locId) ?? [];
    for (let i = 0; i < l.assets; i++) {
      const cat = weightedCategory();
      const key = `${l.code}-${cat.code}`;
      const seq = (seqCounters.get(key) ?? 0) + 1;
      seqCounters.set(key, seq);

      const purchase = daysFromNow(-randInt(30, 1600));
      const warrantyYears = pick([1, 2, 3]);
      const warrantyEnd = new Date(purchase);
      warrantyEnd.setFullYear(warrantyEnd.getFullYear() + warrantyYears);

      let status = weightedStatus();
      let assignedEmployeeId: number | null = null;
      if (status === AssetStatus.assigned && locEmployees.length > 0) {
        assignedEmployeeId = pick(locEmployees).id;
      } else if (status === AssetStatus.assigned) {
        status = AssetStatus.available;
      }

      const { brand, model } = brandAndModel(cat);
      assetRows.push({
        assetCode: `AST-${l.code}-${cat.code}-${String(seq).padStart(4, '0')}`,
        categoryId: categoryIds.get(cat.code)!,
        locationId: locId,
        departmentId: pick(departments).id,
        brand,
        model,
        serialNumber: `SN${l.code}${String(serialSeq).padStart(6, '0')}`,
        purchaseDate: purchase,
        purchaseCost: randInt(cat.cost[0], cat.cost[1]),
        warrantyStart: purchase,
        warrantyEnd,
        condition: pick([
          AssetCondition.new,
          AssetCondition.good,
          AssetCondition.good,
          AssetCondition.fair,
          AssetCondition.poor,
        ]),
        vendor: pick(VENDORS),
        invoiceNo: `INV-${purchase.getFullYear()}-${randInt(10000, 99999)}`,
        status,
        assignedEmployeeId,
        createdAt: purchase,
      });
      serialSeq++;
    }
  }

  for (let i = 0; i < assetRows.length; i += 500) {
    await prisma.asset.createMany({ data: assetRows.slice(i, i + 500) });
  }
  console.log(`  ${assetRows.length} assets created.`);

  // ---- assignment history for assigned assets ----
  console.log('Seeding assignment history...');
  const assignedAssets = await prisma.asset.findMany({
    where: { status: AssetStatus.assigned, assignedEmployeeId: { not: null } },
    select: { id: true, assignedEmployeeId: true },
  });
  for (let i = 0; i < assignedAssets.length; i += 500) {
    await prisma.assetAssignment.createMany({
      data: assignedAssets.slice(i, i + 500).map((a) => ({
        assetId: a.id,
        employeeId: a.assignedEmployeeId!,
        assignedAt: daysFromNow(-randInt(1, 600)),
      })),
    });
  }

  // ---- maintenance records for under_repair assets ----
  console.log('Seeding maintenance records...');
  const repairAssets = await prisma.asset.findMany({
    where: { status: AssetStatus.under_repair },
    select: { id: true },
  });
  const issues = [
    'Screen flickering',
    'Battery not charging',
    'Keyboard keys not working',
    'Overheating',
    'Boot failure',
    'Hard disk failure',
    'Fan noise',
    'Port damage',
  ];
  for (const a of repairAssets) {
    const roll = Math.random();
    let status: MaintenanceStatus = MaintenanceStatus.under_repair;
    let completedAt: Date | null = null;
    let actualCost: number | null = null;
    if (roll < 0.2) {
      status = MaintenanceStatus.reported;
    } else if (roll < 0.55) {
      status = MaintenanceStatus.under_repair;
    } else if (roll < 0.85) {
      status = MaintenanceStatus.repaired;
      completedAt = daysFromNow(-randInt(1, 20));
      actualCost = randInt(800, 18000);
      await prisma.asset.update({
        where: { id: a.id },
        data: { status: AssetStatus.available },
      });
    } else {
      status = MaintenanceStatus.reassigned;
      completedAt = daysFromNow(-randInt(1, 15));
      actualCost = randInt(800, 18000);
      await prisma.asset.update({
        where: { id: a.id },
        data: { status: AssetStatus.assigned },
      });
    }
    await prisma.assetMaintenance.create({
      data: {
        assetId: a.id,
        issue: pick(issues),
        status,
        vendor: pick(VENDORS),
        estimatedCost: randInt(1500, 20000),
        actualCost,
        reportedAt: daysFromNow(-randInt(1, 40)),
        expectedCompletionDate: daysFromNow(status === MaintenanceStatus.under_repair ? randInt(2, 20) : -randInt(1, 10)),
        completedAt,
      },
    });
  }

  // ---- a few audit log rows so the viewer has content ----
  console.log('Seeding sample audit log entries...');
  const superAdmin = await prisma.user.findFirst({
    where: { email: 'superadmin@newvision.local' },
  });
  const sampleAssets = await prisma.asset.findMany({
    take: 20,
    select: { id: true, assetCode: true },
  });
  await prisma.auditLog.createMany({
    data: sampleAssets.map((a) => ({
      entityType: 'Asset',
      entityId: String(a.id),
      action: 'create' as const,
      summary: `Created asset ${a.assetCode} (seed)`,
      changedById: superAdmin?.id ?? null,
    })),
  });

  // ---- warranty notifications sample ----
  const soonExpiring = await prisma.asset.findMany({
    where: { warrantyEnd: { gte: new Date(), lte: daysFromNow(30) } },
    take: 10,
    select: { id: true, assetCode: true },
  });
  await prisma.notification.createMany({
    data: soonExpiring.flatMap((a) =>
      [superAdmin?.id, itAdminId].filter((id): id is number => Boolean(id)).map((userId) => ({
        type: 'warranty_expiry' as const,
        title: 'Warranty expiring soon',
        message: `Asset ${a.assetCode} warranty expires within 30 days`,
        assetId: a.id,
        userId,
      })),
    ),
  });

  // ---- accessories & consumables (Prompt 6; per-location stock added Prompt 20) ----
  console.log('Seeding accessories & consumables...');
  const punId = locationIds.get('PUN');
  const hydId = locationIds.get('HYD');
  const bhoId = locationIds.get('BHO');
  const accMouse = await prisma.accessory.create({
    data: {
      name: 'Wireless Mouse',
      category: 'Peripherals',
      brand: 'Logitech',
      model: 'M185',
      quantityTotal: 120,
      quantityCheckedOut: 45,
      locationId: punId,
      lowStockThreshold: 15,
    },
  });
  const accCharger = await prisma.accessory.create({
    data: {
      name: 'USB-C Charger 65W',
      category: 'Power',
      brand: 'Dell',
      model: '65W',
      quantityTotal: 80,
      quantityCheckedOut: 32,
      locationId: punId,
      lowStockThreshold: 10,
    },
  });
  await prisma.accessory.createMany({
    data: [
      { name: 'Laptop Docking Station', category: 'Peripherals', quantityTotal: 40, quantityCheckedOut: 28, locationId: hydId },
      { name: 'Headset USB', category: 'Audio', quantityTotal: 60, quantityCheckedOut: 22, locationId: hydId },
      { name: 'HDMI Cable 2m', category: 'Cables', quantityTotal: 200, quantityCheckedOut: 90, locationId: bhoId },
    ],
  });
  const demoEmp = plainEmployee;
  if (demoEmp) {
    await prisma.accessoryCheckout.create({
      data: {
        accessoryId: accMouse.id,
        employeeId: demoEmp.id,
        quantity: 1,
        processedById: superAdmin?.id ?? null,
      },
    });
    const kitLap = await prisma.asset.findFirst({
      where: { category: { code: 'LAP' }, status: AssetStatus.available },
    });
    const kitMon = await prisma.asset.findFirst({
      where: { category: { code: 'MON' }, status: AssetStatus.available },
    });
    for (const a of [kitLap, kitMon]) {
      if (!a) continue;
      await prisma.asset.update({
        where: { id: a.id },
        data: { status: AssetStatus.assigned, assignedEmployeeId: demoEmp.id },
      });
      await prisma.assetAssignment.create({
        data: { assetId: a.id, employeeId: demoEmp.id, assignedAt: new Date() },
      });
    }
  }
  const laptopCat = await prisma.assetCategory.findFirst({ where: { code: 'LAP' } });
  if (laptopCat && punId) {
    await prisma.issueKit.create({
      data: {
        name: 'Pune laptop standard',
        categoryId: laptopCat.id,
        locationId: punId,
        notes: 'Next available Pune laptop plus charger and mouse',
        accessories: {
          create: [{ accessoryId: accMouse.id }, { accessoryId: accCharger.id }],
        },
      },
    });
  }
  await prisma.consumable.createMany({
    data: [
      { name: 'AA Batteries (4-pack)', category: 'Power', quantityTotal: 500, quantityAvailable: 420, lowStockThreshold: 50, locationId: punId },
      { name: 'Toner Cartridge HP 85A', category: 'Printer', quantityTotal: 80, quantityAvailable: 12, lowStockThreshold: 15, locationId: punId },
      { name: 'Ethernet Patch Cable 3m', category: 'Cables', quantityTotal: 300, quantityAvailable: 180, lowStockThreshold: 40, locationId: hydId },
      { name: 'Screen Wipes (100ct)', category: 'Cleaning', quantityTotal: 150, quantityAvailable: 95, lowStockThreshold: 20, locationId: hydId },
      { name: 'USB Flash Drive 32GB', category: 'Storage', quantityTotal: 100, quantityAvailable: 8, lowStockThreshold: 10, locationId: bhoId },
    ],
  });

  // ---- support tickets (Prompt 14/15) ----
  console.log('Seeding support tickets...');
  await prisma.ticketCategory.createMany({
    data: [
      { code: 'software', name: 'Software', defaultPriority: 'medium' },
      { code: 'network', name: 'Network', defaultPriority: 'high' },
      { code: 'access_account', name: 'Access & Account', defaultPriority: 'high' },
      { code: 'hardware_other', name: 'Hardware-other', defaultPriority: 'medium' },
      { code: 'general', name: 'General', defaultPriority: 'low' },
    ],
  });
  // First-response targets (Settings — a plain number per priority, not a rules engine).
  await prisma.ticketPriorityTarget.createMany({
    data: [
      { priority: 'urgent', targetMinutes: 120 },
      { priority: 'high', targetMinutes: 480 },
      { priority: 'medium', targetMinutes: 1440 },
      { priority: 'low', targetMinutes: null },
    ],
  });
  const ticketCats = await prisma.ticketCategory.findMany();
  const catByCode = new Map(ticketCats.map((c) => [c.code, c]));
  const itAdminUser = await prisma.user.findUnique({ where: { email: 'itadmin@newvision.local' } });
  const supportUser = await prisma.user.findUnique({ where: { email: 'support@newvision.local' } });
  const requester = plainEmployee;
  if (itAdminUser && supportUser && requester) {
    await prisma.cannedResponse.createMany({
      data: [
        {
          title: 'Please restart',
          body: 'Please restart your machine and try again. Reply here if the issue remains.',
          createdById: itAdminUser.id,
          statusOnSend: 'waiting_on_employee',
        },
        {
          title: 'Network team',
          body: 'Please raise this with the network team using this ticket number so they have the full history.',
          createdById: itAdminUser.id,
        },
        {
          title: RESET_COMPLETED_MACRO.title,
          body: RESET_COMPLETED_MACRO.body,
          createdById: itAdminUser.id,
          statusOnSend: RESET_COMPLETED_MACRO.statusOnSend,
        },
      ],
    });
    await prisma.ticketTemplate.createMany({
      data: [
        {
          title: "Can't connect to VPN",
          subject: 'VPN connection failing',
          description: 'I cannot connect to the office VPN. I have tried restarting the client.',
          categoryId: catByCode.get('network')!.id,
          createdById: itAdminUser.id,
        },
        {
          title: 'Need software installed',
          subject: 'Software installation request for {{employee}}',
          description:
            'Please install the following application on {{asset}} for {{employee}}:\n\n(list the app and version)',
          categoryId: catByCode.get('software')!.id,
          createdById: itAdminUser.id,
        },
        {
          title: ACCOUNT_LOCKOUT_TEMPLATE.title,
          subject: ACCOUNT_LOCKOUT_TEMPLATE.subject,
          description: ACCOUNT_LOCKOUT_TEMPLATE.description,
          categoryId: catByCode.get('access_account')!.id,
          createdById: itAdminUser.id,
        },
      ],
    });
    const t1 = await prisma.supportTicket.create({
      data: {
        ticketNumber: 'TCK-TMP-1',
        subject: 'Outlook search not working',
        description: 'Search in Outlook returns no results since this morning.',
        categoryId: catByCode.get('software')!.id,
        priority: 'medium',
        status: 'in_progress',
        raisedById: requester.id,
        assignedToId: supportUser.id,
        locationId: requester.locationId,
      },
    });
    await prisma.supportTicket.update({
      where: { id: t1.id },
      data: { ticketNumber: `TCK-${String(t1.id).padStart(6, '0')}` },
    });
    const t2 = await prisma.supportTicket.create({
      data: {
        ticketNumber: 'TCK-TMP-2',
        subject: 'Cannot print from 4th floor',
        description: 'The shared printer on 4th floor is offline.',
        categoryId: catByCode.get('hardware_other')!.id,
        priority: 'high',
        status: 'open',
        raisedById: requester.id,
        locationId: requester.locationId,
        dueDate: daysFromNow(-1),
      },
    });
    await prisma.supportTicket.update({
      where: { id: t2.id },
      data: { ticketNumber: `TCK-${String(t2.id).padStart(6, '0')}` },
    });
    const t3 = await prisma.supportTicket.create({
      data: {
        ticketNumber: 'TCK-TMP-3',
        subject: 'Need access to shared drive',
        description: 'Please grant read access to the Finance share.',
        categoryId: catByCode.get('access_account')!.id,
        priority: 'high',
        status: 'resolved',
        raisedById: requester.id,
        assignedToId: itAdminUser.id,
        locationId: requester.locationId,
        resolvedAt: new Date(),
      },
    });
    await prisma.supportTicket.update({
      where: { id: t3.id },
      data: { ticketNumber: `TCK-${String(t3.id).padStart(6, '0')}` },
    });
    const t4 = await prisma.supportTicket.create({
      data: {
        ticketNumber: 'TCK-TMP-4',
        subject: 'Locked out — password reset',
        description: 'I am locked out of my account and need a password reset.',
        categoryId: catByCode.get('access_account')!.id,
        priority: 'high',
        status: 'open',
        raisedById: requester.id,
        locationId: requester.locationId,
      },
    });
    await prisma.supportTicket.update({
      where: { id: t4.id },
      data: { ticketNumber: `TCK-${String(t4.id).padStart(6, '0')}` },
    });
  }

  await prisma.approvalMatrixRule.createMany({
    data: [
      { minAmount: 0, role: RoleName.IT_ADMIN, level: 1, kind: 'required', routing: 'parallel' },
      { minAmount: 50000, role: RoleName.SUPER_ADMIN, level: 2, kind: 'required', routing: 'parallel' },
    ],
  });
  const msft = await prisma.vendor.create({
    data: {
      vendorCode: 'VND-000001',
      legalName: 'Microsoft Corporation',
      tradingName: 'Microsoft',
      taxId: 'GSTIN-MSFT-DEMO',
      country: 'IN',
      paymentTerms: 'Net 30',
      categories: ['Licenses/Software'],
      status: 'active',
      isPreferred: true,
      contacts: { create: [{ name: 'Licensing desk', email: 'licensing@microsoft.example', isPrimary: true }] },
    },
  });
  const dell = await prisma.vendor.create({
    data: {
      vendorCode: 'VND-000002',
      legalName: 'Dell Technologies',
      tradingName: 'Dell',
      taxId: 'GSTIN-DELL-DEMO',
      country: 'IN',
      paymentTerms: 'Net 45',
      categories: ['Hardware', 'Peripherals'],
      status: 'active',
      isPreferred: true,
    },
  });
  const repairVendors = [msft.id, dell.id];
  const jobs = await prisma.assetMaintenance.findMany({ select: { id: true } });
  for (let i = 0; i < jobs.length; i++) {
    await prisma.assetMaintenance.update({
      where: { id: jobs[i].id },
      data: { vendorId: repairVendors[i % repairVendors.length] },
    });
  }
  const end = daysFromNow(45);
  await prisma.vendorContract.create({
    data: {
      vendorId: msft.id,
      type: 'license_subscription',
      startDate: daysFromNow(-320),
      endDate: end,
      value: 273320,
      entitlementCount: 40,
      usageCount: 36,
      slaTerms: 'M365 E1 with Teams — 40 units as mutually discussed',
      autoRenew: true,
    },
  });

  const counts = {
    employees: await prisma.employee.count(),
    assets: await prisma.asset.count(),
    assigned: await prisma.asset.count({ where: { status: 'assigned' } }),
    underRepair: await prisma.asset.count({ where: { status: 'under_repair' } }),
    users: await prisma.user.count(),
  };
  console.log('Seed complete:', counts);
  console.log(`\nDemo login password for all users: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
