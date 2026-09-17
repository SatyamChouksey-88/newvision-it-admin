import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { daysRemaining } from '../common/warranty';
import { PrismaService } from '../prisma/prisma.service';

const IT_ROLES: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT];
const PROCURE_ADMIN: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN];
const ESTATE_PROCUREMENT: ReportType[] = [
  'procurement-spend',
  'procurement-renewals',
  'procurement-overdue',
  'procurement-scorecards',
];

export type ReportType =
  | 'assets'
  | 'employees'
  | 'locations'
  | 'warranty'
  | 'supplies'
  | 'tickets-by-client'
  | 'procurement-spend'
  | 'procurement-open'
  | 'procurement-renewals'
  | 'procurement-overdue'
  | 'procurement-scorecards';
export type ReportFormat = 'csv' | 'pdf';

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}
export interface ReportData {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async build(type: ReportType, actor: AuthUser): Promise<ReportData> {
    this.assertAllowed(type, actor);
    switch (type) {
      case 'assets':
        return this.assetReport(actor);
      case 'employees':
        return this.employeeReport(actor);
      case 'locations':
        return this.locationReport(actor);
      case 'warranty':
        return this.warrantyReport(actor);
      case 'supplies':
        return this.suppliesReport();
      case 'tickets-by-client':
        return this.ticketsByClientReport();
      case 'procurement-spend':
        return this.procurementSpendReport();
      case 'procurement-open':
        return this.procurementOpenReport(actor);
      case 'procurement-renewals':
        return this.procurementRenewalsReport();
      case 'procurement-overdue':
        return this.procurementOverdueReport();
      case 'procurement-scorecards':
        return this.procurementScorecardsReport();
      default:
        throw new Error(`Unknown report type: ${type as string}`);
    }
  }

  async render(
    type: ReportType,
    format: ReportFormat,
    actor: AuthUser,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.build(type, actor);
    const buffer = format === 'pdf' ? await toPdf(data) : await toCsv(data);
    return { buffer, filename: `${type}-report.${format}` };
  }

  private assertAllowed(type: ReportType, actor: AuthUser) {
    if (ESTATE_PROCUREMENT.includes(type) && !PROCURE_ADMIN.includes(actor.role)) {
      throw new ForbiddenException('That report is limited to Super Admin and IT Admin');
    }
    if (type === 'supplies' && !IT_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Supply reports are limited to IT staff');
    }
    if (type === 'tickets-by-client' && !IT_ROLES.includes(actor.role) && actor.role !== RoleName.MANAGER) {
      throw new ForbiddenException('Client ticket reports are limited to IT staff and managers');
    }
  }

  private assetWhere(actor: AuthUser): Prisma.AssetWhereInput {
    if (IT_ROLES.includes(actor.role)) return {};
    if (actor.role === RoleName.MANAGER && actor.employeeId) {
      return {
        assignedEmployee: { OR: [{ managerId: actor.employeeId }, { id: actor.employeeId }] },
      };
    }
    return { id: -1 };
  }

  private employeeWhere(actor: AuthUser): Prisma.EmployeeWhereInput {
    if (IT_ROLES.includes(actor.role)) return {};
    if (actor.role === RoleName.MANAGER && actor.employeeId) {
      return { OR: [{ id: actor.employeeId }, { managerId: actor.employeeId }] };
    }
    return { id: -1 };
  }

  private requisitionWhere(actor: AuthUser): Prisma.PurchaseRequisitionWhereInput {
    const pending: Prisma.PurchaseRequisitionWhereInput = { status: 'pending_approval' };
    if (PROCURE_ADMIN.includes(actor.role)) return pending;
    if (actor.role === RoleName.MANAGER && actor.employeeId) {
      return {
        AND: [
          pending,
          {
            OR: [
              { requesterId: actor.id },
              { ownerEmployeeId: actor.employeeId },
              { owner: { managerId: actor.employeeId } },
              { approvers: { some: { userId: actor.id } } },
            ],
          },
        ],
      };
    }
    return { id: -1 };
  }

