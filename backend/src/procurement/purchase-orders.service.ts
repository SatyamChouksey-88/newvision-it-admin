import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LineItemKind, Prisma, PurchaseOrderStatus, RoleName } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { assetCodePrefix, formatAssetCode, parseAssetCode } from '../assets/asset-code';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { AmendPoDto, CreateInvoiceDto, InvoicePaymentDto, ReasonDto, ReceiveDto } from './dto';
import { ProcurementLogService } from './log.service';
import { threeWayMatch } from './match';
import { addDays, money, netDays, paddedCode, sumLines } from './numbers';
import { VendorsService } from './vendors.service';

const MANAGE: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN];

const poInclude = {
  vendor: true,
  requisition: { select: { id: true, requisitionNumber: true, title: true } },
  lineItems: { orderBy: { sortOrder: 'asc' as const } },
  amendments: {
    orderBy: { amendedAt: 'desc' as const },
    include: { amendedBy: { select: { fullName: true } } },
  },
  receipts: {
    include: { lineItems: true, receivedBy: { select: { fullName: true } } },
    orderBy: { receivedAt: 'desc' as const },
  },
  invoices: { orderBy: { createdAt: 'desc' as const } },
  location: true,
  createdBy: { select: { id: true, fullName: true } },
  handoffs: true,
} satisfies Prisma.PurchaseOrderInclude;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly log: ProcurementLogService,
    private readonly vendors: VendorsService,
  ) {}

  async list(query: ListQuery & { status?: string }, actor: AuthUser) {
    this.assertManage(actor);
    const { skip, take, orderBy } = parseListQuery(query, [
      'id',
      'createdAt',
      'status',
      'total',
      'poNumber',
    ]);
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.status ? { status: query.status as PurchaseOrderStatus } : {}),
      ...(query.q
        ? {
            OR: [
              { poNumber: { contains: query.q, mode: 'insensitive' } },
              { vendor: { legalName: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          vendor: { select: { id: true, legalName: true, vendorCode: true, status: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, total };
  }

  async get(id: number, actor: AuthUser) {
    this.assertManage(actor);
    const row = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: poInclude });
    if (!row) throw new NotFoundException(`PO ${id} not found`);
    return { ...row, receivedTotals: this.receivedMap(row) };
  }

  async convert(requisitionId: number, actor: AuthUser) {
    this.assertManage(actor);
    const pr = await this.prisma.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      include: { lineItems: true, vendor: true, locations: true },
    });
    if (!pr) throw new NotFoundException('Requisition not found');
    if (pr.status !== 'approved')
      throw new BadRequestException('Only approved requisitions can be converted to a PO');
    if (!pr.vendorId)
      throw new BadRequestException('Assign an approved vendor before converting to a PO');
    this.vendors.assertSelectable(pr.vendor!.status, pr.vendor!.vendorCode);

    const po = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          poNumber: 'PO-TMP',
          requisitionId: pr.id,
          vendorId: pr.vendorId!,
          taxAmount: pr.taxAmount,
          total: pr.totalCost,
          deliveryDate: pr.expectedProcurementDate,
          terms: pr.vendor?.paymentTerms,
          locationId: pr.locations[0]?.locationId,
          createdById: actor.id,
          lineItems: {
            create: pr.lineItems.map((l) => ({
              product: l.product,
              unitCost: l.unitCost,
              quantity: l.quantity,
              commercialNotes: l.commercialNotes,
              kind: l.kind,
              sortOrder: l.sortOrder,
            })),
          },
        },
      });
      await tx.purchaseRequisition.update({
        where: { id: pr.id },
        data: { status: 'converted_to_po' },
      });
      return tx.purchaseOrder.update({
        where: { id: created.id },
        data: { poNumber: paddedCode('PO', created.id) },
        include: poInclude,
      });
    });
    await this.log.write({
      recordType: 'purchase_order',
      recordId: po.id,
      action: 'create',
      summary: `PO ${po.poNumber} converted from ${pr.requisitionNumber}`,
      actor,
      auditAction: 'create',
      entityType: 'PurchaseOrder',
    });
    return po;
  }

  async send(id: number, actor: AuthUser) {
    const po = await this.requirePo(id, actor);
    if (po.status !== 'draft') throw new BadRequestException('Only a draft PO can be sent');
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
      include: poInclude,
    });
    await this.log.write({
      recordType: 'purchase_order',
      recordId: id,
      action: 'send',
      summary: `${updated.poNumber} marked sent`,
      actor,
      entityType: 'PurchaseOrder',
    });
    return updated;
  }

  async amend(id: number, dto: AmendPoDto, actor: AuthUser) {
    const po = await this.requirePo(id, actor);
    if (!['draft', 'sent', 'partially_received'].includes(po.status)) {
      throw new BadRequestException(`Cannot amend a ${po.status} PO`);
    }
    const snapshot = {
      revision: po.revision,
      taxAmount: Number(po.taxAmount),
      total: Number(po.total),
      deliveryDate: po.deliveryDate,
      terms: po.terms,
      lineItems: po.lineItems.map((l) => ({
        product: l.product,
        unitCost: Number(l.unitCost),
        quantity: Number(l.quantity),
        kind: l.kind,
        commercialNotes: l.commercialNotes,
      })),
    };
    const lines = dto.lineItems ?? snapshot.lineItems;
    const tax = dto.taxAmount ?? snapshot.taxAmount;
    const total = sumLines(lines, tax);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderAmendment.create({
        data: {
          purchaseOrderId: id,
          revision: po.revision,
          snapshot,
          reason: dto.reason.trim(),
          amendedById: actor.id,
        },
      });
      if (dto.lineItems) {
        await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderLine.createMany({
          data: dto.lineItems.map((l, i) => ({
            purchaseOrderId: id,
            product: l.product,
            unitCost: l.unitCost,
            quantity: l.quantity,
            commercialNotes: l.commercialNotes,
            kind: (l.kind ?? 'serialized') as LineItemKind,
            sortOrder: i,
          })),
        });
      }
      const row = await tx.purchaseOrder.update({
        where: { id },
        data: {
          revision: { increment: 1 },
          taxAmount: tax,
          total,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
          terms: dto.terms,
        },
        include: poInclude,
      });
      if (po.handoffs.length) {
        await tx.procurementHandoff.updateMany({
          where: { purchaseOrderId: id },
          data: {
            needsReconciliation: true,
            reconciliationNote: `PO ${row.poNumber} amended (rev ${row.revision}): ${dto.reason}`,
          },
        });
        await tx.asset.updateMany({
          where: { purchaseOrderId: id },
          data: {
            needsReconciliation: true,
            reconciliationNote: `Upstream PO amended: ${dto.reason}`,
          },
        });
      }
      return row;
    });
    await this.log.write({
      recordType: 'purchase_order',
      recordId: id,
      action: 'amend',
      summary: `${updated.poNumber} amended to revision ${updated.revision}`,
      before: snapshot,
      after: { revision: updated.revision, total: Number(updated.total) },
      reason: dto.reason,
      actor,
      entityType: 'PurchaseOrder',
    });
    return this.get(id, actor);
  }

  async cancel(id: number, dto: ReasonDto, actor: AuthUser) {
    const po = await this.requirePo(id, actor);
    if (['received', 'closed', 'cancelled'].includes(po.status)) {
      throw new BadRequestException(`Cannot cancel a ${po.status} PO`);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'cancelled', cancelReason: dto.reason.trim() },
        include: poInclude,
      });
      if (po.handoffs.length) {
        await tx.procurementHandoff.updateMany({
          where: { purchaseOrderId: id },
          data: { needsReconciliation: true, reconciliationNote: `PO cancelled: ${dto.reason}` },
        });
        await tx.asset.updateMany({
          where: { purchaseOrderId: id },
          data: {
            needsReconciliation: true,
            reconciliationNote: `Upstream PO cancelled: ${dto.reason}`,
          },
        });
      }
      return row;
    });
    await this.log.write({
      recordType: 'purchase_order',
      recordId: id,
      action: 'cancel',
      summary: `${updated.poNumber} cancelled`,
      reason: dto.reason,
      actor,
      entityType: 'PurchaseOrder',
    });
    return updated;
  }

  async shortClose(id: number, dto: ReasonDto, actor: AuthUser) {
    const po = await this.requirePo(id, actor);
    if (!['partially_received', 'sent'].includes(po.status)) {
      throw new BadRequestException('Only a sent or partially received PO can be short-closed');
    }
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'closed', shortCloseReason: dto.reason.trim() },
      include: poInclude,
    });
    await this.log.write({
      recordType: 'purchase_order',
      recordId: id,
      action: 'short_close',
      summary: `${updated.poNumber} short-closed`,
      reason: dto.reason,
      actor,
      entityType: 'PurchaseOrder',
    });
    return updated;
  }

  async receive(id: number, dto: ReceiveDto, actor: AuthUser) {
    const po = await this.requirePo(id, actor);
    if (!['sent', 'partially_received'].includes(po.status)) {
      throw new BadRequestException('Goods can only be received against a sent PO');
    }
    const lineIds = new Set(po.lineItems.map((l) => l.id));
    for (const l of dto.lines) {
      if (!lineIds.has(l.purchaseOrderLineId))
        throw new BadRequestException(`Line ${l.purchaseOrderLineId} is not on this PO`);
    }
    const grn = await this.prisma.$transaction(async (tx) => {
      const created = await tx.goodsReceipt.create({
        data: {
          grnNumber: 'GRN-TMP',
          purchaseOrderId: id,
          locationId: dto.locationId ?? po.locationId,
          conditionNotes: dto.conditionNotes,
          discrepancy: dto.discrepancy,
          receivedById: actor.id,
          lineItems: {
            create: dto.lines.map((l) => ({
              purchaseOrderLineId: l.purchaseOrderLineId,
              quantityReceived: l.quantityReceived,
            })),
          },
        },
        include: { lineItems: true },
      });
      const numbered = await tx.goodsReceipt.update({
        where: { id: created.id },
        data: { grnNumber: paddedCode('GRN', created.id) },
        include: { lineItems: true },
      });
      await this.runHandoff(tx, po, numbered, actor);
      const totals = await this.liveReceived(tx, id);
      const complete = po.lineItems.every(
        (l) => (totals.get(l.id) ?? 0) + 1e-9 >= Number(l.quantity),
      );
      const partial = [...totals.values()].some((q) => q > 0);
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: complete ? 'received' : partial ? 'partially_received' : po.status },
      });
      return numbered;
    });
    await this.log.write({
      recordType: 'goods_receipt',
      recordId: grn.id,
      action: 'create',
      summary: `${grn.grnNumber} received against ${po.poNumber}`,
      after: dto.lines,
      actor,
      auditAction: 'create',
      entityType: 'GoodsReceipt',
    });
    return this.get(id, actor);
  }

  async voidReceipt(grnId: number, dto: ReasonDto, actor: AuthUser) {
    this.assertManage(actor);
    const grn = await this.prisma.goodsReceipt.findUnique({
      where: { id: grnId },
      include: { purchaseOrder: { include: poInclude }, lineItems: true },
    });
    if (!grn) throw new NotFoundException('GRN not found');
    if (grn.isReversed) throw new BadRequestException('This GRN is already voided');
    await this.prisma.$transaction(async (tx) => {
      await tx.goodsReceipt.update({
        where: { id: grnId },
        data: { isReversed: true, reverseReason: dto.reason.trim(), reversedAt: new Date() },
      });
      await tx.procurementHandoff.updateMany({
        where: { goodsReceiptId: grnId },
        data: { needsReconciliation: true, reconciliationNote: `GRN voided: ${dto.reason}` },
      });
      await tx.asset.updateMany({
        where: { goodsReceiptId: grnId },
        data: {
          needsReconciliation: true,
          reconciliationNote: `Upstream GRN voided: ${dto.reason}`,
        },
      });
      const totals = await this.liveReceived(tx, grn.purchaseOrderId);
      const complete = grn.purchaseOrder.lineItems.every(
        (l) => (totals.get(l.id) ?? 0) + 1e-9 >= Number(l.quantity),
      );
      const partial = [...totals.values()].some((q) => q > 0);
      await tx.purchaseOrder.update({
        where: { id: grn.purchaseOrderId },
        data: {
          status: complete ? 'received' : partial ? 'partially_received' : 'sent',
        },
      });
    });
    await this.log.write({
      recordType: 'goods_receipt',
      recordId: grnId,
      action: 'void',
      summary: `${grn.grnNumber} voided — received totals restored`,
      reason: dto.reason,
      actor,
      entityType: 'GoodsReceipt',
    });
    return this.get(grn.purchaseOrderId, actor);
  }

  async addInvoice(dto: CreateInvoiceDto, actor: AuthUser) {
    this.assertManage(actor);
    const vendor = await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const po = dto.purchaseOrderId
      ? await this.prisma.purchaseOrder.findUnique({
          where: { id: dto.purchaseOrderId },
          include: poInclude,
        })
      : null;
    if (dto.purchaseOrderId && !po) throw new NotFoundException('PO not found');
    const due = dto.dueDate
      ? new Date(dto.dueDate)
      : addDays(new Date(dto.invoiceDate), netDays(vendor.paymentTerms));
    let matchStatus: 'matched' | 'exception' = 'matched';
    let matchNotes: string | null = null;
    if (po) {
      const received = this.receivedMap(po);
      const result = threeWayMatch({
        poTotal: Number(po.total),
        invoiceAmount: dto.amount,
        lines: po.lineItems.map((l) => ({
          product: l.product,
          orderedQty: Number(l.quantity),
          orderedUnitCost: Number(l.unitCost),
          receivedQty: received.get(l.id) ?? 0,
          invoicedAmount: money(
            (dto.amount * Number(l.quantity) * Number(l.unitCost)) / Number(po.total || 1),
          ),
        })),
      });
      matchStatus = result.status;
      matchNotes = result.notes.join(' ') || null;
    }
    if (matchStatus === 'exception' && !dto.exceptionNote?.trim()) {
      throw new BadRequestException(
        `Invoice does not match PO/GRN (${matchNotes}). Add an exception note before recording it.`,
      );
    }
    const invoice = await this.prisma.vendorInvoice.create({
      data: {
        vendorId: dto.vendorId,
        purchaseOrderId: dto.purchaseOrderId,
        contractId: dto.contractId,
        invoiceNumber: dto.invoiceNumber.trim(),
        invoiceDate: new Date(dto.invoiceDate),
        amount: dto.amount,
        taxAmount: dto.taxAmount ?? 0,
        dueDate: due,
        matchStatus,
        matchNotes,
        exceptionNote: dto.exceptionNote,
        recordedById: actor.id,
      },
    });
    await this.log.write({
      recordType: 'invoice',
      recordId: invoice.id,
      action: 'create',
      summary: `Invoice ${invoice.invoiceNumber} recorded (${matchStatus})`,
      after: { amount: dto.amount, matchStatus },
      actor,
      auditAction: 'create',
      entityType: 'VendorInvoice',
    });
    return invoice;
  }

  async setPayment(id: number, dto: InvoicePaymentDto, actor: AuthUser) {
    this.assertManage(actor);
    const inv = await this.prisma.vendorInvoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (
      inv.matchStatus === 'exception' &&
      dto.paymentStatus === 'approved' &&
      !(dto.exceptionNote || inv.exceptionNote)
    ) {
      throw new BadRequestException(
        'Resolve the match exception with a note before approving payment',
      );
    }
    const updated = await this.prisma.vendorInvoice.update({
      where: { id },
      data: {
        paymentStatus: dto.paymentStatus,
        exceptionNote: dto.exceptionNote ?? inv.exceptionNote,
      },
    });
    await this.log.write({
      recordType: 'invoice',
      recordId: id,
      action: 'payment_status',
      summary: `Invoice ${inv.invoiceNumber} payment → ${dto.paymentStatus}`,
      actor,
      entityType: 'VendorInvoice',
    });
    return updated;
  }

  async pdf(id: number, actor: AuthUser): Promise<Buffer> {
    const po = await this.requirePo(id, actor);
    return renderPoPdf(po);
  }

  history(id: number, actor: AuthUser) {
    this.assertManage(actor);
    return this.log.list('purchase_order', id);
  }

  private receivedMap(po: {
    receipts: {
      isReversed: boolean;
      lineItems: { purchaseOrderLineId: number; quantityReceived: unknown }[];
    }[];
  }) {
    const map = new Map<number, number>();
    for (const r of po.receipts) {
      if (r.isReversed) continue;
      for (const l of r.lineItems) {
        map.set(
          l.purchaseOrderLineId,
          (map.get(l.purchaseOrderLineId) ?? 0) + Number(l.quantityReceived),
        );
      }
    }
    return map;
  }

  private async liveReceived(tx: Prisma.TransactionClient, poId: number) {
    const receipts = await tx.goodsReceipt.findMany({
      where: { purchaseOrderId: poId, isReversed: false },
      include: { lineItems: true },
    });
    return this.receivedMap({ receipts });
  }

  private async runHandoff(
    tx: Prisma.TransactionClient,
    po: Prisma.PurchaseOrderGetPayload<{ include: typeof poInclude }>,
    grn: { id: number; lineItems: { purchaseOrderLineId: number; quantityReceived: unknown }[] },
    actor: AuthUser,
  ) {
    const locId = po.locationId;
    const lap = await tx.assetCategory.findFirst({
      where: { OR: [{ code: 'LAP' }, { name: { contains: 'Laptop', mode: 'insensitive' } }] },
    });
    const categoryId = lap?.id ?? (await tx.assetCategory.findFirst())?.id;
    for (const rec of grn.lineItems) {
      const line = po.lineItems.find((l) => l.id === rec.purchaseOrderLineId);
      if (!line) continue;
      const qty = Math.max(0, Math.floor(Number(rec.quantityReceived)));
      if (line.kind === 'serialized' && categoryId && locId) {
        for (let i = 0; i < qty; i += 1) {
          const code = await this.nextAssetCode(tx, locId, categoryId);
          const asset = await tx.asset.create({
            data: {
              assetCode: code,
              categoryId,
              brand: po.vendor.legalName,
              model: line.product,
              purchaseDate: grn ? new Date() : new Date(),
              purchaseCost: line.unitCost,
              locationId: locId,
              status: 'pending_assignment',
              vendor: po.vendor.legalName,
              invoiceNo: po.poNumber,
              vendorId: po.vendorId,
              purchaseOrderId: po.id,
              goodsReceiptId: grn.id,
              warrantyStart: new Date(),
            },
          });
          await tx.procurementHandoff.create({
            data: {
              kind: 'serialized',
              purchaseOrderId: po.id,
              goodsReceiptId: grn.id,
              assetId: asset.id,
              createdById: actor.id,
            },
          });
        }
      } else if (line.kind === 'accessory') {
        const acc = await tx.accessory.create({
          data: {
            name: `${line.product} (${po.poNumber})`,
            category: 'Procurement',
            quantityTotal: qty,
            locationId: locId,
          },
        });
        await tx.procurementHandoff.create({
          data: {
            kind: 'accessory',
            purchaseOrderId: po.id,
            goodsReceiptId: grn.id,
            accessoryId: acc.id,
            createdById: actor.id,
          },
        });
      } else if (line.kind === 'consumable') {
        const c = await tx.consumable.create({
          data: {
            name: `${line.product} (${po.poNumber})`,
            category: 'Procurement',
            quantityTotal: qty,
            quantityAvailable: qty,
            locationId: locId,
          },
        });
        await tx.procurementHandoff.create({
          data: {
            kind: 'consumable',
            purchaseOrderId: po.id,
            goodsReceiptId: grn.id,
            consumableId: c.id,
            createdById: actor.id,
          },
        });
      } else if (line.kind === 'license') {
        const contract = await tx.vendorContract.create({
          data: {
            vendorId: po.vendorId,
            type: 'license_subscription',
            startDate: new Date(),
            endDate: addDays(new Date(), 365),
            value: money(Number(line.unitCost) * Number(line.quantity)),
            entitlementCount: qty,
            ownerId: actor.id,
          },
        });
        await tx.procurementHandoff.create({
          data: {
            kind: 'license',
            purchaseOrderId: po.id,
            goodsReceiptId: grn.id,
            contractId: contract.id,
            createdById: actor.id,
          },
        });
      }
    }
  }

  private async nextAssetCode(
    tx: Prisma.TransactionClient,
    locationId: number,
    categoryId: number,
  ) {
    const [location, category] = await Promise.all([
      tx.location.findUnique({ where: { id: locationId } }),
      tx.assetCategory.findUnique({ where: { id: categoryId } }),
    ]);
    if (!location || !category)
      throw new BadRequestException(
        'Location and category are required to create assets from a GRN',
      );
    const prefix = assetCodePrefix(location.code, category.code);
    const existing = await tx.asset.findMany({
      where: { assetCode: { startsWith: prefix } },
      select: { assetCode: true },
    });
    let maxSeq = 0;
    for (const { assetCode } of existing) {
      const parsed = parseAssetCode(assetCode);
      if (parsed && parsed.seq > maxSeq) maxSeq = parsed.seq;
    }
    return formatAssetCode(location.code, category.code, maxSeq + 1);
  }

  private async requirePo(id: number, actor: AuthUser) {
    this.assertManage(actor);
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: poInclude });
    if (!po) throw new NotFoundException(`PO ${id} not found`);
    return po;
  }

  private assertManage(actor: AuthUser) {
    if (!MANAGE.includes(actor.role))
      throw new ForbiddenException('Only Super Admin and IT Admin can manage purchase orders');
  }
}

async function renderPoPdf(
  po: Prisma.PurchaseOrderGetPayload<{ include: typeof poInclude }>,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc
      .fontSize(16)
      .text(
        `Purchase Order ${po.poNumber}${po.revision > 1 ? ` (Amended rev ${po.revision})` : ''}`,
      );
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Vendor: ${po.vendor.legalName}`);
    doc.text(`Status: ${po.status}`);
    doc.text(`Total: ₹${Number(po.total).toFixed(2)}  Tax: ₹${Number(po.taxAmount).toFixed(2)}`);
    if (po.deliveryDate) doc.text(`Delivery: ${po.deliveryDate.toISOString().slice(0, 10)}`);
    if (po.terms) doc.text(`Terms: ${po.terms}`);
    doc.moveDown();
    doc.text('Line items');
    for (const l of po.lineItems) {
      doc.text(`• ${l.product}  × ${Number(l.quantity)}  @ ₹${Number(l.unitCost).toFixed(2)}`);
    }
    doc.end();
  });
}
