import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetRequestStatus, NotificationType, Prisma, RoleName } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetRequestDto, ReviewAssetRequestDto } from './dto';

const requestInclude = {
  requester: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      managerId: true,
    },
  },
  category: true,
  reviewedBy: { select: { id: true, fullName: true } },
  fulfilledBy: { select: { id: true, fullName: true } },
} satisfies Prisma.AssetRequestInclude;

@Injectable()
export class AssetRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListQuery & { status?: string; kind?: string }, actor: AuthUser) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'createdAt', 'status', 'kind']);
    const statuses = (query.status ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is AssetRequestStatus =>
        (['pending', 'approved', 'rejected', 'fulfilled'] as string[]).includes(s),
      );
    const where: Prisma.AssetRequestWhereInput = {
      ...this.scopeWhere(actor),
      ...(statuses.length === 1 ? { status: statuses[0] } : {}),
      ...(statuses.length > 1 ? { status: { in: statuses } } : {}),
      ...(query.kind === 'asset' || query.kind === 'accessory' ? { kind: query.kind } : {}),
      ...(query.q
        ? {
            OR: [
              { reason: { contains: query.q, mode: 'insensitive' } },
              { accessoryName: { contains: query.q, mode: 'insensitive' } },
              { category: { name: { contains: query.q, mode: 'insensitive' } } },
              { requester: { firstName: { contains: query.q, mode: 'insensitive' } } },
              { requester: { lastName: { contains: query.q, mode: 'insensitive' } } },
              { requester: { employeeCode: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.assetRequest.findMany({ where, skip, take, orderBy, include: requestInclude }),
      this.prisma.assetRequest.count({ where }),
    ]);
    return { data, total };
  }

  async create(dto: CreateAssetRequestDto, actor: AuthUser) {
    if (!actor.employeeId) {
      throw new ForbiddenException('Only employees linked to a profile can submit requests');
    }
    if (dto.kind === 'asset' && !dto.categoryId) {
      throw new BadRequestException('Asset requests require a category');
    }
    if (dto.kind === 'accessory' && !dto.accessoryName?.trim()) {
      throw new BadRequestException('Accessory requests require an accessory name or type');
    }

    const request = await this.prisma.assetRequest.create({
      data: {
        requesterId: actor.employeeId,
        kind: dto.kind,
        categoryId: dto.categoryId ?? null,
        accessoryName: dto.accessoryName?.trim() ?? null,
        reason: dto.reason.trim(),
      },
      include: requestInclude,
    });

    await this.audit.record({
      entityType: 'AssetRequest',
      entityId: request.id,
      action: 'create',
      summary: `Asset/accessory request submitted by ${request.requester.firstName} ${request.requester.lastName}`,
      changedById: actor.id,
      newValue: request,
    });

    const manager = request.requester.managerId
      ? await this.prisma.employee.findUnique({
          where: { id: request.requester.managerId },
          include: { user: true },
        })
      : null;
    if (manager?.user) {
      await this.prisma.notification.create({
        data: {
          userId: manager.user.id,
          type: NotificationType.asset_request,
          title: 'New asset request',
          message: `${request.requester.firstName} ${request.requester.lastName} requested ${dto.kind === 'asset' ? 'an asset' : 'an accessory'}`,
        },
      });
    }

    return request;
  }

  async review(id: number, dto: ReviewAssetRequestDto, actor: AuthUser) {
    const request = await this.prisma.assetRequest.findUnique({
      where: { id },
      include: requestInclude,
    });
    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be reviewed');
    }
    this.assertManagerOf(actor, request.requester);

    if (dto.decision === 'rejected' && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('Rejection requires a reason');
    }

    const status: AssetRequestStatus = dto.decision;
    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status,
        managerComment: dto.comment?.trim() ?? null,
        rejectionReason: dto.decision === 'rejected' ? dto.rejectionReason!.trim() : null,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
      include: requestInclude,
    });

    await this.audit.record({
      entityType: 'AssetRequest',
      entityId: id,
      action: dto.decision === 'approved' ? 'approve' : 'reject',
      summary: `Request ${dto.decision} by manager`,
      changedById: actor.id,
      oldValue: { status: request.status },
      newValue: { status, rejectionReason: updated.rejectionReason },
    });

    const requesterUser = await this.prisma.user.findFirst({
      where: { employeeId: request.requesterId },
    });
    if (requesterUser) {
      await this.prisma.notification.create({
        data: {
          userId: requesterUser.id,
          type: NotificationType.asset_request,
          title: dto.decision === 'approved' ? 'Request approved' : 'Request rejected',
          message:
            dto.decision === 'approved'
              ? `Your ${request.kind} request was approved${dto.comment ? `: ${dto.comment}` : ''}`
              : `Your ${request.kind} request was rejected: ${dto.rejectionReason}`,
        },
      });
    }

    return updated;
  }

  async fulfill(id: number, actor: AuthUser) {
    const request = await this.prisma.assetRequest.findUnique({
      where: { id },
      include: requestInclude,
    });
    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    if (request.status !== 'approved') {
      throw new BadRequestException('Only approved requests can be marked fulfilled');
    }

    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'fulfilled',
        fulfilledById: actor.id,
        fulfilledAt: new Date(),
      },
      include: requestInclude,
    });

    await this.audit.record({
      entityType: 'AssetRequest',
      entityId: id,
      action: 'fulfill',
      summary: `Request marked fulfilled by IT`,
      changedById: actor.id,
      oldValue: { status: request.status },
      newValue: { status: 'fulfilled' },
    });

    const requesterUser = await this.prisma.user.findFirst({
      where: { employeeId: request.requesterId },
    });
    if (requesterUser) {
      await this.prisma.notification.create({
        data: {
          userId: requesterUser.id,
          type: NotificationType.asset_request,
          title: 'Request fulfilled',
          message: `Your ${request.kind} request has been fulfilled by IT`,
        },
      });
    }

    return updated;
  }

  private scopeWhere(actor: AuthUser): Prisma.AssetRequestWhereInput {
    switch (actor.role) {
      case RoleName.SUPER_ADMIN:
      case RoleName.IT_ADMIN:
      case RoleName.IT_SUPPORT:
        return {};
      case RoleName.MANAGER:
        if (!actor.employeeId) {
          return { id: -1 };
        }
        return { requester: { managerId: actor.employeeId } };
      case RoleName.EMPLOYEE:
        if (!actor.employeeId) {
          return { id: -1 };
        }
        return { requesterId: actor.employeeId };
      default:
        return { id: -1 };
    }
  }

  private assertManagerOf(actor: AuthUser, requester: { managerId: number | null }) {
    if (actor.role === RoleName.SUPER_ADMIN || actor.role === RoleName.IT_ADMIN) {
      return;
    }
    if (actor.role !== RoleName.MANAGER || actor.employeeId !== requester.managerId) {
      throw new ForbiddenException('You can only review requests from your direct reports');
    }
  }
}
