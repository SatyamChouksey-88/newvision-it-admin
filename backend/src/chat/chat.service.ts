import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatChannelType,
  ChatMentionKind,
  ChatNotifyPref,
  ChatPresenceMode,
  ChatVisibility,
  NotificationType,
  Prisma,
  RoleName,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ChatPresenceService } from './chat.presence';
import { ChatRealtimeService } from './chat.realtime';
import { assertAllowedChatFile, isImageMime } from './chat-files';
import { type ChatLinkRef, parseChatLinks } from './chat-links';
import { parseMentions } from './chat-mentions';

const STAFF: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT];
const DEFAULT_CHANNELS: { name: string; description: string }[] = [
  { name: '#it-ops', description: 'Day-to-day IT operations' },
  { name: '#helpdesk', description: 'Ticket triage and hand-offs' },
  { name: '#procurement', description: 'Vendors, POs, and receiving' },
];
const AUTHOR_SELECT = { id: true, fullName: true } as const;
const USER_PRESENCE_SELECT = {
  id: true,
  fullName: true,
  presenceMode: true,
  lastSeenAt: true,
} as const;

type Uploaded = { originalname: string; mimetype: string; size: number; buffer: Buffer };

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: ChatRealtimeService,
    private readonly presence: ChatPresenceService,
  ) {}

  assertStaff(actor: AuthUser) {
    if (!STAFF.includes(actor.role)) throw new ForbiddenException('Chat is for IT staff only');
  }

  private isAdmin(actor: AuthUser) {
    return actor.role === RoleName.SUPER_ADMIN || actor.role === RoleName.IT_ADMIN;
  }

  async staffDirectory(actor: AuthUser) {
    this.assertStaff(actor);
    const rows = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: STAFF } } },
      select: { ...USER_PRESENCE_SELECT, email: true, role: { select: { name: true } } },
      orderBy: { fullName: 'asc' },
    });
    const extras = new Map(
      rows.map((u) => [u.id, { mode: u.presenceMode, lastSeenAt: u.lastSeenAt }]),
    );
    const snap = this.presence.snapshot(
      rows.map((u) => u.id),
      extras,
    );
    return rows.map((u) => ({ ...u, presence: snap[u.id] ?? 'offline' }));
  }

  async heartbeat(actor: AuthUser, mode?: ChatPresenceMode) {
    this.assertStaff(actor);
    const data: Prisma.UserUpdateInput = { lastSeenAt: new Date() };
    if (mode) data.presenceMode = mode;
    const user = await this.prisma.user.update({
      where: { id: actor.id },
      data,
      select: { presenceMode: true, lastSeenAt: true },
    });
    if (mode) this.presence.setMode(actor.id, mode);
    else this.presence.touch(actor.id);
    return { status: this.presence.statusOf(actor.id, user.presenceMode, user.lastSeenAt) };
  }

  async presenceMap(actor: AuthUser) {
    this.assertStaff(actor);
    const rows = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: STAFF } } },
      select: { id: true, presenceMode: true, lastSeenAt: true },
    });
    const extras = new Map(
      rows.map((u) => [u.id, { mode: u.presenceMode, lastSeenAt: u.lastSeenAt }]),
    );
    return this.presence.snapshot(
      rows.map((u) => u.id),
      extras,
    );
  }

  async ensureDefaultChannels() {
    await this.prisma.chatChannel.updateMany({
      where: { type: ChatChannelType.group, name: { startsWith: '#' } },
      data: { type: ChatChannelType.channel, visibility: ChatVisibility.public },
    });
    const staff = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: STAFF } } },
      select: { id: true, role: { select: { name: true } } },
      orderBy: { id: 'asc' },
    });
    const ownerId =
      staff.find((u) => u.role.name === RoleName.SUPER_ADMIN)?.id ?? staff[0]?.id ?? null;
    for (const def of DEFAULT_CHANNELS) {
      let channel = await this.prisma.chatChannel.findFirst({ where: { name: def.name } });
      if (!channel) {
        channel = await this.prisma.chatChannel.create({
          data: {
            type: ChatChannelType.channel,
            name: def.name,
            description: def.description,
            visibility: ChatVisibility.public,
            createdById: ownerId,
          },
        });
      } else if (channel.type !== ChatChannelType.channel) {
        channel = await this.prisma.chatChannel.update({
          where: { id: channel.id },
          data: {
            type: ChatChannelType.channel,
            description: channel.description ?? def.description,
            visibility: ChatVisibility.public,
          },
        });
      }
      for (const u of staff) {
        await this.prisma.chatChannelMember.upsert({
          where: { channelId_userId: { channelId: channel.id, userId: u.id } },
          create: {
            channelId: channel.id,
            userId: u.id,
            role: u.id === ownerId ? 'owner' : 'member',
          },
          update: {},
        });
      }
    }
  }

  async listChannels(actor: AuthUser) {
    this.assertStaff(actor);
    await this.ensureDefaultChannels();
    const memberships = await this.prisma.chatChannelMember.findMany({
      where: { userId: actor.id },
      include: {
        channel: {
          include: {
            members: { include: { user: { select: USER_PRESENCE_SELECT } } },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { author: { select: { fullName: true } } },
            },
          },
        },
      },
    });
    const memberChannelIds = new Set(memberships.map((m) => m.channelId));
    const publicExtra = await this.prisma.chatChannel.findMany({
      where: {
        type: ChatChannelType.channel,
        visibility: ChatVisibility.public,
        archived: false,
        id: { notIn: [...memberChannelIds] },
      },
      include: {
        members: { include: { user: { select: USER_PRESENCE_SELECT } } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: { select: { fullName: true } } },
        },
      },
    });

    const extras = new Map<number, { mode: ChatPresenceMode; lastSeenAt: Date | null }>();
    for (const m of memberships) {
      for (const mem of m.channel.members) {
        extras.set(mem.user.id, { mode: mem.user.presenceMode, lastSeenAt: mem.user.lastSeenAt });
      }
    }
    const snap = this.presence.snapshot([...extras.keys()], extras);

    const mine = await Promise.all(
      memberships.map(async (m) => {
        const unread = await this.prisma.chatMessage.count({
          where: {
            channelId: m.channelId,
            authorId: { not: actor.id },
            deletedAt: null,
            ...(m.lastReadMessageId != null
              ? { id: { gt: m.lastReadMessageId } }
              : { createdAt: { gt: m.lastReadAt ?? new Date(0) } }),
          },
        });
        return this.summarizeChannel(m.channel, actor.id, {
          unread,
          joined: true,
          role: m.role,
          muted: m.muted,
          notifyPref: m.notifyPref,
          snap,
        });
      }),
    );
    const extra = publicExtra.map((ch) =>
      this.summarizeChannel(ch, actor.id, {
        unread: 0,
        joined: false,
        role: null,
        muted: false,
        notifyPref: ChatNotifyPref.all,
        snap,
      }),
    );
    return [...mine, ...extra].sort((a, b) => {
      const at = a.lastMessage?.at ? new Date(a.lastMessage.at).getTime() : 0;
      const bt = b.lastMessage?.at ? new Date(b.lastMessage.at).getTime() : 0;
      return bt - at;
    });
  }

  async unreadTotal(actor: AuthUser) {
    this.assertStaff(actor);
    const channels = await this.listChannels(actor);
    return { unread: channels.reduce((n, c) => n + (c.joined ? c.unread : 0), 0) };
  }

  async getChannel(actor: AuthUser, channelId: number) {
    this.assertStaff(actor);
    const channel = await this.prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: { user: { select: USER_PRESENCE_SELECT } },
          orderBy: { joinedAt: 'asc' },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: { select: { fullName: true } } },
        },
      },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    const membership = channel.members.find((m) => m.userId === actor.id);
    const publicOk =
      channel.type === ChatChannelType.channel && channel.visibility === ChatVisibility.public;
    if (!membership && !publicOk) throw new NotFoundException('Channel not found');
    const extras = new Map(
      channel.members.map((m) => [
        m.user.id,
        { mode: m.user.presenceMode, lastSeenAt: m.user.lastSeenAt },
      ]),
    );
    const snap = this.presence.snapshot(
      channel.members.map((m) => m.user.id),
      extras,
    );
    const last = await this.prisma.chatMessage.findFirst({
      where: { channelId, deletedAt: null },
      orderBy: { id: 'desc' },
      select: { id: true, authorId: true },
    });
    const receipts =
      (channel.type === ChatChannelType.dm || channel.type === ChatChannelType.group) &&
      channel.members.length <= 8 &&
      last
        ? channel.members
            .filter((m) => m.userId !== last.authorId && (m.lastReadMessageId ?? 0) >= last.id)
            .map((m) => ({ userId: m.userId, fullName: m.user.fullName }))
        : [];
    return {
      ...this.summarizeChannel(channel, actor.id, {
        unread: 0,
        joined: Boolean(membership),
        role: membership?.role ?? null,
        muted: membership?.muted ?? false,
        notifyPref: membership?.notifyPref ?? ChatNotifyPref.all,
        snap,
      }),
      description: channel.description,
      topic: channel.topic,
      archived: channel.archived,
      visibility: channel.visibility,
      members: channel.members.map((m) => ({
        userId: m.userId,
        fullName: m.user.fullName,
        role: m.role,
        lastReadMessageId: m.lastReadMessageId,
        presence: snap[m.userId] ?? 'offline',
      })),
      seenBy: receipts,
    };
  }

  async openDm(actor: AuthUser, otherUserId: number) {
    this.assertStaff(actor);
    if (otherUserId === actor.id) throw new ForbiddenException('Cannot DM yourself');
    const other = await this.requireStaffUser(otherUserId);
    const existing = await this.prisma.chatChannel.findMany({
      where: {
        type: ChatChannelType.dm,
        AND: [
          { members: { some: { userId: actor.id } } },
          { members: { some: { userId: other.id } } },
        ],
      },
      include: { _count: { select: { members: true } } },
    });
    const hit = existing.find((c) => c._count.members === 2);
    if (hit) return hit;
    return this.prisma.chatChannel.create({
      data: {
        type: ChatChannelType.dm,
        createdById: actor.id,
        members: {
          create: [
            { userId: actor.id, role: 'owner' },
            { userId: other.id, role: 'member' },
          ],
        },
      },
    });
  }

  async openGroup(actor: AuthUser, userIds: number[], name?: string) {
    this.assertStaff(actor);
    const unique = [...new Set([actor.id, ...userIds])];
    if (unique.length < 3) {
      const other = unique.find((id) => id !== actor.id);
      if (!other) throw new BadRequestException('Add at least one other person');
      return this.openDm(actor, other);
    }
    for (const id of unique) {
      if (id !== actor.id) await this.requireStaffUser(id);
    }
    const existing = await this.prisma.chatChannel.findMany({
      where: { type: ChatChannelType.group, members: { some: { userId: actor.id } } },
      include: { members: true },
    });
    const want = unique
      .slice()
      .sort((a, b) => a - b)
      .join(',');
    const hit = existing.find(
      (c) =>
        c.members.length === unique.length &&
        c.members
          .map((m) => m.userId)
          .sort((a, b) => a - b)
          .join(',') === want,
    );
    if (hit) return hit;
    return this.prisma.chatChannel.create({
      data: {
        type: ChatChannelType.group,
        name: name?.trim() || null,
        createdById: actor.id,
        members: {
          create: unique.map((userId) => ({
            userId,
            role: userId === actor.id ? 'owner' : 'member',
          })),
        },
      },
    });
  }

  async createChannel(
    actor: AuthUser,
    dto: {
      name: string;
      description?: string;
      topic?: string;
      visibility?: ChatVisibility;
      memberIds?: number[];
    },
  ) {
    this.assertStaff(actor);
    const name = normalizeChannelName(dto.name);
    const dup = await this.prisma.chatChannel.findFirst({
      where: { type: ChatChannelType.channel, name: { equals: name, mode: 'insensitive' } },
    });
    if (dup) throw new BadRequestException(`Channel ${name} already exists`);
    const extra = [...new Set(dto.memberIds ?? [])].filter((id) => id !== actor.id);
    for (const id of extra) await this.requireStaffUser(id);
    const visibility = dto.visibility ?? ChatVisibility.public;
    const channel = await this.prisma.chatChannel.create({
      data: {
        type: ChatChannelType.channel,
        name,
        description: dto.description?.trim() || null,
        topic: dto.topic?.trim() || null,
        visibility,
        createdById: actor.id,
        members: {
          create: [
            { userId: actor.id, role: 'owner' },
            ...extra.map((userId) => ({ userId, role: 'member' as const })),
          ],
        },
      },
    });
    await this.audit.record({
      entityType: 'ChatChannel',
      entityId: channel.id,
      action: 'create',
      summary: `Created ${name}`,
      changedById: actor.id,
    });
    return channel;
  }

  async patchChannel(
    actor: AuthUser,
    channelId: number,
    dto: {
      name?: string;
      description?: string;
      topic?: string;
      archived?: boolean;
      visibility?: ChatVisibility;
    },
  ) {
    this.assertStaff(actor);
    const { channel, member } = await this.requireChannel(channelId, actor.id);
    if (channel.type !== ChatChannelType.channel)
      throw new BadRequestException('Only channels can be renamed');
    this.assertCanManage(actor, member.role);
    const data: Prisma.ChatChannelUpdateInput = {};
    if (dto.name) data.name = normalizeChannelName(dto.name);
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.topic !== undefined) data.topic = dto.topic.trim() || null;
    if (dto.archived !== undefined) data.archived = dto.archived;
    if (dto.visibility) data.visibility = dto.visibility;
    const updated = await this.prisma.chatChannel.update({ where: { id: channelId }, data });
    await this.audit.record({
      entityType: 'ChatChannel',
      entityId: channelId,
      action: 'update',
      summary: `Updated ${updated.name ?? 'channel'}`,
      changedById: actor.id,
      newValue: dto,
    });
    this.realtime.toChannel(channelId, 'channel:updated', { id: channelId });
    return updated;
  }

  async joinChannel(actor: AuthUser, channelId: number) {
    this.assertStaff(actor);
    const channel = await this.prisma.chatChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.type !== ChatChannelType.channel || channel.visibility !== ChatVisibility.public) {
      throw new ForbiddenException('This channel is invite-only');
    }
    await this.prisma.chatChannelMember.upsert({
      where: { channelId_userId: { channelId, userId: actor.id } },
      create: { channelId, userId: actor.id, role: 'member' },
      update: {},
    });
    return { ok: true };
  }

  async leaveChannel(actor: AuthUser, channelId: number) {
    this.assertStaff(actor);
    const { channel, member } = await this.requireChannel(channelId, actor.id);
    if (channel.type === ChatChannelType.dm)
      throw new BadRequestException('Leave a DM by archiving it for yourself (mute)');
    if (member.role === 'owner') {
      const other = await this.prisma.chatChannelMember.findFirst({
        where: { channelId, userId: { not: actor.id } },
        orderBy: { joinedAt: 'asc' },
      });
      if (other) {
        await this.prisma.chatChannelMember.update({
          where: { id: other.id },
          data: { role: 'owner' },
        });
      }
    }
    await this.prisma.chatChannelMember.delete({
      where: { channelId_userId: { channelId, userId: actor.id } },
    });
    return { ok: true };
  }

  async addMembers(actor: AuthUser, channelId: number, userIds: number[]) {
    this.assertStaff(actor);
    const { channel, member } = await this.requireChannel(channelId, actor.id);
    if (channel.type === ChatChannelType.dm)
      throw new BadRequestException('Start a group chat to add people');
    if (channel.type === ChatChannelType.channel) this.assertCanManage(actor, member.role);
    for (const id of userIds) {
      await this.requireStaffUser(id);
      await this.prisma.chatChannelMember.upsert({
        where: { channelId_userId: { channelId, userId: id } },
        create: { channelId, userId: id, role: 'member' },
        update: {},
      });
    }
    this.realtime.toChannel(channelId, 'channel:updated', { id: channelId });
    return this.getChannel(actor, channelId);
  }

  async removeMember(actor: AuthUser, channelId: number, userId: number) {
    this.assertStaff(actor);
    const { channel, member } = await this.requireChannel(channelId, actor.id);
    if (userId === actor.id) return this.leaveChannel(actor, channelId);
    if (channel.type === ChatChannelType.dm)
      throw new BadRequestException('Cannot remove someone from a DM');
    if (channel.type === ChatChannelType.channel) this.assertCanManage(actor, member.role);
    await this.prisma.chatChannelMember.deleteMany({ where: { channelId, userId } });
    this.realtime.toChannel(channelId, 'channel:updated', { id: channelId });
    return { ok: true };
  }

  async setPrefs(
    actor: AuthUser,
    channelId: number,
    dto: { muted?: boolean; notifyPref?: ChatNotifyPref },
  ) {
    this.assertStaff(actor);
    await this.requireChannel(channelId, actor.id);
    const notifyPref = dto.muted ? ChatNotifyPref.muted : dto.notifyPref;
    await this.prisma.chatChannelMember.update({
      where: { channelId_userId: { channelId, userId: actor.id } },
      data: {
        ...(dto.muted !== undefined ? { muted: dto.muted } : {}),
        ...(notifyPref ? { notifyPref } : {}),
      },
    });
    return { ok: true };
  }

  async messages(
    actor: AuthUser,
    channelId: number,
    query: { after?: number; threadOf?: number; take?: number },
  ) {
    this.assertStaff(actor);
    await this.requireChannel(channelId, actor.id);
    const take = Math.min(query.take ?? 80, 200);
    const where: Prisma.ChatMessageWhereInput = {
      channelId,
      ...(query.after
        ? { id: { gt: query.after } }
        : query.threadOf
          ? { parentId: query.threadOf }
          : { parentId: null }),
    };
    const rows = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take,
      include: messageInclude,
    });
    return Promise.all(rows.map((r) => this.serializeMessage(r, actor.id)));
  }

  async thread(actor: AuthUser, channelId: number, parentId: number) {
    this.assertStaff(actor);
    await this.requireChannel(channelId, actor.id);
    const parent = await this.prisma.chatMessage.findFirst({
      where: { id: parentId, channelId },
      include: messageInclude,
    });
    if (!parent) throw new NotFoundException('Message not found');
    const replies = await this.prisma.chatMessage.findMany({
      where: { channelId, parentId },
      orderBy: { createdAt: 'asc' },
      include: messageInclude,
    });
    return {
      parent: await this.serializeMessage(parent, actor.id),
      replies: await Promise.all(replies.map((r) => this.serializeMessage(r, actor.id))),
    };
  }

  async post(
    actor: AuthUser,
    channelId: number,
    body: string | undefined,
    parentId?: number,
    files?: Uploaded[],
  ) {
    this.assertStaff(actor);
    const { channel } = await this.requireChannel(channelId, actor.id);
    if (channel.archived) throw new ForbiddenException('This conversation is archived');
    const text = (body ?? '').trim();
    const uploads = files?.filter(Boolean) ?? [];
    if (!text && uploads.length === 0) throw new BadRequestException('Message cannot be empty');
    let parent: { id: number; authorId: number; parentId: number | null } | null = null;
    if (parentId) {
      parent = await this.prisma.chatMessage.findFirst({
        where: { id: parentId, channelId },
        select: { id: true, authorId: true, parentId: true },
      });
      if (!parent || parent.parentId)
        throw new BadRequestException('Can only reply to a top-level message');
    }
    for (const f of uploads) assertAllowedChatFile(f);
    const parsed = parseMentions(text);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          channelId,
          authorId: actor.id,
          body: text || '(attachment)',
          parentId: parent?.id ?? null,
        },
      });
      if (parsed.length) {
        await tx.chatMention.createMany({
          data: parsed.map((m) => ({
            messageId: created.id,
            kind:
              m.kind === 'user'
                ? ChatMentionKind.user
                : m.kind === 'channel'
                  ? ChatMentionKind.channel
                  : ChatMentionKind.here,
            userId: m.kind === 'user' ? m.userId : null,
          })),
        });
      }
      for (const f of uploads) {
        await tx.chatAttachment.create({
          data: {
            messageId: created.id,
            filename: f.originalname,
            mimeType: f.mimetype || 'application/octet-stream',
            sizeBytes: f.size,
            data: Uint8Array.from(f.buffer),
            uploadedById: actor.id,
          },
        });
      }
      await tx.chatChannelMember.update({
        where: { channelId_userId: { channelId, userId: actor.id } },
        data: { lastReadAt: new Date(), lastReadMessageId: created.id },
      });
      return tx.chatMessage.findUniqueOrThrow({
        where: { id: created.id },
        include: messageInclude,
      });
    });
    const serialized = await this.serializeMessage(row, actor.id);
    await this.notifyNewMessage(channel, row, actor, parsed, parent);
    this.realtime.toChannel(channelId, 'message:new', serialized);
    const members = await this.prisma.chatChannelMember.findMany({
      where: { channelId, userId: { not: actor.id } },
      select: { userId: true },
    });
    for (const m of members) {
      this.realtime.toUser(m.userId, 'unread:changed', { channelId });
    }
    await this.audit.record({
      entityType: 'ChatMessage',
      entityId: row.id,
      action: 'create',
      summary: parent
        ? `Thread reply in conversation ${channelId}`
        : `Message in conversation ${channelId}`,
      changedById: actor.id,
    });
    return serialized;
  }

  async editMessage(actor: AuthUser, messageId: number, body: string) {
    this.assertStaff(actor);
    const text = body.trim();
    if (!text) throw new BadRequestException('Message cannot be empty');
    const row = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!row || row.deletedAt) throw new NotFoundException('Message not found');
    await this.requireChannel(row.channelId, actor.id);
    if (row.authorId !== actor.id)
      throw new ForbiddenException('You can only edit your own messages');
    const parsed = parseMentions(text);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.chatMention.deleteMany({ where: { messageId } });
      if (parsed.length) {
        await tx.chatMention.createMany({
          data: parsed.map((m) => ({
            messageId,
            kind:
              m.kind === 'user'
                ? ChatMentionKind.user
                : m.kind === 'channel'
                  ? ChatMentionKind.channel
                  : ChatMentionKind.here,
            userId: m.kind === 'user' ? m.userId : null,
          })),
        });
      }
      return tx.chatMessage.update({
        where: { id: messageId },
        data: { body: text, editedAt: new Date() },
        include: messageInclude,
      });
    });
    await this.audit.record({
      entityType: 'ChatMessage',
      entityId: messageId,
      action: 'update',
      summary: `Edited message ${messageId}`,
      changedById: actor.id,
      oldValue: { body: row.body },
      newValue: { body: text },
    });
    const serialized = await this.serializeMessage(updated, actor.id);
    this.realtime.toChannel(row.channelId, 'message:updated', serialized);
    return serialized;
  }

  async deleteMessage(actor: AuthUser, messageId: number) {
    this.assertStaff(actor);
    const row = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!row || row.deletedAt) throw new NotFoundException('Message not found');
    await this.requireChannel(row.channelId, actor.id);
    if (row.authorId !== actor.id && !this.isAdmin(actor)) {
      throw new ForbiddenException('Only the sender or an IT Admin can delete this message');
    }
    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      include: messageInclude,
    });
    await this.audit.record({
      entityType: 'ChatMessage',
      entityId: messageId,
      action: 'delete',
      summary: `Deleted message ${messageId}`,
      changedById: actor.id,
      oldValue: { body: row.body, authorId: row.authorId },
    });
    const serialized = await this.serializeMessage(updated, actor.id);
    this.realtime.toChannel(row.channelId, 'message:deleted', serialized);
    return serialized;
  }

  async toggleReaction(actor: AuthUser, messageId: number, emoji: string) {
    this.assertStaff(actor);
    const clean = emoji.trim();
    if (!clean || clean.length > 16) throw new BadRequestException('Invalid emoji');
    const row = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!row || row.deletedAt) throw new NotFoundException('Message not found');
    await this.requireChannel(row.channelId, actor.id);
    const existing = await this.prisma.chatReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: actor.id, emoji: clean } },
    });
    if (existing) {
      await this.prisma.chatReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.chatReaction.create({
        data: { messageId, userId: actor.id, emoji: clean },
      });
    }
    const fresh = await this.prisma.chatMessage.findUniqueOrThrow({
      where: { id: messageId },
      include: messageInclude,
    });
    const serialized = await this.serializeMessage(fresh, actor.id);
    this.realtime.toChannel(row.channelId, 'message:updated', serialized);
    return serialized;
  }

  async markRead(actor: AuthUser, channelId: number) {
    this.assertStaff(actor);
    await this.requireChannel(channelId, actor.id);
    const last = await this.prisma.chatMessage.findFirst({
      where: { channelId },
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    await this.prisma.chatChannelMember.update({
      where: { channelId_userId: { channelId, userId: actor.id } },
      data: { lastReadAt: new Date(), lastReadMessageId: last?.id ?? null },
    });
    this.realtime.toUser(actor.id, 'unread:changed', { channelId, unread: 0 });
    return { ok: true };
  }

  async search(actor: AuthUser, q: string) {
    this.assertStaff(actor);
    const query = q.trim();
    if (query.length < 2) return [];
    const rows = await this.prisma.chatMessage.findMany({
      where: {
        deletedAt: null,
        body: { contains: query, mode: 'insensitive' },
        channel: { members: { some: { userId: actor.id } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        author: { select: AUTHOR_SELECT },
        channel: { select: { id: true, type: true, name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      channelId: r.channelId,
      parentId: r.parentId,
      author: r.author,
      channel: r.channel,
    }));
  }

  async getAttachment(actor: AuthUser, attachmentId: number) {
    this.assertStaff(actor);
    const row = await this.prisma.chatAttachment.findUnique({
      where: { id: attachmentId },
      include: { message: { select: { channelId: true, deletedAt: true } } },
    });
    if (!row || row.message.deletedAt) throw new NotFoundException('Attachment not found');
    await this.requireChannel(row.message.channelId, actor.id);
    return row;
  }

  private summarizeChannel(
    channel: {
      id: number;
      type: ChatChannelType;
      name: string | null;
      archived: boolean;
      visibility: ChatVisibility;
      members: { userId: number; user: { id: number; fullName: string } }[];
      messages: { body: string; createdAt: Date; author: { fullName: string } }[];
    },
    actorId: number,
    extra: {
      unread: number;
      joined: boolean;
      role: string | null;
      muted: boolean;
      notifyPref: ChatNotifyPref;
      snap: Record<number, string>;
    },
  ) {
    const other = channel.members.find((x) => x.userId !== actorId)?.user;
    const memberNames = channel.members
      .filter((m) => m.userId !== actorId)
      .map((m) => m.user.fullName);
    const name =
      channel.type === ChatChannelType.channel
        ? (channel.name ?? '#channel')
        : channel.type === ChatChannelType.group
          ? channel.name || memberNames.join(', ') || 'Group'
          : (other?.fullName ?? 'Direct message');
    return {
      id: channel.id,
      type: channel.type,
      name,
      archived: channel.archived,
      visibility: channel.visibility,
      joined: extra.joined,
      role: extra.role,
      muted: extra.muted,
      notifyPref: extra.notifyPref,
      unread: extra.unread,
      otherUserId: channel.type === ChatChannelType.dm ? (other?.id ?? null) : null,
      members: channel.members.map((m) => ({
        userId: m.userId,
        fullName: m.user.fullName,
        presence: extra.snap[m.userId] ?? 'offline',
      })),
      lastMessage: channel.messages[0]
        ? {
            body: channel.messages[0].body,
            at: channel.messages[0].createdAt,
            author: channel.messages[0].author.fullName,
          }
        : null,
    };
  }

  private async serializeMessage(
    row: Prisma.ChatMessageGetPayload<{ include: typeof messageInclude }>,
    viewerId: number,
  ) {
    const deleted = Boolean(row.deletedAt);
    const grouped = new Map<
      string,
      { emoji: string; count: number; mine: boolean; users: { id: number; fullName: string }[] }
    >();
    for (const r of row.reactions) {
      const cur = grouped.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false, users: [] };
      cur.count += 1;
      if (r.userId === viewerId) cur.mine = true;
      cur.users.push({ id: r.user.id, fullName: r.user.fullName });
      grouped.set(r.emoji, cur);
    }
    const replyCount = row._count?.replies ?? 0;
    const lastReplyAt = row.replies[0]?.createdAt ?? null;
    const links = deleted ? [] : await this.enrichLinks(parseChatLinks(row.body));
    return {
      id: row.id,
      channelId: row.channelId,
      parentId: row.parentId,
      body: deleted ? '' : row.body,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      deletedAt: row.deletedAt,
      deleted,
      author: row.author,
      links,
      mentions: row.mentions.map((m) => ({
        kind: m.kind,
        userId: m.userId,
        fullName: m.user?.fullName ?? null,
      })),
      reactions: [...grouped.values()],
      attachments: row.attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        image: isImageMime(a.mimeType),
      })),
      replyCount,
      lastReplyAt,
    };
  }

  private async notifyNewMessage(
    channel: { id: number; type: ChatChannelType; name: string | null },
    message: { id: number; body: string; parentId: number | null },
    actor: AuthUser,
    parsed: ReturnType<typeof parseMentions>,
    parent: { id: number; authorId: number } | null,
  ) {
    const members = await this.prisma.chatChannelMember.findMany({
      where: { channelId: channel.id, userId: { not: actor.id } },
    });
    const mentionedUsers = new Set(parsed.filter((m) => m.kind === 'user').map((m) => m.userId));
    const blast = parsed.some((m) => m.kind === 'channel' || m.kind === 'here');
    const threadPeople = new Set<number>();
    if (parent) {
      threadPeople.add(parent.authorId);
      const repliers = await this.prisma.chatMessage.findMany({
        where: { parentId: parent.id },
        select: { authorId: true },
      });
      for (const r of repliers) threadPeople.add(r.authorId);
    }
    const threadParam = parent ? `&thread=${parent.id}` : '';
    const link = `/chat?c=${channel.id}&m=${message.id}${threadParam}`;
    const preview = message.body.slice(0, 180);
    const data: Prisma.NotificationCreateManyInput[] = [];
    for (const m of members) {
      if (m.muted || m.notifyPref === ChatNotifyPref.muted) continue;
      const isMention = mentionedUsers.has(m.userId) || blast;
      const inThread = parent ? threadPeople.has(m.userId) : false;
      if (
        channel.type === ChatChannelType.channel &&
        m.notifyPref === ChatNotifyPref.mentions &&
        !isMention &&
        !inThread
      ) {
        continue;
      }
      let type: NotificationType = NotificationType.chat_message;
      let title = `${actor.fullName} in ${channel.name ?? 'chat'}`;
      if (isMention) {
        type = NotificationType.chat_mention;
        title = `${actor.fullName} mentioned you`;
      } else if (inThread) {
        type = NotificationType.chat_thread_reply;
        title = `${actor.fullName} replied in a thread`;
      } else if (channel.type === ChatChannelType.dm) {
        title = `${actor.fullName}`;
      }
      data.push({
        userId: m.userId,
        type,
        title,
        message: preview,
        link,
      });
    }
    if (data.length) await this.prisma.notification.createMany({ data });
  }

  private async enrichLinks(links: ChatLinkRef[]): Promise<ChatLinkRef[]> {
    return Promise.all(
      links.map(async (link) => {
        if (link.kind === 'ticket' && link.id) {
          const ticket = await this.prisma.supportTicket.findUnique({
            where: { id: link.id },
            select: { id: true, ticketNumber: true, subject: true, status: true },
          });
          if (ticket) {
            return {
              ...link,
              code: ticket.ticketNumber,
              title: ticket.subject,
              status: ticket.status,
              href: `/tickets/show/${ticket.id}`,
            };
          }
        }
        if (link.kind === 'asset') {
          const asset = link.id
            ? await this.prisma.asset.findUnique({
                where: { id: link.id },
                select: { id: true, assetCode: true, status: true, brand: true, model: true },
              })
            : await this.prisma.asset.findFirst({
                where: { assetCode: { equals: link.code, mode: 'insensitive' } },
                select: { id: true, assetCode: true, status: true, brand: true, model: true },
              });
          if (asset) {
            return {
              ...link,
              id: asset.id,
              code: asset.assetCode,
              title: `${asset.brand ?? ''} ${asset.model ?? ''}`.trim() || asset.assetCode,
              status: asset.status,
              href: `/assets/show/${asset.id}`,
            };
          }
        }
        if (link.kind === 'employee') {
          const employee = link.id
            ? await this.prisma.employee.findUnique({
                where: { id: link.id },
                select: {
                  id: true,
                  employeeCode: true,
                  firstName: true,
                  lastName: true,
                  isActive: true,
                },
              })
            : await this.prisma.employee.findFirst({
                where: { employeeCode: { equals: link.code, mode: 'insensitive' } },
                select: {
                  id: true,
                  employeeCode: true,
                  firstName: true,
                  lastName: true,
                  isActive: true,
                },
              });
          if (employee) {
            return {
              ...link,
              id: employee.id,
              code: employee.employeeCode,
              title: `${employee.firstName} ${employee.lastName}`,
              status: employee.isActive ? 'active' : 'inactive',
              href: `/employees/show/${employee.id}`,
            };
          }
        }
        if (link.kind === 'po') {
          const po = link.id
            ? await this.prisma.purchaseOrder.findUnique({
                where: { id: link.id },
                select: {
                  id: true,
                  poNumber: true,
                  status: true,
                  vendor: { select: { legalName: true } },
                },
              })
            : await this.prisma.purchaseOrder.findFirst({
                where: { poNumber: { equals: link.code, mode: 'insensitive' } },
                select: {
                  id: true,
                  poNumber: true,
                  status: true,
                  vendor: { select: { legalName: true } },
                },
              });
          if (po) {
            return {
              ...link,
              id: po.id,
              code: po.poNumber,
              title: po.vendor.legalName,
              status: po.status,
              href: `/procurement/orders/show/${po.id}`,
            };
          }
        }
        if (link.kind === 'requisition') {
          const pr = link.id
            ? await this.prisma.purchaseRequisition.findUnique({
                where: { id: link.id },
                select: { id: true, requisitionNumber: true, status: true, title: true },
              })
            : await this.prisma.purchaseRequisition.findFirst({
                where: { requisitionNumber: { equals: link.code, mode: 'insensitive' } },
                select: { id: true, requisitionNumber: true, status: true, title: true },
              });
          if (pr) {
            return {
              ...link,
              id: pr.id,
              code: pr.requisitionNumber,
              title: pr.title,
              status: pr.status,
              href: `/procurement/requisitions/show/${pr.id}`,
            };
          }
        }
        return link;
      }),
    );
  }

  private async requireStaffUser(userId: number) {
    const other = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!other || !STAFF.includes(other.role.name) || !other.isActive) {
      throw new ForbiddenException('Chat is only between IT staff');
    }
    return other;
  }

  private async requireChannel(channelId: number, userId: number) {
    const channel = await this.prisma.chatChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    const member = await this.prisma.chatChannelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) throw new NotFoundException('Channel not found');
    return { channel, member };
  }

  private assertCanManage(actor: AuthUser, role: string) {
    if (this.isAdmin(actor) || role === 'owner') return;
    throw new ForbiddenException('Only a channel owner or IT Admin can do that');
  }
}

const messageInclude = {
  author: { select: AUTHOR_SELECT },
  mentions: { include: { user: { select: AUTHOR_SELECT } } },
  reactions: { include: { user: { select: AUTHOR_SELECT } } },
  attachments: { select: { id: true, filename: true, mimeType: true, sizeBytes: true } },
  replies: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { createdAt: true } },
  _count: { select: { replies: true } },
};

function normalizeChannelName(raw: string): string {
  const trimmed = raw.trim().replace(/^#+/, '');
  if (!trimmed) throw new BadRequestException('Channel name is required');
  const slug = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
  if (!slug) throw new BadRequestException('Channel name must use letters or numbers');
  return `#${slug}`;
}
