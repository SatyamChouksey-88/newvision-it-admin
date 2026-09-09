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

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
];

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
  if (roll < 0.8) return AssetStatus.available;
  if (roll < 0.88) return AssetStatus.under_repair;
  if (roll < 0.93) return AssetStatus.pending_assignment;
  if (roll < 0.97) return AssetStatus.retired;
  if (roll < 0.99) return AssetStatus.damaged;
  return AssetStatus.lost;
}

async function main() {
  console.log('Resetting demo data...');
  // Delete in dependency order (append-only audit is cleared only for seeding convenience).
  await prisma.consumableIssue.deleteMany();
  await prisma.accessoryCheckout.deleteMany();
  await prisma.consumable.deleteMany();
  await prisma.accessory.deleteMany();
  await prisma.assetRequest.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.reconciliationRun.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.savedView.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.assetMaintenance.deleteMany();
  await prisma.assetTransfer.deleteMany();
  await prisma.assetAssignment.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.department.deleteMany();
  await prisma.location.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

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

  // ---- users (one per role) ----
  console.log('Seeding demo users...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const managerEmployee = await prisma.employee.findFirst({ where: { id: managerIds[0] } });
  const plainEmployee = employees[employees.length - 1];
  // Demo employee must report to demo manager so request-approval e2e works.
  if (managerEmployee) {
    await prisma.employee.update({
      where: { id: plainEmployee.id },
      data: { managerId: managerEmployee.id },
    });
  }
  const users = [
    {
      email: 'superadmin@newvision.local',
      fullName: 'Sara Admin',
      role: RoleName.SUPER_ADMIN,
      employeeId: null,
    },
    {
      email: 'itadmin@newvision.local',
      fullName: 'Ishan IT Admin',
      role: RoleName.IT_ADMIN,
      employeeId: null,
    },
    {
      email: 'support@newvision.local',
      fullName: 'Sunil Support',
      role: RoleName.IT_SUPPORT,
      employeeId: null,
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

      assetRows.push({
        assetCode: `AST-${l.code}-${cat.code}-${String(seq).padStart(4, '0')}`,
        categoryId: categoryIds.get(cat.code)!,
        locationId: locId,
        departmentId: pick(departments).id,
        brand: pick(cat.brands),
        model: `${pick(cat.brands)} ${pick(['Pro', 'Air', 'Plus', 'X', 'S', 'Elite', 'G5', 'ThinkPad'])} ${randInt(10, 99)}`,
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
    await prisma.assetMaintenance.create({
      data: {
        assetId: a.id,
        issue: pick(issues),
        status: MaintenanceStatus.under_repair,
        vendor: pick(VENDORS),
        estimatedCost: randInt(1500, 20000),
        reportedAt: daysFromNow(-randInt(1, 40)),
        expectedCompletionDate: daysFromNow(randInt(2, 20)),
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
    data: soonExpiring.map((a) => ({
      type: 'warranty_expiry' as const,
      title: 'Warranty expiring soon',
      message: `Asset ${a.assetCode} warranty expires within 30 days`,
      assetId: a.id,
      userId: superAdmin?.id ?? null,
    })),
  });

  // ---- accessories & consumables (Prompt 6) ----
  console.log('Seeding accessories & consumables...');
  const accMouse = await prisma.accessory.create({
    data: { name: 'Wireless Mouse', category: 'Peripherals', quantityTotal: 120, quantityCheckedOut: 45 },
  });
  await prisma.accessory.createMany({
    data: [
      { name: 'USB-C Charger 65W', category: 'Power', quantityTotal: 80, quantityCheckedOut: 32 },
      { name: 'Laptop Docking Station', category: 'Peripherals', quantityTotal: 40, quantityCheckedOut: 28 },
      { name: 'Headset USB', category: 'Audio', quantityTotal: 60, quantityCheckedOut: 22 },
      { name: 'HDMI Cable 2m', category: 'Cables', quantityTotal: 200, quantityCheckedOut: 90 },
    ],
  });
  const sampleEmp = await prisma.employee.findFirst({ where: { employeeCode: 'EMP-PUN-0001' } });
  if (sampleEmp) {
    await prisma.accessoryCheckout.create({
      data: {
        accessoryId: accMouse.id,
        employeeId: sampleEmp.id,
        quantity: 1,
        processedById: superAdmin?.id ?? null,
      },
    });
  }
  await prisma.consumable.createMany({
    data: [
      { name: 'AA Batteries (4-pack)', category: 'Power', quantityTotal: 500, quantityAvailable: 420, lowStockThreshold: 50 },
      { name: 'Toner Cartridge HP 85A', category: 'Printer', quantityTotal: 80, quantityAvailable: 12, lowStockThreshold: 15 },
      { name: 'Ethernet Patch Cable 3m', category: 'Cables', quantityTotal: 300, quantityAvailable: 180, lowStockThreshold: 40 },
      { name: 'Screen Wipes (100ct)', category: 'Cleaning', quantityTotal: 150, quantityAvailable: 95, lowStockThreshold: 20 },
      { name: 'USB Flash Drive 32GB', category: 'Storage', quantityTotal: 100, quantityAvailable: 8, lowStockThreshold: 10 },
    ],
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
