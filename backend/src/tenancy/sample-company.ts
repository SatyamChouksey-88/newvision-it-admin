import { AssetStatus, PrismaClient } from '@prisma/client';

type Db = PrismaClient;

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

/** ~25-laptop trial dataset. Never the 1,250-row internal seed. */
export async function loadSampleCompany(prisma: Db, _opts: { adminUserId: number }): Promise<void> {
  const pune = await prisma.location.create({
    data: { code: 'PUN', name: 'Pune Office', city: 'Pune' },
  });
  const hyd = await prisma.location.create({
    data: { code: 'HYD', name: 'Hyderabad Office', city: 'Hyderabad' },
  });
  const it = await prisma.department.create({ data: { name: 'Information Technology' } });
  const finance = await prisma.department.create({ data: { name: 'Finance' } });
  const sales = await prisma.department.create({ data: { name: 'Sales' } });

  const lap = await prisma.assetCategory.findFirst({ where: { code: 'LAP' } });
  if (!lap) throw new Error('LAP category missing');

  const people = [
    ['Rahul', 'Sharma', 'rahul.sharma', 'EMP-1001', pune.id, it.id, 'IT Admin'],
    ['Priya', 'Iyer', 'priya.iyer', 'EMP-1002', pune.id, finance.id, 'Accountant'],
    ['Arjun', 'Reddy', 'arjun.reddy', 'EMP-1003', hyd.id, sales.id, 'Sales Manager'],
    ['Meera', 'Patel', 'meera.patel', 'EMP-1004', pune.id, sales.id, 'Account Executive'],
    ['Kabir', 'Khan', 'kabir.khan', 'EMP-1005', hyd.id, it.id, 'IT Support'],
    ['Saanvi', 'Nair', 'saanvi.nair', 'EMP-1006', hyd.id, finance.id, 'Analyst'],
    ['Rohan', 'Kulkarni', 'rohan.kulkarni', 'EMP-1007', pune.id, sales.id, 'Sales Associate'],
    ['Ananya', 'Gupta', 'ananya.gupta', 'EMP-1008', pune.id, it.id, 'IT Coordinator'],
  ] as const;

  const employees = [];
  for (const [first, last, local, code, locationId, departmentId, designation] of people) {
    employees.push(
      await prisma.employee.create({
        data: {
          employeeCode: code,
          firstName: first,
          lastName: last,
          email: `${local}@sample.example`,
          designation,
          locationId,
          departmentId,
          dateJoined: daysFromNow(-30 - employees.length * 40),
        },
      }),
    );
  }

  const laptops: { brand: string; model: string; loc: number; assign?: number; warrantyDays?: number }[] = [
    { brand: 'Dell', model: 'Latitude 5440', loc: pune.id, assign: 0 },
    { brand: 'Dell', model: 'Latitude 5440', loc: pune.id, assign: 1 },
    { brand: 'HP', model: 'EliteBook 840 G10', loc: pune.id, assign: 3 },
    { brand: 'HP', model: 'EliteBook 840 G10', loc: hyd.id, assign: 2 },
    { brand: 'Lenovo', model: 'ThinkPad T14 Gen 4', loc: hyd.id, assign: 4 },
    { brand: 'Lenovo', model: 'ThinkPad T14 Gen 4', loc: pune.id, assign: 6 },
    { brand: 'Dell', model: 'Latitude 5540', loc: hyd.id, assign: 5 },
    { brand: 'HP', model: 'ProBook 450 G10', loc: pune.id, assign: 7 },
    { brand: 'Dell', model: 'Latitude 5440', loc: pune.id, warrantyDays: 25 },
    { brand: 'Lenovo', model: 'ThinkPad E14', loc: hyd.id },
  ];
  for (let i = 0; i < 15; i++) {
    laptops.push({
      brand: ['Dell', 'HP', 'Lenovo'][i % 3],
      model: ['Latitude 3540', 'ProBook 440', 'ThinkPad L14'][i % 3],
      loc: i % 2 === 0 ? pune.id : hyd.id,
    });
  }

  const createdAssets = [];
  for (let i = 0; i < laptops.length; i++) {
    const spec = laptops[i];
    const assigned = spec.assign != null ? employees[spec.assign] : null;
    const warrantyEnd = spec.warrantyDays
      ? daysFromNow(spec.warrantyDays)
      : daysFromNow(400 + i * 10);
    const asset = await prisma.asset.create({
      data: {
        assetCode: `AST-${spec.loc === pune.id ? 'PUN' : 'HYD'}-LAP-${String(i + 1).padStart(4, '0')}`,
        categoryId: lap.id,
        brand: spec.brand,
        model: spec.model,
        serialNumber: `SN-SM-${String(10000 + i)}`,
        locationId: spec.loc,
        status: assigned ? AssetStatus.assigned : AssetStatus.available,
        assignedEmployeeId: assigned?.id ?? null,
        purchaseDate: daysFromNow(-200 - i),
        purchaseCost: 72000 + i * 500,
        warrantyStart: daysFromNow(-200 - i),
        warrantyEnd,
      },
    });
    createdAssets.push(asset);
    if (assigned) {
      await prisma.assetAssignment.create({
        data: { assetId: asset.id, employeeId: assigned.id },
      });
    }
  }

  const mon = await prisma.assetCategory.findFirst({ where: { code: 'MON' } });
  if (mon) {
    for (let i = 0; i < 6; i++) {
      const assigned = i < 3 ? employees[i] : null;
      const monitor = await prisma.asset.create({
        data: {
          assetCode: `AST-${i % 2 === 0 ? 'PUN' : 'HYD'}-MON-${String(i + 1).padStart(4, '0')}`,
          categoryId: mon.id,
          brand: 'Dell',
          model: 'P2422H',
          serialNumber: `SN-MON-${String(20000 + i)}`,
          locationId: i % 2 === 0 ? pune.id : hyd.id,
          status: assigned ? AssetStatus.assigned : AssetStatus.available,
          assignedEmployeeId: assigned?.id ?? null,
          purchaseDate: daysFromNow(-180 - i),
          purchaseCost: 14500,
          warrantyEnd: daysFromNow(400),
        },
      });
      if (assigned) {
        await prisma.assetAssignment.create({
          data: { assetId: monitor.id, employeeId: assigned.id },
        });
      }
    }
  }

  const mouse = await prisma.accessory.create({
    data: {
      name: 'Wireless Mouse',
      category: 'Peripherals',
      brand: 'Logitech',
      model: 'M185',
      quantityTotal: 20,
      quantityCheckedOut: 1,
      locationId: pune.id,
      lowStockThreshold: 4,
    },
  });
  await prisma.accessoryCheckout.create({
    data: { accessoryId: mouse.id, employeeId: employees[0].id, quantity: 1 },
  });

  const software = await prisma.ticketCategory.findFirst({ where: { code: 'software' } });
  if (software) {
    await prisma.supportTicket.create({
      data: {
        ticketNumber: 'TCK-000001',
        subject: 'Outlook search is empty after the Windows update',
        description:
          'After yesterday’s patch, Outlook desktop search returns no mail. Classic issue — need a rebuild of the index.',
        categoryId: software.id,
        raisedById: employees[1].id,
        locationId: pune.id,
        assetId: createdAssets[1]?.id,
        status: 'open',
        priority: 'medium',
      },
    });
    await prisma.supportTicket.create({
      data: {
        ticketNumber: 'TCK-000002',
        subject: 'VPN drops every 20 minutes from Hyderabad',
        description: 'AnyConnect session dies on the guest SSID. Works on the office LAN.',
        categoryId: software.id,
        raisedById: employees[2].id,
        locationId: hyd.id,
        status: 'open',
        priority: 'high',
      },
    });
  }

  await prisma.vendor.create({
    data: {
      vendorCode: 'VND-0001',
      legalName: 'Redington India Limited',
      tradingName: 'Redington',
      taxId: '33AABCR1234A1Z5',
      status: 'active',
      country: 'IN',
    },
  });
}