  // ------------------------------------------------------------------ reports

  private async assetReport(actor: AuthUser): Promise<ReportData> {
    const assets = await this.prisma.asset.findMany({
      where: this.assetWhere(actor),
      include: { category: true, location: true, department: true, assignedEmployee: true },
      orderBy: { assetCode: 'asc' },
    });
    const canSeeCost = actor.role === RoleName.SUPER_ADMIN || actor.role === RoleName.IT_ADMIN;
    return {
      title: 'Asset Report',
      columns: [
        { header: 'Asset Code', key: 'assetCode', width: 90 },
        { header: 'Category', key: 'category', width: 55 },
        { header: 'Brand', key: 'brand', width: 60 },
        { header: 'Model', key: 'model', width: 80 },
        { header: 'Serial', key: 'serial', width: 80 },
        { header: 'Status', key: 'status', width: 70 },
        { header: 'Location', key: 'location', width: 55 },
        { header: 'Assigned To', key: 'assignedTo', width: 90 },
        { header: 'Warranty End', key: 'warrantyEnd', width: 70 },
        ...(canSeeCost ? [{ header: 'Cost (INR)', key: 'cost', width: 65 }] : []),
      ],
      rows: assets.map((a) => ({
        assetCode: a.assetCode,
        category: a.category?.code ?? '',
        brand: a.brand ?? '',
        model: a.model ?? '',
        serial: a.serialNumber ?? '',
        status: a.status,
        location: a.location?.code ?? '',
        assignedTo: a.assignedEmployee
          ? `${a.assignedEmployee.firstName} ${a.assignedEmployee.lastName}`
          : '',
        warrantyEnd: fmtDate(a.warrantyEnd),
        ...(canSeeCost ? { cost: a.purchaseCost ? a.purchaseCost.toString() : '' } : {}),
      })),
    };
  }

