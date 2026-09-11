import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalRouting, Prisma, PurchaseRequisitionStatus, RoleName } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { MailerService } from '../notifications/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalDto, CreateRequisitionDto, ReasonDto, UpdateRequisitionDto } from './dto';
import { ProcurementLogService } from './log.service';
import { isMaterialRequisitionEdit } from './material';
import { paddedCode, sumLines } from './numbers';
import { VendorsService } from './vendors.service';

const EDITABLE: PurchaseRequisitionStatus[] = ['draft', 'pending_approval', 'approved', 'rejected'];
const MANAGE: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN];

const include = {
  department: true,
  requester: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: { select: { name: true } },
      employeeId: true,
    },
  },
  owner: {
    select: { id: true, firstName: true, lastName: true, employeeCode: true, managerId: true },
  },
  vendor: {
    select: {
      id: true,
      vendorCode: true,
      legalName: true,
      status: true,
      isPreferred: true,
      ratingSummary: true,
    },
  },
  lineItems: { orderBy: { sortOrder: 'asc' as const } },
  quotes: { include: { vendor: { select: { id: true, legalName: true, vendorCode: true } } } },
  approvers: {
    include: {
      user: { select: { id: true, fullName: true, email: true, role: { select: { name: true } } } },
    },
    orderBy: [{ level: 'asc' as const }, { id: 'asc' as const }],
  },
  locations: { include: { location: true } },
  purchaseOrders: { select: { id: true, poNumber: true, status: true } },
} satisfies Prisma.PurchaseRequisitionInclude;

