import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';
import { CreateIssueKitDto, IssueKitToEmployeeDto, UpdateIssueKitDto } from './dto';

const kitInclude = {
  category: { select: { id: true, code: true, name: true } },
  location: { select: { id: true, code: true, name: true } },
  accessories: { include: { accessory: true } },
} as const;

@Injectable()
export class IssueKitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetsService,
  ) {}

  list() {
    return this.prisma.issueKit.findMany({
      include: kitInclude,
      orderBy: { name: 'asc' },
    });
  }

  async get(id: number) {
    const kit = await this.prisma.issueKit.findUnique({ where: { id }, include: kitInclude });
    if (!kit) throw new NotFoundException(`Issue kit ${id} not found`);
    return kit;
  }

  async create(dto: CreateIssueKitDto, actor: AuthUser) {
    const category = await this.prisma.assetCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Unknown category');
    if (dto.locationId) {
      const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
      if (!loc) throw new BadRequestException('Unknown location');
    }
    const kit = await this.prisma.issueKit.create({
      data: {
        name: dto.name.trim(),
        categoryId: dto.categoryId,
        locationId: dto.locationId ?? null,
        notes: dto.notes ?? null,
        accessories: dto.accessoryIds?.length
          ? { create: dto.accessoryIds.map((accessoryId) => ({ accessoryId })) }
          : undefined,
      },
      include: kitInclude,
    });
    await this.prisma.auditLog.create({
      data: {
        entityType: 'IssueKit',
        entityId: String(kit.id),
        action: 'create',
        summary: `Created issue kit ${kit.name}`,
        changedById: actor.id,
      },
    });
    return kit;
  }

  async update(id: number, dto: UpdateIssueKitDto, actor: AuthUser) {
    await this.get(id);
    const kit = await this.prisma.$transaction(async (tx) => {
      if (dto.accessoryIds) {
        await tx.issueKitAccessory.deleteMany({ where: { kitId: id } });
        if (dto.accessoryIds.length) {
          await tx.issueKitAccessory.createMany({
            data: dto.accessoryIds.map((accessoryId) => ({ kitId: id, accessoryId })),
          });
        }
      }
      return tx.issueKit.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          categoryId: dto.categoryId,
          locationId: dto.locationId === undefined ? undefined : dto.locationId,
          notes: dto.notes,
        },
        include: kitInclude,
      });
    });
    await this.prisma.auditLog.create({
      data: {
        entityType: 'IssueKit',
        entityId: String(id),
        action: 'update',
        summary: `Updated issue kit ${kit.name}`,
        changedById: actor.id,
      },
    });
    return kit;
  }

  async remove(id: number, actor: AuthUser) {
    const kit = await this.get(id);
    await this.prisma.issueKit.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: {
        entityType: 'IssueKit',
        entityId: String(id),
        action: 'delete',
        summary: `Deleted issue kit ${kit.name}`,
        changedById: actor.id,
      },
    });
    return { ok: true };
  }

  /** Pick the next available matching asset and check out the kit's accessories. */
  async issue(id: number, dto: IssueKitToEmployeeDto, actor: AuthUser) {
    const kit = await this.get(id);
    const asset = await this.prisma.asset.findFirst({
      where: {
        status: 'available',
        categoryId: kit.categoryId,
        ...(kit.locationId ? { locationId: kit.locationId } : {}),
      },
      orderBy: { assetCode: 'asc' },
    });
    if (!asset) {
      throw new BadRequestException(
        `No available ${kit.category.name}${kit.location ? ` in ${kit.location.name}` : ''} for kit “${kit.name}”`,
      );
    }
    const accessoryIds = kit.accessories.map((row) => row.accessoryId);
    const assigned = await this.assets.assign(
      asset.id,
      { employeeId: dto.employeeId, accessoryIds, notes: `Issued from kit ${kit.name}` },
      actor,
    );
    return { kit, asset: assigned };
  }
}
