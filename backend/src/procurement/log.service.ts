import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma, ProcurementRecordType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProcurementLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async write(
    args: {
      recordType: ProcurementRecordType;
      recordId: number;
      action: string;
      summary: string;
      before?: unknown;
      after?: unknown;
      reason?: string;
      actor: AuthUser;
      auditAction?: AuditAction;
      entityType?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    await client.procurementActivityLog.create({
      data: {
        recordType: args.recordType,
        recordId: args.recordId,
        action: args.action,
        summary: args.summary,
        before:
          args.before === undefined
            ? undefined
            : (JSON.parse(JSON.stringify(args.before)) as Prisma.InputJsonValue),
        after:
          args.after === undefined
            ? undefined
            : (JSON.parse(JSON.stringify(args.after)) as Prisma.InputJsonValue),
        reason: args.reason,
        actorId: args.actor.id,
      },
    });
    await this.audit.record(
      {
        entityType: args.entityType ?? args.recordType,
        entityId: args.recordId,
        action: args.auditAction ?? (args.action === 'create' ? 'create' : 'update'),
        summary: args.summary,
        changedById: args.actor.id,
        oldValue: args.before,
        newValue: args.after,
      },
      tx,
    );
  }

  list(recordType: ProcurementRecordType, recordId: number) {
    return this.prisma.procurementActivityLog.findMany({
      where: { recordType, recordId },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, fullName: true, email: true } } },
    });
  }
}
