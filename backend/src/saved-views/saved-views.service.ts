import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedViewDto, UpdateSavedViewDto } from './dto';

@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuery & { resource?: string }, actor: AuthUser) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'name', 'createdAt']);
    const resource = query.resource || 'assets';
    const where: Prisma.SavedViewWhereInput = {
      resource,
      OR: [{ createdById: actor.id }, { isShared: true }],
    };
    const [data, total] = await Promise.all([
      this.prisma.savedView.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { createdBy: { select: { id: true, fullName: true } } },
      }),
      this.prisma.savedView.count({ where }),
    ]);
    return { data, total };
  }

  async create(dto: CreateSavedViewDto, actor: AuthUser) {
    return this.prisma.savedView.create({
      data: {
        name: dto.name,
        resource: dto.resource || 'assets',
        filters: dto.filters as Prisma.InputJsonValue,
        isShared: dto.isShared ?? false,
        createdById: actor.id,
      },
    });
  }

  async update(id: number, dto: UpdateSavedViewDto, actor: AuthUser) {
    const view = await this.prisma.savedView.findUnique({ where: { id } });
    if (!view) throw new NotFoundException(`Saved view ${id} not found`);
    this.assertOwnerOrAdmin(view.createdById, actor);
    return this.prisma.savedView.update({
      where: { id },
      data: {
        name: dto.name,
        filters: dto.filters as Prisma.InputJsonValue | undefined,
        isShared: dto.isShared,
      },
    });
  }

  async remove(id: number, actor: AuthUser) {
    const view = await this.prisma.savedView.findUnique({ where: { id } });
    if (!view) throw new NotFoundException(`Saved view ${id} not found`);
    this.assertOwnerOrAdmin(view.createdById, actor);
    return this.prisma.savedView.delete({ where: { id } });
  }

  private assertOwnerOrAdmin(ownerId: number, actor: AuthUser) {
    if (ownerId === actor.id) return;
    if (actor.role === RoleName.SUPER_ADMIN || actor.role === RoleName.IT_ADMIN) return;
    throw new ForbiddenException('You can only change your own saved views');
  }
}
