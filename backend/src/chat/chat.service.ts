import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, RoleName } from '@prisma/client';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { parseChatLinks } from './chat-links';

const STAFF: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT];
const IT_OPS = '#it-ops';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  assertStaff(actor: AuthUser) {
    if (!STAFF.includes(actor.role)) throw new ForbiddenException('Chat is for IT staff only');
  }

  async staffDirectory(actor: AuthUser) {
    this.assertStaff(actor);
    return this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: STAFF } } },
      select: { id: true, fullName: true, email: true, role: { select: { name: true } } },
      orderBy: { fullName: 'asc' },
    });
  }

  async ensureItOps() {
    let channel = await this.prisma.chatChannel.findFirst({ where: { type: 'group', name: IT_OPS } });
    if (!channel) {
      channel = await this.prisma.chatChannel.create({ data: { type: 'group', name: IT_OPS } });
    }
    const staff = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: STAFF } } },
      select: { id: true },
    });
    for (const u of staff) {
      await this.prisma.chatChannelMember.upsert({
        where: { channelId_userId: { channelId: channel.id, userId: u.id } },
        create: { channelId: channel.id, userId: u.id },
        update: {},
      });
    }
    return channel;
  }

  async listChannels(actor: AuthUser) {
    this.assertStaff(actor);
    await this.ensureItOps();
    const memberships = await this.prisma.chatChannelMember.findMany({
      where: { userId: actor.id },
      include: {
        channel: {
          include: {
            members: { include: { user: { select: { id: true, fullName: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { author: { select: { fullName: true } } } },
          },
        },
      },
    });
    return Promise.all(
      memberships.map(async (m) => {
        const unread = await this.prisma.chatMessage.count({
          where: {
            channelId: m.channelId,
            authorId: { not: actor.id },
            createdAt: { gt: m.lastReadAt ?? new Date(0) },
          },
        });
        const other = m.channel.members.find((x) => x.userId !== actor.id)?.user;
        return {
          id: m.channel.id,
          type: m.channel.type,
          name: m.channel.type === 'group' ? m.channel.name : other?.fullName ?? 'Direct message',
          lastMessage: m.channel.messages[0]
            ? {
                body: m.channel.messages[0].body,
                at: m.channel.messages[0].createdAt,
                author: m.channel.messages[0].author.fullName,
              }
            : null,
          unread,
        };
      }),
    );
  }

  async unreadTotal(actor: AuthUser) {
    this.assertStaff(actor);
    const channels = await this.listChannels(actor);
    return { unread: channels.reduce((n, c) => n + c.unread, 0) };
  }

  async openDm(actor: AuthUser, otherUserId: number) {
    this.assertStaff(actor);
    if (otherUserId === actor.id) throw new ForbiddenException('Cannot DM yourself');
    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      include: { role: true },
    });
    if (!other || !STAFF.includes(other.role.name)) {
      throw new ForbiddenException('DMs are only between IT staff');
    }
    const existing = await this.prisma.chatChannel.findFirst({
      where: {
        type: 'dm',
        AND: [{ members: { some: { userId: actor.id } } }, { members: { some: { userId: otherUserId } } }],
      },
    });
    if (existing) return existing;
    return this.prisma.chatChannel.create({
      data: {
        type: 'dm',
        members: { create: [{ userId: actor.id }, { userId: otherUserId }] },
      },
    });
  }

  private async requireMember(channelId: number, userId: number) {
    const member = await this.prisma.chatChannelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) throw new NotFoundException('Channel not found');
    return member;
  }

  async messages(actor: AuthUser, channelId: number, after?: number) {
    this.assertStaff(actor);
    await this.requireMember(channelId, actor.id);
    const rows = await this.prisma.chatMessage.findMany({
      where: { channelId, ...(after ? { id: { gt: after } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: 80,
      include: { author: { select: { id: true, fullName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      author: r.author,
      links: parseChatLinks(r.body),
    }));
  }

  async post(actor: AuthUser, channelId: number, body: string) {
    this.assertStaff(actor);
    const text = body.trim();
    if (!text) throw new ForbiddenException('Message cannot be empty');
    await this.requireMember(channelId, actor.id);
    const row = await this.prisma.chatMessage.create({
      data: { channelId, authorId: actor.id, body: text },
      include: { author: { select: { id: true, fullName: true } } },
    });
    const others = await this.prisma.chatChannelMember.findMany({
      where: { channelId, userId: { not: actor.id } },
      select: { userId: true },
    });
    if (others.length) {
      await this.prisma.notification.createMany({
        data: others.map((o) => ({
          userId: o.userId,
          type: NotificationType.chat_message,
          title: `${actor.fullName} in chat`,
          message: text.slice(0, 180),
        })),
      });
    }
    return { ...row, links: parseChatLinks(text) };
  }

  async markRead(actor: AuthUser, channelId: number) {
    this.assertStaff(actor);
    await this.requireMember(channelId, actor.id);
    await this.prisma.chatChannelMember.update({
      where: { channelId_userId: { channelId, userId: actor.id } },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }
}