  private async employeeReport(actor: AuthUser): Promise<ReportData> {
    const employees = await this.prisma.employee.findMany({
      where: this.employeeWhere(actor),
      include: {
        location: true,
        department: true,
        _count: { select: { assignedAssets: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });
    return {
      title: 'Employee Report',
      columns: [
        { header: 'Code', key: 'code', width: 70 },
        { header: 'Name', key: 'name', width: 120 },
        { header: 'Email', key: 'email', width: 150 },
        { header: 'Location', key: 'location', width: 60 },
        { header: 'Department', key: 'department', width: 90 },
        { header: 'Designation', key: 'designation', width: 100 },
        { header: 'Assets', key: 'assets', width: 45 },
      ],
      rows: employees.map((e) => ({
        code: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        location: e.location?.code ?? '',
        department: e.department?.name ?? '',
        designation: e.designation ?? '',
        assets: e._count.assignedAssets,
      })),
    };
  }

  private async locationReport(actor: AuthUser): Promise<ReportData> {
    const assetWhere = this.assetWhere(actor);
    const empWhere = this.employeeWhere(actor);
    let locationWhere: Prisma.LocationWhereInput = {};
    if (!IT_ROLES.includes(actor.role)) {
      const [assetLocs, empLocs] = await Promise.all([
        this.prisma.asset.findMany({
          where: assetWhere,
          select: { locationId: true },
          distinct: ['locationId'],
        }),
        this.prisma.employee.findMany({
          where: empWhere,
          select: { locationId: true },
          distinct: ['locationId'],
        }),
      ]);
      locationWhere = {
        id: { in: [...assetLocs.map((a) => a.locationId), ...empLocs.map((e) => e.locationId)] },
      };
    }
    const [locations, byStatus, empCounts] = await Promise.all([
      this.prisma.location.findMany({
        where: locationWhere,
        orderBy: { code: 'asc' },
      }),
      this.prisma.asset.groupBy({
        by: ['locationId', 'status'],
        where: assetWhere,
        _count: { _all: true },
      }),
      this.prisma.employee.groupBy({
        by: ['locationId'],
        where: empWhere,
        _count: { _all: true },
      }),
    ]);
    const empMap = new Map(empCounts.map((e) => [e.locationId, e._count._all]));
    const statusMap = new Map<string, number>();
    for (const g of byStatus) statusMap.set(`${g.locationId}:${g.status}`, g._count._all);
    const totalMap = new Map<number, number>();
    for (const g of byStatus)
      totalMap.set(g.locationId, (totalMap.get(g.locationId) ?? 0) + g._count._all);

    return {
      title: 'Location Report',
      columns: [
        { header: 'Code', key: 'code', width: 55 },
        { header: 'Location', key: 'name', width: 130 },
        { header: 'City', key: 'city', width: 90 },
        { header: 'Employees', key: 'employees', width: 70 },
        { header: 'Total Assets', key: 'total', width: 75 },
        { header: 'Assigned', key: 'assigned', width: 65 },
        { header: 'Available', key: 'available', width: 65 },
        { header: 'Under Repair', key: 'underRepair', width: 80 },
      ],
      rows: locations.map((l) => ({
        code: l.code,
        name: l.name,
        city: l.city,
        employees: empMap.get(l.id) ?? 0,
        total: totalMap.get(l.id) ?? 0,
        assigned: statusMap.get(`${l.id}:assigned`) ?? 0,
        available: statusMap.get(`${l.id}:available`) ?? 0,
        underRepair: statusMap.get(`${l.id}:under_repair`) ?? 0,
      })),
    };
  }

  private async warrantyReport(actor: AuthUser): Promise<ReportData> {
    const assets = await this.prisma.asset.findMany({
      where: {
        ...this.assetWhere(actor),
        warrantyEnd: { not: null, gte: new Date() },
        status: { notIn: ['retired', 'disposed'] },
      },
      include: { location: true, category: true },
    });
    const rows = assets
      .map((a) => ({
        assetCode: a.assetCode,
        item: `${a.brand ?? ''} ${a.model ?? ''}`.trim(),
        location: a.location?.code ?? '',
        warrantyEnd: fmtDate(a.warrantyEnd),
        // warrantyEnd is guaranteed non-null by the `where` filter above.
        daysRemaining: daysRemaining(a.warrantyEnd as Date),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      title: 'Warranty expiring soon (upcoming dates only)',
      columns: [
        { header: 'Asset Code', key: 'assetCode', width: 100 },
        { header: 'Item', key: 'item', width: 140 },
        { header: 'Location', key: 'location', width: 70 },
        { header: 'Warranty End', key: 'warrantyEnd', width: 90 },
        { header: 'Days Remaining', key: 'daysRemaining', width: 90 },
      ],
      rows,
    };
  }

  private async ticketsByClientReport(): Promise<ReportData> {
    const clients = await this.prisma.clientAccount.findMany({ orderBy: { code: 'asc' } });
    const grouped = await this.prisma.supportTicket.groupBy({
      by: ['clientId', 'status'],
      _count: { _all: true },
      where: { clientId: { not: null } },
    });
    const counts = new Map<string, number>();
    for (const g of grouped) {
      const key = `${g.clientId}:${g.status}`;
      counts.set(key, g._count._all);
    }
    const rows = clients.flatMap((c) => {
      const statuses = ['open', 'assigned', 'in_progress', 'waiting_on_employee', 'resolved', 'closed'];
      return statuses.map((status) => ({
        clientCode: c.code,
        clientName: c.name,
        status,
        count: counts.get(`${c.id}:${status}`) ?? 0,
      }));
    });
    return {
      title: 'Tickets by client',
      columns: [
        { header: 'Client code', key: 'clientCode' },
        { header: 'Client name', key: 'clientName' },
        { header: 'Status', key: 'status' },
        { header: 'Count', key: 'count' },
      ],
      rows,
    };
  }

  private async suppliesReport(): Promise<ReportData> {
    const [accessories, consumables, openCheckouts, recentIssues] = await Promise.all([
      this.prisma.accessory.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.consumable.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.accessoryCheckout.findMany({
        where: { checkedInAt: null },
        include: {
          accessory: true,
          employee: { select: { employeeCode: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.consumableIssue.findMany({
        include: {
          consumable: true,
          employee: { select: { employeeCode: true, firstName: true, lastName: true } },
        },
        orderBy: { issuedAt: 'desc' },
        take: 2000,
      }),
    ]);

    const rows: Record<string, string | number>[] = [
      ...accessories.map((a) => ({
        kind: 'accessory',
        name: a.name,
        category: a.category,
        total: a.quantityTotal,
        available: a.quantityTotal - a.quantityCheckedOut,
        checkedOut: a.quantityCheckedOut,
        lowStock: '',
        issuedTo: '',
      })),
      ...consumables.map((c) => ({
        kind: 'consumable',
        name: c.name,
        category: c.category,
        total: c.quantityTotal,
        available: c.quantityAvailable,
        checkedOut: '',
        lowStock: c.quantityAvailable <= c.lowStockThreshold ? 'YES' : '',
        issuedTo: '',
      })),
      ...openCheckouts.map((co) => ({
        kind: 'checkout',
        name: co.accessory.name,
        category: co.accessory.category,
        total: co.quantity,
        available: '',
        checkedOut: co.quantity,
        lowStock: '',
        issuedTo: `${co.employee.firstName} ${co.employee.lastName} (${co.employee.employeeCode})`,
      })),
      ...recentIssues.map((is) => ({
        kind: 'issue',
        name: is.consumable.name,
        category: is.consumable.category,
        total: is.quantity,
        available: '',
        checkedOut: '',
        lowStock: '',
        issuedTo: `${is.employee.firstName} ${is.employee.lastName} (${is.employee.employeeCode})`,
      })),
    ];

    return {
      title: 'Accessories & Consumables Summary',
      columns: [
        { header: 'Kind', key: 'kind', width: 70 },
        { header: 'Name', key: 'name', width: 120 },
        { header: 'Category', key: 'category', width: 80 },
        { header: 'Total/Qty', key: 'total', width: 60 },
        { header: 'Available', key: 'available', width: 60 },
        { header: 'Checked Out', key: 'checkedOut', width: 70 },
        { header: 'Low Stock', key: 'lowStock', width: 60 },
        { header: 'Issued To', key: 'issuedTo', width: 140 },
      ],
      rows,
    };
  }

  private async procurementSpendReport(): Promise<ReportData> {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { status: { not: 'cancelled' } },
      include: { vendor: true },
      orderBy: { createdAt: 'desc' },
    });
    return {
      title: 'Procurement spend by vendor',
      columns: [
        { header: 'Vendor', key: 'vendor', width: 120 },
        { header: 'PO', key: 'po', width: 70 },
        { header: 'Status', key: 'status', width: 80 },
        { header: 'Total (INR)', key: 'total', width: 70 },
      ],
      rows: pos.map((p) => ({
        vendor: p.vendor.legalName,
        po: p.poNumber,
        status: p.status,
        total: Number(p.total),
      })),
    };
  }

  private async procurementOpenReport(actor: AuthUser): Promise<ReportData> {
    const rows = await this.prisma.purchaseRequisition.findMany({
      where: this.requisitionWhere(actor),
      include: {
        approvers: {
          where: { kind: 'required', status: 'pending' },
          include: { user: { select: { fullName: true } } },
        },
      },
    });
    return {
      title: 'Open requisitions awaiting approval',
      columns: [
        { header: 'Number', key: 'number', width: 80 },
        { header: 'Title', key: 'title', width: 140 },
        { header: 'Waiting on', key: 'waiting', width: 140 },
        { header: 'Total (INR)', key: 'total', width: 70 },
      ],
      rows: rows.map((r) => ({
        number: r.requisitionNumber,
        title: r.title,
        waiting: r.approvers.map((a) => a.user.fullName).join(', '),
        total: Number(r.totalCost),
      })),
    };
  }

  private async procurementRenewalsReport(): Promise<ReportData> {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 90);
    const rows = await this.prisma.vendorContract.findMany({
      where: { endDate: { gte: new Date(), lte: horizon } },
      include: { vendor: true },
      orderBy: { endDate: 'asc' },
    });
    return {
      title: 'Upcoming contract renewals (90 days)',
      columns: [
        { header: 'Vendor', key: 'vendor', width: 120 },
        { header: 'Type', key: 'type', width: 80 },
        { header: 'End date', key: 'end', width: 80 },
        { header: 'Value (INR)', key: 'value', width: 70 },
      ],
      rows: rows.map((c) => ({
        vendor: c.vendor.legalName,
        type: c.type,
        end: fmtDate(c.endDate),
        value: Number(c.value),
      })),
    };
  }

  private async procurementOverdueReport(): Promise<ReportData> {
    const rows = await this.prisma.vendorInvoice.findMany({
      where: {
        OR: [
          { paymentStatus: 'overdue' },
          { paymentStatus: 'pending', dueDate: { lt: new Date() } },
        ],
      },
      include: { vendor: true },
    });
    return {
      title: 'Overdue vendor payments',
      columns: [
        { header: 'Vendor', key: 'vendor', width: 120 },
        { header: 'Invoice', key: 'invoice', width: 80 },
        { header: 'Due', key: 'due', width: 70 },
        { header: 'Amount (INR)', key: 'amount', width: 70 },
        { header: 'Match', key: 'match', width: 70 },
      ],
      rows: rows.map((i) => ({
        vendor: i.vendor.legalName,
        invoice: i.invoiceNumber,
        due: fmtDate(i.dueDate),
        amount: Number(i.amount),
        match: i.matchStatus,
      })),
    };
  }

  private async procurementScorecardsReport(): Promise<ReportData> {
    const rows = await this.prisma.vendor.findMany({
      where: { ratingSummary: { not: null } },
      orderBy: { ratingSummary: 'desc' },
    });
    return {
      title: 'Vendor scorecard rankings',
      columns: [
        { header: 'Vendor', key: 'vendor', width: 120 },
        { header: 'Code', key: 'code', width: 70 },
        { header: 'Status', key: 'status', width: 80 },
        { header: 'Score', key: 'score', width: 60 },
      ],
      rows: rows.map((v) => ({
        vendor: v.legalName,
        code: v.vendorCode,
        status: v.status,
        score: Number(v.ratingSummary),
      })),
    };
  }
}

// ------------------------------------------------------------------ formatters

async function toCsv(data: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(data.title.slice(0, 31));
  ws.columns = data.columns.map((c) => ({ header: c.header, key: c.key, width: 20 }));
  for (const row of data.rows) ws.addRow(row);
  const buf = await wb.csv.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

function toPdf(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const startX = doc.page.margins.left;
    const usableRight = doc.page.width - doc.page.margins.right;

    doc.fontSize(16).font('Helvetica-Bold').text(data.title, { align: 'left' });
    doc.moveDown(0.3);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666')
      .text(
        `Generated ${new Date().toISOString().slice(0, 19).replace('T', ' ')} · ${data.rows.length} rows`,
      );
    doc.fillColor('#000').moveDown(0.5);

    const colX: number[] = [];
    let x = startX;
    for (const col of data.columns) {
      colX.push(x);
      x += col.width ?? 80;
    }

    const rowHeight = 14;
    const drawHeader = () => {
      const y = doc.y;
      doc.fontSize(8).font('Helvetica-Bold');
      data.columns.forEach((col, i) => {
        doc.text(col.header, colX[i], y, { width: (col.width ?? 80) - 4, ellipsis: true });
      });
      doc
        .moveTo(startX, y + rowHeight - 3)
        .lineTo(usableRight, y + rowHeight - 3)
        .strokeColor('#cccccc')
        .stroke();
      doc.y = y + rowHeight;
      doc.font('Helvetica');
    };

    drawHeader();
    for (const row of data.rows) {
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      data.columns.forEach((col, i) => {
        doc.fontSize(8).text(String(row[col.key] ?? ''), colX[i], y, {
          width: (col.width ?? 80) - 4,
          ellipsis: true,
        });
      });
      doc.y = y + rowHeight;
    }

    doc.end();
  });
}

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}
