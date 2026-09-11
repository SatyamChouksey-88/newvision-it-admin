import { INestApplication, ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Test } from '@nestjs/testing';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ROLE_PERMISSIONS } from '../src/common/rbac/permissions';
import { PrismaService } from '../src/prisma/prisma.service';

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
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.procurementHandoff.deleteMany();
  await prisma.asset.updateMany({
    data: { vendorId: null, purchaseOrderId: null, goodsReceiptId: null, needsReconciliation: false, reconciliationNote: null },
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
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticketTimeLog.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticketWatcher.deleteMany();
  await prisma.recordNote.deleteMany();
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
  await prisma.chatReaction.deleteMany();
  await prisma.chatMention.deleteMany();
  await prisma.chatAttachment.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannelMember.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticketPriorityTarget.deleteMany();
  await prisma.emailIngestState.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.cannedResponse.deleteMany();
  await prisma.ticketTemplate.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.employeeChecklist.deleteMany();
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
}

/** Seed a small, deterministic fixture and the five role users. Returns key ids. */
export async function seedCore(prisma: PrismaService): Promise<TestContext['ids']> {
  await resetDatabase(prisma);

  const permKeys = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));
  await prisma.permission.createMany({ data: permKeys.map((key) => ({ key })) });

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
    { email: 'superadmin@newvision.local', role: RoleName.SUPER_ADMIN, employeeId: null },
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
}

export async function login(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: DEMO_PASSWORD })
    .expect(200);
  return res.body.access_token as string;
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
