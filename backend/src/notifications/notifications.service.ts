import { Injectable } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Notifications visible to the current user: their own + broadcast (userId null). */
  async listForUser(query: ListQuery & { isRead?: string }, actor: AuthUser) {
    const { skip, take } = parseListQuery(query, ['id', 'createdAt']);
    const where: Prisma.NotificationWhereInput = {
      OR: [{ userId: actor.id }, { userId: null }],
      ...(query.isRead === 'true' ? { isRead: true } : {}),
      ...(query.isRead === 'false' ? { isRead: false } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, assetCode: true } },
          supportTicket: { select: { id: true, ticketNumber: true } },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total };
  }

  async markRead(id: number, actor: AuthUser) {
    // Only allow marking one's own (or broadcast) notifications.
    await this.prisma.notification.updateMany({
      where: { id, OR: [{ userId: actor.id }, { userId: null }] },
      data: { isRead: true },
    });
    return { id, isRead: true };
  }

  async markAllRead(actor: AuthUser) {
    const { count } = await this.prisma.notification.updateMany({
      where: { isRead: false, OR: [{ userId: actor.id }, { userId: null }] },
      data: { isRead: true },
    });
    return { updated: count };
  }

  /** Emails of users who should receive IT alerts (warranty, issues). */
  async itRecipients(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] } } },
      select: { email: true },
    });
    return users.map((u) => u.email);
  }
}
