import { Injectable } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationFanOut = {
  type: Prisma.NotificationCreateManyInput['type'];
  title: string;
  message: string;
  assetId?: number | null;
  supportTicketId?: number | null;
  link?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Per-user rows only. Broadcast (userId null) is no longer readable or markable. */
  async listForUser(query: ListQuery & { isRead?: string }, actor: AuthUser) {
    const { skip, take } = parseListQuery(query, ['id', 'createdAt']);
    const where: Prisma.NotificationWhereInput = {
      userId: actor.id,
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
    await this.prisma.notification.updateMany({
      where: { id, userId: actor.id },
      data: { isRead: true },
    });
    return { id, isRead: true };
  }

  async markAllRead(actor: AuthUser) {
    const { count } = await this.prisma.notification.updateMany({
      where: { isRead: false, userId: actor.id },
      data: { isRead: true },
    });
    return { updated: count };
  }

  /** Emails of users who should receive IT alerts (warranty, issues). */
  async itRecipients(): Promise<string[]> {
    const users = await this.itAlertUsers();
    return users.map((u) => u.email);
  }

  /** Same targeting as low-stock: Super Admin + IT Admin, never a broadcast row. */
  async itAlertUserIds(): Promise<number[]> {
    const users = await this.itAlertUsers();
    return users.map((u) => u.id);
  }

  async fanOutToIt(payload: NotificationFanOut, db?: Prisma.TransactionClient): Promise<number> {
    const ids = await this.itAlertUserIds();
    return this.fanOut(ids, payload, db);
  }

  async fanOut(
    userIds: number[],
    payload: NotificationFanOut,
    db?: Prisma.TransactionClient,
  ): Promise<number> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return 0;
    await (db ?? this.prisma).notification.createMany({
      data: unique.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        assetId: payload.assetId ?? null,
        supportTicketId: payload.supportTicketId ?? null,
        link: payload.link ?? null,
      })),
    });
    return unique.length;
  }

  private itAlertUsers() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] } },
      },
      select: { id: true, email: true },
    });
  }
}