@Injectable()
export class RequisitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly log: ProcurementLogService,
    private readonly vendors: VendorsService,
    private readonly mailer: MailerService,
  ) {}

  async list(query: ListQuery & { status?: string }, actor: AuthUser) {
    const { skip, take, orderBy } = parseListQuery(query, [
      'id',
      'createdAt',
      'status',
      'totalCost',
      'title',
    ]);
    const where: Prisma.PurchaseRequisitionWhereInput = {
      ...this.scope(actor),
      ...(query.status ? { status: query.status as PurchaseRequisitionStatus } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { requisitionNumber: { contains: query.q, mode: 'insensitive' } },
              { businessRequirement: { contains: query.q, mode: 'insensitive' } },
              { vendorFreeText: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.purchaseRequisition.findMany({ where, skip, take, orderBy, include }),
      this.prisma.purchaseRequisition.count({ where }),
    ]);
    return { data, total };
  }

  async get(id: number, actor: AuthUser) {
    const row = await this.prisma.purchaseRequisition.findFirst({
      where: { id, ...this.scope(actor) },
      include,
    });
    if (!row) throw new NotFoundException(`Requisition ${id} not found`);
    return row;
  }

  async create(dto: CreateRequisitionDto, actor: AuthUser) {
    this.assertRaise(actor);
    if (dto.vendorId) {
      const v = await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } });
      if (!v) throw new NotFoundException('Vendor not found');
      this.vendors.assertSelectable(v.status, v.vendorCode);
    }
    let vendorId = dto.vendorId ?? null;
    if (!vendorId && dto.vendorFreeText?.trim()) {
      const pending = await this.prisma.vendor.create({
        data: {
          vendorCode: `VND-TMP-${Date.now()}`,
          legalName: dto.vendorFreeText.trim(),
          status: 'pending_approval',
          categories: [dto.category],
        },
      });
      vendorId = pending.id;
    }
    const computed = sumLines(dto.lineItems, dto.taxAmount ?? 0);
    const total = dto.totalCost != null ? dto.totalCost : computed;
    const created = await this.prisma.purchaseRequisition.create({
      data: {
        requisitionNumber: 'PR-TMP',
        title: dto.title.trim(),
        departmentId: dto.departmentId,
        departmentFreeText: dto.departmentFreeText,
        requesterId: actor.id,
        ownerEmployeeId: dto.ownerEmployeeId ?? actor.employeeId,
        requestDate: dto.requestDate ? new Date(dto.requestDate) : new Date(),
        businessRequirement: dto.businessRequirement.trim(),
        proposedMakeModel: dto.proposedMakeModel,
        category: dto.category,
        vendorId,
        vendorFreeText: dto.vendorFreeText,
        budgetHead: dto.budgetHead,
        procurementType: dto.procurementType,
        remoteEmployees: dto.remoteEmployees ?? false,
        locationFreeText: dto.locationFreeText,
        expectedProcurementDate: dto.expectedProcurementDate
          ? new Date(dto.expectedProcurementDate)
          : null,
        expectedDeploymentDate: dto.expectedDeploymentDate
          ? new Date(dto.expectedDeploymentDate)
          : null,
        taxAmount: dto.taxAmount ?? 0,
        totalCost: total,
        totalOverride: dto.totalCost != null && dto.totalCost !== computed,
        lineItems: {
          create: dto.lineItems.map((l, i) => ({
            product: l.product,
            unitCost: l.unitCost,
            quantity: l.quantity,
            commercialNotes: l.commercialNotes,
            kind: l.kind ?? 'serialized',
            sortOrder: i,
          })),
        },
        quotes: dto.quotes?.length
          ? {
              create: dto.quotes.map((q) => ({
                vendorId: q.vendorId,
                vendorName: q.vendorName,
                quotedPrice: q.quotedPrice,
                leadTimeDays: q.leadTimeDays,
                notes: q.notes,
                selected: q.selected ?? false,
              })),
            }
          : undefined,
        locations: dto.locationIds?.length
          ? { create: dto.locationIds.map((locationId) => ({ locationId })) }
          : undefined,
      },
      include,
    });
    const numbered = await this.prisma.purchaseRequisition.update({
      where: { id: created.id },
      data: { requisitionNumber: paddedCode('PR', created.id) },
      include,
    });
    await this.log.write({
      recordType: 'requisition',
      recordId: numbered.id,
      action: 'create',
      summary: `Requisition ${numbered.requisitionNumber} created`,
      after: { title: numbered.title, totalCost: Number(numbered.totalCost) },
      actor,
      auditAction: 'create',
      entityType: 'PurchaseRequisition',
    });
    if (dto.submit) return this.submit(numbered.id, actor);
    return numbered;
  }

  async update(id: number, dto: UpdateRequisitionDto, actor: AuthUser) {
    const existing = await this.get(id, actor);
    this.assertCanEdit(existing, actor);
    if (!EDITABLE.includes(existing.status) || existing.status === 'converted_to_po') {
      throw new BadRequestException(`Cannot edit a ${existing.status} requisition`);
    }
    if (
      existing.status === 'approved' &&
      isMaterialRequisitionEdit(this.snap(existing), dto as Record<string, unknown>)
    ) {
      // fall through — material edit on approved resets to pending
    }
    if (dto.vendorId) {
      const v = await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } });
      if (!v) throw new NotFoundException('Vendor not found');
      this.vendors.assertSelectable(v.status, v.vendorCode);
    }
    const lines =
      dto.lineItems ??
      existing.lineItems.map((l) => ({
        product: l.product,
        unitCost: Number(l.unitCost),
        quantity: Number(l.quantity),
        commercialNotes: l.commercialNotes,
        kind: l.kind,
      }));
    const tax = dto.taxAmount ?? Number(existing.taxAmount);
    const computed = sumLines(lines, tax);
    const total = dto.totalCost != null ? dto.totalCost : computed;
    const material = isMaterialRequisitionEdit(this.snap(existing), {
      ...dto,
      lineItems: dto.lineItems,
      taxAmount: dto.taxAmount,
      totalCost: dto.totalCost,
    } as Record<string, unknown>);
    const resetApproval =
      material && (existing.status === 'pending_approval' || existing.status === 'approved');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.lineItems) {
        await tx.requisitionLineItem.deleteMany({ where: { requisitionId: id } });
        await tx.requisitionLineItem.createMany({
          data: dto.lineItems.map((l, i) => ({
            requisitionId: id,
            product: l.product,
            unitCost: l.unitCost,
            quantity: l.quantity,
            commercialNotes: l.commercialNotes,
            kind: l.kind ?? 'serialized',
            sortOrder: i,
          })),
        });
      }
      if (dto.locationIds) {
        await tx.purchaseRequisitionLocation.deleteMany({ where: { requisitionId: id } });
        if (dto.locationIds.length) {
          await tx.purchaseRequisitionLocation.createMany({
            data: dto.locationIds.map((locationId) => ({ requisitionId: id, locationId })),
          });
        }
      }
      if (dto.quotes) {
        await tx.requisitionQuote.deleteMany({ where: { requisitionId: id } });
        if (dto.quotes.length) {
          await tx.requisitionQuote.createMany({
            data: dto.quotes.map((q) => ({
              requisitionId: id,
              vendorId: q.vendorId,
              vendorName: q.vendorName,
              quotedPrice: q.quotedPrice,
              leadTimeDays: q.leadTimeDays,
              notes: q.notes,
              selected: q.selected ?? false,
            })),
          });
        }
      }
      return tx.purchaseRequisition.update({
        where: { id },
        data: {
          title: dto.title?.trim(),
          departmentId: dto.departmentId,
          departmentFreeText: dto.departmentFreeText,
          ownerEmployeeId: dto.ownerEmployeeId,
          requestDate: dto.requestDate ? new Date(dto.requestDate) : undefined,
          businessRequirement: dto.businessRequirement?.trim(),
          proposedMakeModel: dto.proposedMakeModel,
          category: dto.category,
          vendorId: dto.vendorId,
          vendorFreeText: dto.vendorFreeText,
          budgetHead: dto.budgetHead,
          procurementType: dto.procurementType,
          remoteEmployees: dto.remoteEmployees,
          locationFreeText: dto.locationFreeText,
          expectedProcurementDate: dto.expectedProcurementDate
            ? new Date(dto.expectedProcurementDate)
            : undefined,
          expectedDeploymentDate: dto.expectedDeploymentDate
            ? new Date(dto.expectedDeploymentDate)
            : undefined,
          taxAmount: tax,
          totalCost: total,
          totalOverride: dto.totalCost != null && dto.totalCost !== computed,
          ...(resetApproval
            ? { status: 'pending_approval' as const, revision: { increment: 1 } }
            : existing.status === 'rejected' && material
              ? { status: 'draft' as const }
              : {}),
        },
        include,
      });
    });

    if (resetApproval) {
      await this.rebuildApprovers(updated.id);
      await this.notifyApprovers(updated.id, true);
    }

    await this.log.write({
      recordType: 'requisition',
      recordId: id,
      action: resetApproval ? 'revise' : 'update',
      summary: resetApproval
        ? `Material edit on ${updated.requisitionNumber} — approval chain reset (revision ${updated.revision})`
        : `Requisition ${updated.requisitionNumber} updated`,
      before: this.snap(existing),
      after: this.snap(updated),
      reason: dto.reason,
      actor,
      entityType: 'PurchaseRequisition',
    });
    return this.get(id, actor);
  }

  async submit(id: number, actor: AuthUser) {
    const existing = await this.get(id, actor);
    this.assertCanEdit(existing, actor);
    if (!['draft', 'rejected'].includes(existing.status)) {
      throw new BadRequestException('Only draft or rejected requisitions can be submitted');
    }
    await this.rebuildApprovers(id);
    const updated = await this.prisma.purchaseRequisition.update({
      where: { id },
      data: {
        status: 'pending_approval',
        revision: existing.status === 'rejected' ? { increment: 1 } : existing.revision,
      },
      include,
    });
    await this.notifyApprovers(id, existing.status === 'rejected');
    await this.log.write({
      recordType: 'requisition',
      recordId: id,
      action: 'submit',
      summary: `${updated.requisitionNumber} submitted for approval`,
      actor,
      auditAction: 'update',
      entityType: 'PurchaseRequisition',
    });
    return this.get(id, actor);
  }

  async decide(id: number, dto: ApprovalDto, actor: AuthUser) {
    const existing = await this.get(id, actor);
    if (existing.status !== 'pending_approval') {
      throw new BadRequestException('Only pending requisitions can be approved or rejected');
    }
    const mine = existing.approvers.find((a) => a.userId === actor.id && a.kind === 'required');
    if (!mine) throw new ForbiddenException('You are not a required approver on this requisition');
    if (mine.status !== 'pending') throw new BadRequestException('You have already decided');
    if (existing.routing === 'sequential') {
      const earlier = existing.approvers.filter(
        (a) => a.kind === 'required' && a.level < mine.level && a.status === 'pending',
      );
      if (earlier.length)
        throw new BadRequestException('Waiting on an earlier approver (sequential routing)');
    }
    if (dto.decision === 'rejected' && !dto.comment?.trim()) {
      throw new BadRequestException('Rejection requires a comment');
    }

    await this.prisma.requisitionApprover.update({
      where: { id: mine.id },
      data: { status: dto.decision, comment: dto.comment, decidedAt: new Date() },
    });

    if (dto.decision === 'rejected') {
      await this.prisma.purchaseRequisition.update({ where: { id }, data: { status: 'rejected' } });
      await this.notifyWatchers(existing, `Requisition ${existing.requisitionNumber} was rejected`);
    } else {
      const remaining = await this.prisma.requisitionApprover.count({
        where: { requisitionId: id, kind: 'required', status: 'pending' },
      });
      if (remaining === 0) {
        await this.prisma.purchaseRequisition.update({
          where: { id },
          data: { status: 'approved' },
        });
        await this.notifyWatchers(
          existing,
          `Requisition ${existing.requisitionNumber} is fully approved`,
        );
      } else if (existing.routing === 'sequential') {
        await this.notifyApprovers(id, false);
      }
    }

    await this.log.write({
      recordType: 'requisition',
      recordId: id,
      action: dto.decision,
      summary: `${actor.fullName} ${dto.decision} ${existing.requisitionNumber}`,
      reason: dto.comment,
      actor,
      auditAction: dto.decision === 'approved' ? 'approve' : 'reject',
      entityType: 'PurchaseRequisition',
    });
    return this.get(id, actor);
  }

  async withdraw(id: number, dto: ReasonDto, actor: AuthUser) {
    const existing = await this.get(id, actor);
    const isAdmin = MANAGE.includes(actor.role);
    const isOwner = existing.requesterId === actor.id;
    if (!isAdmin && !isOwner)
      throw new ForbiddenException('Only the requester or an admin can withdraw this');
    if (!['draft', 'pending_approval'].includes(existing.status) && !isAdmin) {
      throw new BadRequestException('Requester can only withdraw draft or pending requisitions');
    }
    if (['converted_to_po', 'cancelled'].includes(existing.status)) {
      throw new BadRequestException(`Cannot cancel a ${existing.status} requisition`);
    }
    const updated = await this.prisma.purchaseRequisition.update({
      where: { id },
      data: { status: 'cancelled', cancelReason: dto.reason.trim() },
      include,
    });
    await this.log.write({
      recordType: 'requisition',
      recordId: id,
      action: 'cancel',
      summary: `${updated.requisitionNumber} cancelled`,
      reason: dto.reason,
      actor,
      entityType: 'PurchaseRequisition',
    });
    return updated;
  }

  history(id: number, actor: AuthUser) {
    return this.get(id, actor).then(() => this.log.list('requisition', id));
  }

  private snap(row: {
    title: string;
    vendorId: number | null;
    vendorFreeText: string | null;
    category: string;
    procurementType: string;
    taxAmount: unknown;
    totalCost: unknown;
    lineItems: {
      product: string;
      unitCost: unknown;
      quantity: unknown;
      commercialNotes: string | null;
      kind: string;
    }[];
  }) {
    return {
      title: row.title,
      vendorId: row.vendorId,
      vendorFreeText: row.vendorFreeText,
      category: row.category,
      procurementType: row.procurementType,
      taxAmount: Number(row.taxAmount),
      totalCost: Number(row.totalCost),
      lineItems: row.lineItems.map((l) => ({
        product: l.product,
        unitCost: Number(l.unitCost),
        quantity: Number(l.quantity),
        commercialNotes: l.commercialNotes,
        kind: l.kind,
      })),
    };
  }

  private async rebuildApprovers(requisitionId: number) {
    const pr = await this.prisma.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      include: {
        owner: { include: { user: true, manager: { include: { user: true } } } },
        requester: true,
      },
    });
    if (!pr) return;
    const rules = await this.prisma.approvalMatrixRule.findMany({
      where: {
        minAmount: { lte: pr.totalCost },
        OR: [{ category: null }, { category: pr.category }],
      },
      orderBy: { level: 'asc' },
    });
    const routing: ApprovalRouting = rules.some((r) => r.routing === 'sequential')
      ? 'sequential'
      : 'parallel';
    const usersByRole = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: [...new Set(rules.map((r) => r.role))] } } },
      include: { role: true },
    });
    await this.prisma.requisitionApprover.deleteMany({ where: { requisitionId } });
    const seen = new Set<number>();
    const rows: Prisma.RequisitionApproverCreateManyInput[] = [];
    for (const rule of rules) {
      const candidates = usersByRole.filter((u) => u.role.name === rule.role);
      for (const u of candidates) {
        if (seen.has(u.id)) continue;
        seen.add(u.id);
        rows.push({
          requisitionId,
          userId: u.id,
          kind: rule.kind,
          level: rule.level,
          status: 'pending',
        });
      }
    }
    const managerUser = pr.owner?.manager?.user;
    if (managerUser && !seen.has(managerUser.id)) {
      rows.push({
        requisitionId,
        userId: managerUser.id,
        kind: 'watcher',
        level: 99,
        status: 'pending',
      });
    }
    if (rows.length) await this.prisma.requisitionApprover.createMany({ data: rows });
    await this.prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { routing },
    });
  }

  private async notifyApprovers(id: number, revised: boolean) {
    const pr = await this.prisma.purchaseRequisition.findUnique({
      where: { id },
      include: { approvers: { include: { user: true } } },
    });
    if (!pr) return;
    const required = pr.approvers.filter((a) => a.kind === 'required' && a.status === 'pending');
    const due =
      pr.routing === 'sequential'
        ? required.sort((a, b) => a.level - b.level).slice(0, 1)
        : required;
    const title = revised
      ? `Revised requisition ${pr.requisitionNumber} needs re-approval`
      : `Requisition ${pr.requisitionNumber} awaits your approval`;
    for (const a of due) {
      await this.prisma.notification.create({
        data: { userId: a.userId, type: 'procurement', title, message: pr.title },
      });
      await this.mailer.send({
        to: a.user.email,
        subject: title,
        text: `${pr.title}\nTotal: ${pr.totalCost}\nOpen Procurement → Requisitions to review.`,
      });
    }
  }

  private async notifyWatchers(
    pr: {
      id: number;
      requisitionNumber: string;
      title: string;
      requesterId: number;
      approvers: { kind: string; userId: number }[];
    },
    title: string,
  ) {
    const ids = new Set<number>([
      pr.requesterId,
      ...pr.approvers.filter((a) => a.kind === 'watcher').map((a) => a.userId),
    ]);
    for (const userId of ids) {
      await this.prisma.notification.create({
        data: { userId, type: 'procurement', title, message: pr.title },
      });
    }
  }

  private scope(actor: AuthUser): Prisma.PurchaseRequisitionWhereInput {
    if (MANAGE.includes(actor.role)) return {};
    if (actor.role === RoleName.MANAGER && actor.employeeId) {
      return {
        OR: [
          { requesterId: actor.id },
          { ownerEmployeeId: actor.employeeId },
          { owner: { managerId: actor.employeeId } },
          { approvers: { some: { userId: actor.id } } },
        ],
      };
    }
    return { OR: [{ requesterId: actor.id }, { approvers: { some: { userId: actor.id } } }] };
  }

  private assertRaise(actor: AuthUser) {
    if (
      actor.role !== RoleName.SUPER_ADMIN &&
      actor.role !== RoleName.IT_ADMIN &&
      actor.role !== RoleName.MANAGER
    ) {
      throw new ForbiddenException(
        'Only Super Admin, IT Admin, or Manager can raise a purchase requisition',
      );
    }
  }

  private assertCanEdit(
    row: { requesterId: number; status: PurchaseRequisitionStatus },
    actor: AuthUser,
  ) {
    if (MANAGE.includes(actor.role)) return;
    if (
      row.requesterId === actor.id &&
      ['draft', 'pending_approval', 'rejected'].includes(row.status)
    )
      return;
    throw new ForbiddenException('You cannot edit this requisition');
  }
}
