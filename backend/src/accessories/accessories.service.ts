import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustStockDto,
  CheckoutAccessoryDto,
  CreateAccessoryDto,
  UpdateAccessoryDto,
} from './dto';

const accessoryInclude = {
  checkouts: {
    where: { checkedInAt: null },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      },
    },
    orderBy: { checkedOutAt: 'desc' as const },
    take: 200,
  },
} satisfies Prisma.AccessoryInclude;

@Injectable()
export class AccessoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListQuery & { category?: string }) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'name', 'category', 'createdAt']);
    const where: Prisma.AccessoryWhereInput = {
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
    const [data, total] = await Promise.all([
      this.prisma.accessory.findMany({ where, skip, take, orderBy, include: accessoryInclude }),
      this.prisma.accessory.count({ where }),
    ]);
    return {
      data: data.map((a) => ({
        ...a,
        quantityAvailable: a.quantityTotal - a.quantityCheckedOut,
      })),
      total,
    };
  }

  async get(id: number) {
    const accessory = await this.prisma.accessory.findUnique({
      where: { id },
      include: {
        checkouts: {
          include: {
            employee: {
              select: { id: true, employeeCode: true, firstName: true, lastName: true },
            },
            processedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { checkedOutAt: 'desc' },
          take: 500,
        },
      },
    });
    if (!accessory) {
      throw new NotFoundException(`Accessory ${id} not found`);
    }
    return {
      ...accessory,
      quantityAvailable: accessory.quantityTotal - accessory.quantityCheckedOut,
    };
  }

  async create(dto: CreateAccessoryDto, actor: AuthUser) {
    const accessory = await this.prisma.accessory.create({
      data: {
        name: dto.name.trim(),
        category: dto.category.trim(),
        quantityTotal: dto.quantityTotal,
        quantityCheckedOut: 0,
      },
    });
    await this.audit.record({
      entityType: 'Accessory',
      entityId: accessory.id,
      action: 'create',
      summary: `Created accessory ${accessory.name}`,
      changedById: actor.id,
      newValue: accessory,
    });
    return { ...accessory, quantityAvailable: accessory.quantityTotal };
  }

  async update(id: number, dto: UpdateAccessoryDto, actor: AuthUser) {
    const before = await this.prisma.accessory.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException(`Accessory ${id} not found`);
    }
    if (dto.quantityTotal !== undefined && dto.quantityTotal < before.quantityCheckedOut) {
      throw new BadRequestException('Total quantity cannot be less than checked-out quantity');
    }
    const accessory = await this.prisma.accessory.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        category: dto.category?.trim(),
        quantityTotal: dto.quantityTotal,
      },
    });
    await this.audit.record({
      entityType: 'Accessory',
      entityId: id,
      action: 'update',
      summary: `Updated accessory ${accessory.name}`,
      changedById: actor.id,
      oldValue: before,
      newValue: accessory,
    });
    return {
      ...accessory,
      quantityAvailable: accessory.quantityTotal - accessory.quantityCheckedOut,
    };
  }

  async checkout(id: number, dto: CheckoutAccessoryDto, actor: AuthUser) {
    const qty = dto.quantity ?? 1;
    const result = await this.prisma.$transaction(async (tx) => {
      const accessory = await tx.accessory.findUnique({ where: { id } });
      if (!accessory) {
        throw new NotFoundException(`Accessory ${id} not found`);
      }
      const available = accessory.quantityTotal - accessory.quantityCheckedOut;
      if (qty > available) {
        throw new BadRequestException(`Only ${available} available (${accessory.name})`);
      }
      const employee = await tx.employee.findUnique({ where: { id: dto.employeeId } });
      if (!employee) {
        throw new BadRequestException(`Employee ${dto.employeeId} not found`);
      }
      if (!employee.isActive) {
        throw new BadRequestException(
          `${employee.employeeCode} is inactive — cannot check out to them`,
        );
      }
      const checkout = await tx.accessoryCheckout.create({
        data: {
          accessoryId: id,
          employeeId: dto.employeeId,
          quantity: qty,
          processedById: actor.id,
          notes: dto.notes,
        },
        include: {
          employee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      });
      const updated = await tx.accessory.update({
        where: { id },
        data: { quantityCheckedOut: { increment: qty } },
      });
      await this.audit.record(
        {
          entityType: 'Accessory',
          entityId: id,
          action: 'checkout',
          summary: `Checked out ${qty}× ${accessory.name} to ${employee.firstName} ${employee.lastName}`,
          changedById: actor.id,
          oldValue: { quantityCheckedOut: accessory.quantityCheckedOut },
          newValue: { quantityCheckedOut: updated.quantityCheckedOut, checkoutId: checkout.id },
        },
        tx,
      );
      return checkout;
    });
    return result;
  }

  async checkin(id: number, checkoutId: number, actor: AuthUser) {
    const result = await this.prisma.$transaction(async (tx) => {
      const checkout = await tx.accessoryCheckout.findFirst({
        where: { id: checkoutId, accessoryId: id, checkedInAt: null },
      });
      if (!checkout) {
        throw new NotFoundException('Open checkout not found');
      }
      const accessory = await tx.accessory.findUniqueOrThrow({ where: { id } });
      const checkedIn = await tx.accessoryCheckout.update({
        where: { id: checkoutId },
        data: { checkedInAt: new Date() },
      });
      const updated = await tx.accessory.update({
        where: { id },
        data: { quantityCheckedOut: { decrement: checkout.quantity } },
      });
      await this.audit.record(
        {
          entityType: 'Accessory',
          entityId: id,
          action: 'checkin',
          summary: `Checked in ${checkout.quantity}× ${accessory.name}`,
          changedById: actor.id,
          oldValue: { quantityCheckedOut: accessory.quantityCheckedOut },
          newValue: { quantityCheckedOut: updated.quantityCheckedOut, checkoutId },
        },
        tx,
      );
      return checkedIn;
    });
    return result;
  }

  async adjustStock(id: number, dto: AdjustStockDto, actor: AuthUser) {
    const before = await this.prisma.accessory.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException(`Accessory ${id} not found`);
    }
    if (dto.quantityTotal < before.quantityCheckedOut) {
      throw new BadRequestException('Total cannot be below checked-out count');
    }
    const accessory = await this.prisma.accessory.update({
      where: { id },
      data: { quantityTotal: dto.quantityTotal },
    });
    await this.audit.record({
      entityType: 'Accessory',
      entityId: id,
      action: 'stock_adjust',
      summary: `Adjusted stock for ${accessory.name}: ${before.quantityTotal} → ${dto.quantityTotal}`,
      changedById: actor.id,
      oldValue: { quantityTotal: before.quantityTotal },
      newValue: { quantityTotal: dto.quantityTotal },
    });
    return {
      ...accessory,
      quantityAvailable: accessory.quantityTotal - accessory.quantityCheckedOut,
    };
  }
}
