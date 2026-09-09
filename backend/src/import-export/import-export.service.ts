import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  classifyImportMessage,
  ImportErrorCode,
  type ImportRowError,
  importRowError,
} from './import-errors';
import { parseTabular, Row } from './parse';

export interface AssetExportFilters {
  status?: string;
  locationId?: number;
  categoryId?: number;
  departmentId?: number;
  assignedEmployeeId?: number;
  /** Only assets whose warranty ends within the next N days (matches the list filter). */
  warrantyExpiringInDays?: number;
  q?: string;
}

export interface ImportResult {
  total: number;
  created: number;
  failed: number;
  errors: ImportRowError[];
  createdIds: number[];
}

const ASSET_COLUMNS = [
  'assetCode',
  'category',
  'brand',
  'model',
  'serialNumber',
  'status',
  'condition',
  'location',
  'department',
  'assignedEmployee',
  'purchaseDate',
  'purchaseCost',
  'warrantyStart',
  'warrantyEnd',
  'vendor',
  'invoiceNo',
];

const EMPLOYEE_COLUMNS = [
  'employeeCode',
  'firstName',
  'lastName',
  'email',
  'phone',
  'designation',
  'location',
  'department',
  'manager',
  'isActive',
  'dateJoined',
];

@Injectable()
export class ImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------- export

  async exportAssets(
    format: 'csv' | 'xlsx',
    filters: AssetExportFilters = {},
  ): Promise<{ buffer: Buffer; rowCount: number; filename: string }> {
    const now = new Date();
    const warrantyLimit = filters.warrantyExpiringInDays
      ? new Date(now.getTime() + filters.warrantyExpiringInDays * 86_400_000)
      : undefined;
    const assets = await this.prisma.asset.findMany({
      where: {
        ...(filters.status ? { status: filters.status as never } : {}),
        ...(filters.locationId ? { locationId: filters.locationId } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.assignedEmployeeId ? { assignedEmployeeId: filters.assignedEmployeeId } : {}),
        ...(warrantyLimit ? { warrantyEnd: { gte: now, lte: warrantyLimit } } : {}),
        ...(filters.q
          ? {
              OR: [
                { assetCode: { contains: filters.q, mode: 'insensitive' } },
                { serialNumber: { contains: filters.q, mode: 'insensitive' } },
                { model: { contains: filters.q, mode: 'insensitive' } },
                { brand: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { category: true, location: true, department: true, assignedEmployee: true },
      orderBy: { assetCode: 'asc' },
    });
    const rows = assets.map((a) => ({
      assetCode: a.assetCode,
      category: a.category?.code ?? '',
      brand: a.brand ?? '',
      model: a.model ?? '',
      serialNumber: a.serialNumber ?? '',
      status: a.status,
      condition: a.condition,
      location: a.location?.code ?? '',
      department: a.department?.name ?? '',
      assignedEmployee: a.assignedEmployee?.employeeCode ?? '',
      purchaseDate: fmtDate(a.purchaseDate),
      purchaseCost: a.purchaseCost ? a.purchaseCost.toString() : '',
      warrantyStart: fmtDate(a.warrantyStart),
      warrantyEnd: fmtDate(a.warrantyEnd),
      vendor: a.vendor ?? '',
      invoiceNo: a.invoiceNo ?? '',
    }));
    const base = this.scopeFilename(filters, 'assets');
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const buffer = await this.buildFile(ASSET_COLUMNS, rows, format, 'Assets');
    return { buffer, rowCount: rows.length, filename: `${base}.${ext}` };
  }

  private scopeFilename(filters: AssetExportFilters, prefix: string): string {
    const parts = [prefix];
    const hasFilter = Boolean(
      filters.status ||
        filters.locationId ||
        filters.categoryId ||
        filters.departmentId ||
        filters.assignedEmployeeId ||
        filters.warrantyExpiringInDays ||
        filters.q,
    );
    if (filters.locationId) parts.push(`loc${filters.locationId}`);
    if (filters.status) parts.push(String(filters.status));
    if (filters.categoryId) parts.push(`cat${filters.categoryId}`);
    if (filters.departmentId) parts.push(`dept${filters.departmentId}`);
    if (filters.assignedEmployeeId) parts.push(`emp${filters.assignedEmployeeId}`);
    if (filters.warrantyExpiringInDays) parts.push(`warranty${filters.warrantyExpiringInDays}d`);
    if (filters.q) parts.push('search');
    parts.push(hasFilter ? 'filtered' : 'all');
    return parts.join('_');
  }

  async exportEmployees(format: 'csv' | 'xlsx'): Promise<Buffer> {
    const employees = await this.prisma.employee.findMany({
      include: { location: true, department: true, manager: true },
      orderBy: { employeeCode: 'asc' },
    });
    const rows = employees.map((e) => ({
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      phone: e.phone ?? '',
      designation: e.designation ?? '',
      location: e.location?.code ?? '',
      department: e.department?.name ?? '',
      manager: e.manager?.employeeCode ?? '',
      isActive: e.isActive ? 'true' : 'false',
      dateJoined: fmtDate(e.dateJoined),
    }));
    return this.buildFile(EMPLOYEE_COLUMNS, rows, format, 'Employees');
  }

  private async buildFile(
    columns: string[],
    rows: Record<string, string>[],
    format: 'csv' | 'xlsx',
    sheetName: string,
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    ws.columns = columns.map((c) => ({ header: c, key: c, width: 18 }));
    for (const r of rows) {
      ws.addRow(r);
    }
    if (format === 'csv') {
      const buf = await wb.csv.writeBuffer();
      return Buffer.from(buf as ArrayBuffer);
    }
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf as ArrayBuffer);
  }

  // ---------------------------------------------------------------- import

  async importAssets(buffer: Buffer, filename: string, actor: AuthUser): Promise<ImportResult> {
    const rows = await parseTabular(buffer, filename);
    return this.importAssetRows(rows, actor);
  }

  /** Import already-parsed (and optionally remapped) asset rows. */
  async importAssetRows(rows: Row[], actor: AuthUser): Promise<ImportResult> {
    const result: ImportResult = {
      total: rows.length,
      created: 0,
      failed: 0,
      errors: [],
      createdIds: [],
    };

    // preload lookups
    const [locations, categories, departments] = await Promise.all([
      this.prisma.location.findMany(),
      this.prisma.assetCategory.findMany(),
      this.prisma.department.findMany(),
    ]);
    const locByCode = new Map(locations.map((l) => [l.code.toUpperCase(), l]));
    const catByCode = new Map(categories.map((c) => [c.code.toUpperCase(), c]));
    const depByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1
      try {
        const locationCode = (row.location || row.locationCode || '').toUpperCase();
        const categoryCode = (row.category || row.categoryCode || '').toUpperCase();
        const location = locByCode.get(locationCode);
        const category = catByCode.get(categoryCode);
        if (!location) {
          throw importRowError(
            rowNum,
            ImportErrorCode.UNKNOWN_LOCATION,
            `Unknown location code "${row.location}"`,
            row,
          );
        }
        if (!category) {
          throw importRowError(
            rowNum,
            ImportErrorCode.UNKNOWN_CATEGORY,
            `Unknown category code "${row.category}"`,
            row,
          );
        }
        const department = row.department ? depByName.get(row.department.toLowerCase()) : undefined;

        const created = await this.prisma.$transaction(async (tx) => {
          const assetCode =
            row.assetCode?.trim() ||
            (await this.generateCode(tx, location.id, category.id, location.code, category.code));
          const asset = await tx.asset.create({
            data: {
              assetCode,
              categoryId: category.id,
              locationId: location.id,
              departmentId: department?.id ?? null,
              brand: row.brand || null,
              model: row.model || null,
              serialNumber: row.serialNumber || null,
              purchaseDate: parseDate(row.purchaseDate),
              purchaseCost: row.purchaseCost ? Number(row.purchaseCost) : null,
              warrantyStart: parseDate(row.warrantyStart),
              warrantyEnd: parseDate(row.warrantyEnd),
              condition: normalizeCondition(row.condition),
              vendor: row.vendor || null,
              invoiceNo: row.invoiceNo || null,
              status: 'available',
            },
          });
          await this.audit.record(
            {
              entityType: 'Asset',
              entityId: asset.id,
              action: 'import',
              summary: `Imported asset ${asset.assetCode}`,
              changedById: actor.id,
              newValue: asset,
            },
            tx,
          );
          return asset;
        });
        result.created++;
        result.createdIds.push(created.id);
      } catch (e) {
        result.failed++;
        if (e && typeof e === 'object' && 'code' in e) {
          result.errors.push(e as ImportRowError);
        } else {
          const msg = (e as Error).message;
          result.errors.push(importRowError(rowNum, classifyImportMessage(msg), msg, row));
        }
      }
    }
    return result;
  }

  async importEmployees(buffer: Buffer, filename: string, actor: AuthUser): Promise<ImportResult> {
    const rows = await parseTabular(buffer, filename);
    return this.importEmployeeRows(rows, actor);
  }

  async importEmployeeRows(rows: Row[], actor: AuthUser): Promise<ImportResult> {
    const result: ImportResult = {
      total: rows.length,
      created: 0,
      failed: 0,
      errors: [],
      createdIds: [],
    };

    const [locations, departments] = await Promise.all([
      this.prisma.location.findMany(),
      this.prisma.department.findMany(),
    ]);
    const locByCode = new Map(locations.map((l) => [l.code.toUpperCase(), l]));
    const depByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const locationCode = (row.location || row.locationCode || '').toUpperCase();
        const location = locByCode.get(locationCode);
        if (!location) {
          throw importRowError(
            rowNum,
            ImportErrorCode.UNKNOWN_LOCATION,
            `Unknown location code "${row.location}"`,
            row,
          );
        }
        if (!row.employeeCode) {
          throw importRowError(
            rowNum,
            ImportErrorCode.MISSING_REQUIRED,
            'Missing employeeCode',
            row,
          );
        }
        if (!row.email) {
          throw importRowError(rowNum, ImportErrorCode.MISSING_REQUIRED, 'Missing email', row);
        }
        const department = row.department ? depByName.get(row.department.toLowerCase()) : undefined;
        const manager = row.manager
          ? await this.prisma.employee.findUnique({ where: { employeeCode: row.manager } })
          : null;

        const created = await this.prisma.employee.create({
          data: {
            employeeCode: row.employeeCode,
            firstName: row.firstName || '',
            lastName: row.lastName || '',
            email: row.email.toLowerCase(),
            phone: row.phone || null,
            designation: row.designation || null,
            locationId: location.id,
            departmentId: department?.id ?? null,
            managerId: manager?.id ?? null,
            isActive: row.isActive ? row.isActive.toLowerCase() !== 'false' : true,
            dateJoined: parseDate(row.dateJoined),
          },
        });
        await this.audit.record({
          entityType: 'Employee',
          entityId: created.id,
          action: 'import',
          summary: `Imported employee ${created.employeeCode}`,
          changedById: actor.id,
          newValue: created,
        });
        result.created++;
        result.createdIds.push(created.id);
      } catch (e) {
        result.failed++;
        if (e && typeof e === 'object' && 'code' in e) {
          result.errors.push(e as ImportRowError);
        } else {
          const msg = (e as Error).message;
          result.errors.push(importRowError(rowNum, classifyImportMessage(msg), msg, row));
        }
      }
    }
    return result;
  }

  private async generateCode(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    locationId: number,
    categoryId: number,
    locationCode: string,
    categoryCode: string,
  ): Promise<string> {
    const existing = await tx.asset.findMany({
      where: { locationId, categoryId },
      select: { assetCode: true },
    });
    let maxSeq = 0;
    for (const { assetCode } of existing) {
      const m = /-(\d+)$/.exec(assetCode);
      if (m && Number(m[1]) > maxSeq) maxSeq = Number(m[1]);
    }
    const seq = String(maxSeq + 1).padStart(4, '0');
    return `AST-${locationCode.toUpperCase()}-${categoryCode.toUpperCase()}-${seq}`;
  }
}

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

function parseDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeCondition(v?: string): 'new' | 'good' | 'fair' | 'poor' {
  const c = (v || '').toLowerCase();
  return c === 'new' || c === 'fair' || c === 'poor' ? c : 'good';
}
