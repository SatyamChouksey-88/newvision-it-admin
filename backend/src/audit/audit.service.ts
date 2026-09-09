import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditRecordInput {
  entityType: string;
  entityId: string | number;
  action: AuditAction;
  summary: string;
  changedById?: number | null;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Append-only audit trail. This service intentionally exposes ONLY insert + read.
 * There is no update or delete method — audit rows must never be mutated from the app layer.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: String(input.entityId),
        action: input.action,
        summary: input.summary,
        changedById: input.changedById ?? null,
        oldValue: toJson(input.oldValue),
        newValue: toJson(input.newValue),
      },
    });
  }
}

/** Convert arbitrary values (incl. Date/Decimal) into Prisma-safe JSON, or DbNull when empty. */
export function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
