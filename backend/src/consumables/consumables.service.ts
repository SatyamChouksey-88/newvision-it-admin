import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, RoleName } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustConsumableStockDto,
  CreateConsumableDto,
  IssueConsumableDto,
  UpdateConsumableDto,
} from './dto';

@Injectable()
export class ConsumablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListQuery & { category?: string; lowStock?: string }) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'name', 'category', 'createdAt']);
    const where: Prisma.ConsumableWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { category: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.consumable.findMany({ where, skip, take, orderBy }),
      this.prisma.consumable.count({ where }),
    ]);
    const data =
      query.lowStock === 'true'
        ? rows.filter((c) => c.quantityAvailable <= c.lowStockThreshold)
        : rows;
    return { data, total: query.lowStock === 'true' ? data.length : total };
  }

  async get(id: number) {
    const consumable = await this.prisma.consumable.findUnique({
      where: { id },
      include: {
        issues: {
          include: {
            employee: {
              select: { id: true, employeeCode: true, firstName: true, lastName: true },
            },
            processedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { issuedAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!consumable) {
      throw new NotFoundException(`Consumable ${id} not found`);
    }
    return consumable;
  }

  async create(dto: CreateConsumableDto, actor: AuthUser) {
    const consumable = await this.prisma.consumable.create({
      data: {
        name: dto.name.trim(),
        category: dto.category.trim(),
        quantityTotal: dto.quantityTotal,
        quantityAvailable: dto.quantityTotal,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
      },
    });
    await this.audit.record({
      entityType: 'Consumable',
      entityId: consumable.id,
      action: 'create',
      summary: `Created consumable ${consumable.name}`,
      changedById: actor.id,
      newValue: consumable,
    });
    return consumable;
  }

  async update(id: number, dto: UpdateConsumableDto, actor: AuthUser) {
    const before = await this.prisma.consumable.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException(`Consumable ${id} not found`);
    }
    const issued = before.quantityTotal - before.quantityAvailable;
    const nextTotal = dto.quantityTotal ?? before.quantityTotal;
    if (nextTotal < issued) {
      throw new BadRequestException('Total cannot be below already-issued quantity');
    }
    const consumable = await this.prisma.consumable.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        category: dto.category?.trim(),
        quantityTotal: dto.quantityTotal,
        quantityAvailable: dto.quantityTotal !== undefined ? nextTotal - issued : undefined,
        lowStockThreshold: dto.lowStockThreshold,
      },
    });
    await this.audit.record({
      entityType: 'Consumable',
      entityId: id,
      action: 'update',
      summary: `Updated consumable ${consumable.name}`,
      changedById: actor.id,
      oldValue: before,
      newValue: consumable,
    });
    return consumable;
  }

  async issue(id: number, dto: IssueConsumableDto, actor: AuthUser) {
    const qty = dto.quantity ?? 1;
    const result = await this.prisma.$transaction(async (tx) => {
      const consumable = await tx.consumable.findUnique({ where: { id } });
      if (!consumable) {
        throw new NotFoundException(`Consumable ${id} not found`);
      }
      if (qty > consumable.quantityAvailable) {
        throw new BadRequestException(
          `Only ${consumable.quantityAvailable} available (${consumable.name})`,
        );
      }
      const employee = await tx.employee.findUnique({ where: { id: dto.employeeId } });
      if (!employee) {
        throw new BadRequestException(`Employee ${dto.employeeId} not found`);
      }
      const issue = await tx.consumableIssue.create({
        data: {
          consumableId: id,
          employeeId: dto.employeeId,
          quantity: qty,
          processedById: actor.id,
        },
        include: {
          employee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      });
      const updated = await tx.consumable.update({
        where: { id },
        data: { quantityAvailable: { decrement: qty } },
      });
      await this.audit.record(
        {
          entityType: 'Consumable',
          entityId: id,
          action: 'issue',
          summary: `Issued ${qty}× ${consumable.name} to ${employee.firstName} ${employee.lastName}`,
          changedById: actor.id,
          oldValue: { quantityAvailable: consumable.quantityAvailable },
          newValue: { quantityAvailable: updated.quantityAvailable, issueId: issue.id },
        },
        tx,
      );
      return { issue, updated };
    });

    if (result.updated.quantityAvailable <= result.updated.lowStockThreshold) {
      await this.notifyLowStock(result.updated);
    }
    return result.issue;
  }

  async adjustStock(id: number, dto: AdjustConsumableStockDto, actor: AuthUser) {
    const before = await this.prisma.consumable.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException(`Consumable ${id} not found`);
    }
    const issued = before.quantityTotal - before.quantityAvailable;
    if (dto.quantityAvailable + issued > before.quantityTotal) {
      // allow increasing total implicitly when adjusting available up
    }
    const consumable = await this.prisma.consumable.update({
      where: { id },
      data: { quantityAvailable: dto.quantityAvailable },
    });
    await this.audit.record({
      entityType: 'Consumable',
      entityId: id,
      action: 'stock_adjust',
      summary: `Adjusted available stock for ${consumable.name}: ${before.quantityAvailable} → ${dto.quantityAvailable}`,
      changedById: actor.id,
      oldValue: { quantityAvailable: before.quantityAvailable },
      newValue: { quantityAvailable: dto.quantityAvailable },
    });
    if (consumable.quantityAvailable <= consumable.lowStockThreshold) {
      await this.notifyLowStock(consumable);
    }
    return consumable;
  }

  private async notifyLowStock(consumable: {
    id: number;
    name: string;
    quantityAvailable: number;
    lowStockThreshold: number;
  }) {
    const itUsers = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] } } },
      select: { id: true },
    });
    await this.prisma.notification.createMany({
      data: itUsers.map((u) => ({
        userId: u.id,
        type: NotificationType.low_stock,
        title: 'Low stock alert',
        message: `${consumable.name} has ${consumable.quantityAvailable} left (threshold ${consumable.lowStockThreshold})`,
      })),
    });
  }
}
