import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ImportJobStatus, ImportKind, Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { assertTabularUpload } from '../common/uploads';
import { ImportExportService } from '../import-export/import-export.service';
import { forEachTabularRow, parseTabular, type Row } from '../import-export/parse';
import { PrismaService } from '../prisma/prisma.service';
import { runWithTenant } from '../tenancy/context';
import { TenantService } from '../tenancy/tenant.service';
import {
  applyMapping,
  ASSET_CANONICAL_FIELDS,
  EMPLOYEE_CANONICAL_FIELDS,
  headersOf,
  suggestMapping,
  type ColumnMapping,
} from './column-map';
import {
  ImportErrorCode,
  importRowError,
  type ImportRowError,
} from '../import-export/import-errors';
import { findDuplicates } from './duplicates';

const SAMPLE_SIZE = 50;

const omitFile = { fileData: false } as const;

@Injectable()
export class ImportJobsService {
  private readonly logger = new Logger(ImportJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly importer: ImportExportService,
    private readonly tenants: TenantService,
  ) {}

  async list(query: ListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'createdAt', 'status', 'kind']);
    const [data, total] = await Promise.all([
      this.prisma.importJob.findMany({
        skip,
        take,
        orderBy,
        omit: omitFile,
        include: { createdBy: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.importJob.count(),
    ]);
    return { data, total };
  }

  async get(id: number) {
    const job = await this.prisma.importJob.findUnique({
      where: { id },
      omit: omitFile,
      include: { createdBy: { select: { id: true, fullName: true, email: true } } },
    });
    if (!job) throw new NotFoundException(`Import job ${id} not found`);
    return job;
  }

  async create(file: { buffer: Buffer; originalname: string }, kind: ImportKind, actor: AuthUser) {
    if (!file?.buffer?.length) throw new BadRequestException('No file uploaded (field name must be "file")');
    assertTabularUpload({ originalname: file.originalname, size: file.buffer.length });
    const sampleRows: Row[] = [];
    let headers: string[] = [];
    const { rowCount } = await forEachTabularRow(file.buffer, file.originalname, (row) => {
      if (!headers.length) headers = headersOf([row]);
      if (sampleRows.length < SAMPLE_SIZE) sampleRows.push(row);
    });
    const canonical = kind === 'assets' ? ASSET_CANONICAL_FIELDS : EMPLOYEE_CANONICAL_FIELDS;
    const mapping = suggestMapping(headers, canonical);
    const preview = {
      headers,
      sampleRows,
      suggestedMapping: mapping,
      canonical: [...canonical],
    };
    return this.prisma.importJob.create({
      data: {
        kind,
        filename: file.originalname,
        status: 'queued',
        mapping,
        totalRows: rowCount,
        preview: preview as unknown as Prisma.InputJsonValue,
        fileData: new Uint8Array(file.buffer),
        createdById: actor.id,
      },
      omit: omitFile,
    });
  }

  async preview(id: number, mapping: ColumnMapping) {
    const job = await this.loadWithFile(id);
    this.assertMutable(job.status);
    const rows = applyMapping(await this.parseJob(job), mapping);
    const scan = await this.scanDuplicates(job.kind, rows);
    const preview = {
      ...(job.preview as object),
      mapping,
      sampleRows: rows.slice(0, SAMPLE_SIZE),
      duplicates: scan.hits,
      skipRows: scan.skipRows,
    };
    return this.prisma.importJob.update({
      where: { id },
      data: {
        status: 'previewed',
        mapping: mapping as unknown as Prisma.InputJsonValue,
        duplicateCount: scan.hits.length,
        preview: preview as unknown as Prisma.InputJsonValue,
      },
      omit: omitFile,
    });
  }

  /**
   * Persist mapping, mark running, and process in-process (setImmediate).
   * Tests should call `process(id, actor)` directly instead of waiting on the event loop.
   */
  async commit(id: number, actor: AuthUser, mapping?: ColumnMapping, validateOnly?: boolean) {
    const job = await this.loadWithFile(id);
    this.assertMutable(job.status);
    const nextMapping = mapping ?? ((job.mapping as ColumnMapping | null) ?? {});
    await this.prisma.importJob.update({
      where: { id },
      data: {
        status: 'running',
        mapping: nextMapping,
        startedAt: new Date(),
        preview: {
          ...(job.preview as object),
          validateOnly: Boolean(validateOnly),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    const tenantId = actor.tenantId;
    setImmediate(() => {
      runWithTenant(tenantId, () => this.process(id, actor, validateOnly)).catch((e) =>
        this.logger.error(`Import job ${id} failed`, e),
      );
    });
    return this.get(id);
  }

  async process(id: number, actor: AuthUser, validateOnly?: boolean) {
    const job = await this.loadWithFile(id);
    try {
      const mapping = (job.mapping as ColumnMapping | null) ?? {};
      const mappedRows: Row[] = [];
      await this.forEachMappedJobRow(job, mapping, (row) => {
        mappedRows.push(row);
      });
      const scan = await this.scanDuplicates(job.kind, mappedRows);
      const skip = new Set(scan.skipRows);
      const toImport: Row[] = [];
      const dupErrors: ImportRowError[] = [];
      mappedRows.forEach((row, i) => {
        const rowNum = i + 2;
        if (skip.has(rowNum)) {
          const hit = scan.hits.find((h) => h.row === rowNum);
          const code =
            hit?.reason === 'in_system'
              ? ImportErrorCode.DUPLICATE_IN_SYSTEM
              : ImportErrorCode.DUPLICATE_IN_FILE;
          dupErrors.push(
            importRowError(
              rowNum,
              code,
              `Duplicate ${hit?.key ?? 'key'} "${hit?.value ?? ''}" (${hit?.reason ?? 'duplicate'})`,
              row,
            ),
          );
        } else {
          toImport.push(row);
        }
      });

      const imported = validateOnly
        ? { created: 0, failed: 0, errors: [] as ImportRowError[], createdIds: [] as number[] }
        : job.kind === 'assets'
          ? await this.importAssetRowsInBatches(toImport, actor)
          : await this.importEmployeeRowsInBatches(toImport, actor);

      // importAssetRows numbers rows as if `toImport` were the whole file; rewrite using original positions.
      const errors = [...dupErrors, ...imported.errors];
      const updated = await this.prisma.importJob.update({
        where: { id },
        data: {
          status: 'completed',
          createdCount: imported.created,
          failedCount: imported.failed + dupErrors.length,
          duplicateCount: scan.hits.length,
          errors: errors as unknown as Prisma.InputJsonValue,
          createdIds: validateOnly ? [] : imported.createdIds,
          finishedAt: new Date(),
        },
        omit: omitFile,
      });
      if (!validateOnly && imported.created > 0) {
        await this.tenants.markStep(
          actor,
          job.kind === 'assets' ? 'importAssets' : 'importEmployees',
        );
      }
      return updated;
    } catch (e) {
      await this.prisma.importJob.update({
        where: { id },
        data: {
          status: 'failed',
          errors: [
            importRowError(0, ImportErrorCode.UNKNOWN, (e as Error).message),
          ] as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });
      throw e;
    }
  }

  async rollback(id: number, actor: AuthUser) {
    const job = await this.get(id);
    if (job.status !== 'completed') {
      throw new BadRequestException('Only a completed import can be rolled back');
    }
    const ids = Array.isArray(job.createdIds) ? (job.createdIds as number[]) : [];
    if (job.kind === 'assets') {
      await this.prisma.$transaction(async (tx) => {
        await tx.assetAssignment.deleteMany({ where: { assetId: { in: ids } } });
        await tx.assetTransfer.deleteMany({ where: { assetId: { in: ids } } });
        await tx.assetMaintenance.deleteMany({ where: { assetId: { in: ids } } });
        await tx.notification.deleteMany({ where: { assetId: { in: ids } } });
        await tx.asset.deleteMany({ where: { id: { in: ids } } });
      });
    } else {
      await this.prisma.employee.deleteMany({ where: { id: { in: ids } } });
    }
    await this.prisma.auditLog.create({
      data: {
        entityType: 'ImportJob',
        entityId: String(id),
        action: 'delete',
        summary: `Rolled back import job #${id} (${ids.length} ${job.kind})`,
        changedById: actor.id,
      },
    });
    return this.prisma.importJob.update({
      where: { id },
      data: { status: 'rolled_back', finishedAt: new Date() },
      omit: omitFile,
    });
  }

  private async loadWithFile(id: number) {
    const job = await this.prisma.importJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Import job ${id} not found`);
    return job;
  }

  private async parseJob(job: { fileData: Uint8Array | null; filename: string }): Promise<Row[]> {
    if (!job.fileData) throw new BadRequestException('Import file is no longer stored');
    return parseTabular(Buffer.from(job.fileData), job.filename);
  }

  private async forEachMappedJobRow(
    job: { fileData: Uint8Array | null; filename: string },
    mapping: ColumnMapping,
    onRow: (row: Row) => void,
  ) {
    if (!job.fileData) throw new BadRequestException('Import file is no longer stored');
    const buffer = Buffer.from(job.fileData);
    const rawRows: Row[] = [];
    await forEachTabularRow(buffer, job.filename, (row) => {
      rawRows.push(row);
    });
    applyMapping(rawRows, mapping).forEach(onRow);
  }

  private async importAssetRowsInBatches(rows: Row[], actor: AuthUser) {
    const BATCH = 250;
    let created = 0;
    let failed = 0;
    const errors: ImportRowError[] = [];
    const createdIds: number[] = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const part = await this.importer.importAssetRows(chunk, actor);
      created += part.created;
      failed += part.failed;
      errors.push(...part.errors);
      createdIds.push(...part.createdIds);
    }
    return { created, failed, errors, createdIds };
  }

  private async importEmployeeRowsInBatches(rows: Row[], actor: AuthUser) {
    const BATCH = 250;
    let created = 0;
    let failed = 0;
    const errors: ImportRowError[] = [];
    const createdIds: number[] = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const part = await this.importer.importEmployeeRows(chunk, actor);
      created += part.created;
      failed += part.failed;
      errors.push(...part.errors);
      createdIds.push(...part.createdIds);
    }
    return { created, failed, errors, createdIds };
  }

  private async scanDuplicates(kind: ImportKind, rows: Row[]) {
    if (kind === 'assets') {
      const existing = await this.prisma.asset.findMany({
        where: { serialNumber: { not: null } },
        select: { serialNumber: true },
      });
      return findDuplicates(
        rows,
        'serialNumber',
        existing.map((a) => a.serialNumber ?? ''),
      );
    }
    const existing = await this.prisma.employee.findMany({ select: { email: true } });
    return findDuplicates(
      rows,
      'email',
      existing.map((e) => e.email),
    );
  }

  private assertMutable(status: ImportJobStatus) {
    if (status === 'running' || status === 'completed' || status === 'rolled_back') {
      throw new BadRequestException(`Import job cannot be changed while ${status}`);
    }
  }
}
