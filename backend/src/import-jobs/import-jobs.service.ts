import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ImportJobStatus, ImportKind, Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { ImportExportService } from '../import-export/import-export.service';
import { parseTabular, type Row } from '../import-export/parse';
import { PrismaService } from '../prisma/prisma.service';
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

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SAMPLE_SIZE = 8;

const omitFile = { fileData: false } as const;

@Injectable()
export class ImportJobsService {
  private readonly logger = new Logger(ImportJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly importer: ImportExportService,
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
    if (file.buffer.length > MAX_FILE_BYTES) {
      throw new BadRequestException(`File exceeds ${MAX_FILE_BYTES / (1024 * 1024)} MB limit`);
    }
    const rows = await parseTabular(file.buffer, file.originalname);
    const headers = headersOf(rows);
    const canonical = kind === 'assets' ? ASSET_CANONICAL_FIELDS : EMPLOYEE_CANONICAL_FIELDS;
    const mapping = suggestMapping(headers, canonical);
    const preview = {
      headers,
      sampleRows: rows.slice(0, SAMPLE_SIZE),
      suggestedMapping: mapping,
      canonical: [...canonical],
    };
    return this.prisma.importJob.create({
      data: {
        kind,
        filename: file.originalname,
        status: 'queued',
        mapping,
        totalRows: rows.length,
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
  async commit(id: number, actor: AuthUser, mapping?: ColumnMapping) {
    const job = await this.loadWithFile(id);
    this.assertMutable(job.status);
    const nextMapping = mapping ?? ((job.mapping as ColumnMapping | null) ?? {});
    await this.prisma.importJob.update({
      where: { id },
      data: { status: 'running', mapping: nextMapping, startedAt: new Date() },
    });
    setImmediate(() => {
      this.process(id, actor).catch((e) => this.logger.error(`Import job ${id} failed`, e));
    });
    return this.get(id);
  }

  async process(id: number, actor: AuthUser) {
    const job = await this.loadWithFile(id);
    try {
      const mapping = (job.mapping as ColumnMapping | null) ?? {};
      const raw = await this.parseJob(job);
      const rows = applyMapping(raw, mapping);
      const scan = await this.scanDuplicates(job.kind, rows);
      const skip = new Set(scan.skipRows);
      const toImport: Row[] = [];
      const dupErrors: ImportRowError[] = [];
      rows.forEach((row, i) => {
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

      const imported =
        job.kind === 'assets'
          ? await this.importer.importAssetRows(toImport, actor)
          : await this.importer.importEmployeeRows(toImport, actor);

      // importAssetRows numbers rows as if `toImport` were the whole file; rewrite using original positions.
      const errors = [...dupErrors, ...imported.errors];
      return this.prisma.importJob.update({
        where: { id },
        data: {
          status: 'completed',
          createdCount: imported.created,
          failedCount: imported.failed + dupErrors.length,
          duplicateCount: scan.hits.length,
          errors: errors as unknown as Prisma.InputJsonValue,
          createdIds: imported.createdIds,
          finishedAt: new Date(),
        },
        omit: omitFile,
      });
    } catch (e) {
      await this.prisma.importJob.update({
        where: { id },
        data: {
          status: 'failed',
          errors: [
            importRowError(0, ImportErrorCode.UNKNOWN, (e as Error).message),
          ],
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
