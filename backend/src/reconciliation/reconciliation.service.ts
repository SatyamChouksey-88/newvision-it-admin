import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReconciliationKind } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { parseTabular } from '../import-export/parse';
import { PrismaService } from '../prisma/prisma.service';
import { reconcileSets, type ReconcileItem } from './diff';

const FILE_KEY_ALIASES: Record<string, string[]> = {
  employeeCode: ['employeeCode', 'employee_code', 'empcode', 'emp_code', 'code'],
  email: ['email', 'emailaddress', 'workemail'],
  assetCode: ['assetCode', 'asset_code', 'assetid', 'code'],
  serialNumber: ['serialNumber', 'serial_number', 'serial', 'serialno'],
};

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'createdAt', 'kind']);
    const [data, total] = await Promise.all([
      this.prisma.reconciliationRun.findMany({
        skip,
        take,
        orderBy,
        include: { createdBy: { select: { id: true, fullName: true } } },
      }),
      this.prisma.reconciliationRun.count(),
    ]);
    return { data, total };
  }

  async get(id: number) {
    const run = await this.prisma.reconciliationRun.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
    if (!run) throw new NotFoundException(`Reconciliation run ${id} not found`);
    return run;
  }

  async run(
    file: { buffer: Buffer; originalname: string },
    kind: ReconciliationKind,
    matchField: string,
    actor: AuthUser,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('No file uploaded (field name must be "file")');
    const allowed =
      kind === 'employees' ? ['employeeCode', 'email'] : ['assetCode', 'serialNumber'];
    if (!allowed.includes(matchField)) {
      throw new BadRequestException(`matchField must be one of: ${allowed.join(', ')}`);
    }

    const rows = await parseTabular(file.buffer, file.originalname);
    const fileItems = this.extractFileItems(rows, matchField);
    const systemItems = await this.loadSystemItems(kind, matchField);
    const diff = reconcileSets(fileItems, systemItems);

    const findings = {
      inFileOnly: diff.inFileOnly.slice(0, 500),
      inSystemOnly: diff.inSystemOnly.slice(0, 500),
      truncated:
        diff.inFileOnly.length > 500 || diff.inSystemOnly.length > 500
          ? { inFileOnly: diff.inFileOnly.length, inSystemOnly: diff.inSystemOnly.length }
          : null,
    };

    return this.prisma.reconciliationRun.create({
      data: {
        kind,
        filename: file.originalname,
        matchField,
        inFileOnly: diff.inFileOnly.length,
        inSystemOnly: diff.inSystemOnly.length,
        matched: diff.matched.length,
        findings: findings as unknown as Prisma.InputJsonValue,
        createdById: actor.id,
      },
    });
  }

  private extractFileItems(rows: Record<string, string>[], matchField: string): ReconcileItem[] {
    const aliases = FILE_KEY_ALIASES[matchField] ?? [matchField];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const aliasNorm = new Set(aliases.map(norm));
    return rows
      .map((row) => {
        let key = '';
        for (const [col, val] of Object.entries(row)) {
          if (aliasNorm.has(norm(col))) {
            key = val;
            break;
          }
        }
        const label = row.firstName
          ? `${row.firstName} ${row.lastName ?? ''}`.trim()
          : row.brand
            ? `${row.brand} ${row.model ?? ''}`.trim()
            : key;
        return { key, label: label || key };
      })
      .filter((i) => i.key);
  }

  private async loadSystemItems(
    kind: ReconciliationKind,
    matchField: string,
  ): Promise<ReconcileItem[]> {
    if (kind === 'employees') {
      const employees = await this.prisma.employee.findMany({
        select: { employeeCode: true, email: true, firstName: true, lastName: true },
      });
      return employees.map((e) => ({
        key: matchField === 'email' ? e.email : e.employeeCode,
        label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
      }));
    }
    const assets = await this.prisma.asset.findMany({
      select: { assetCode: true, serialNumber: true, brand: true, model: true },
    });
    return assets
      .map((a) => ({
        key: matchField === 'serialNumber' ? (a.serialNumber ?? '') : a.assetCode,
        label: `${a.assetCode} ${a.brand ?? ''} ${a.model ?? ''}`.trim(),
      }))
      .filter((i) => i.key);
  }
}
