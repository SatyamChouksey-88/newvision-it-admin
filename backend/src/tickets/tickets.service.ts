import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmailNotifyPref,
  NotificationType,
  Prisma,
  RoleName,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { MailerService } from '../notifications/mailer.service';
import {
  dailyDigestEmail,
  newUnassignedTicketEmail,
  ratingPromptEmail,
  ticketAssignedEmail,
  ticketCommentEmail,
  ticketCreatedEmail,
  ticketStatusChangedEmail,
} from '../notifications/ticket-email-templates';
import { PrismaService } from '../prisma/prisma.service';
import { canTransitionTicket } from './tickets.lifecycle';

const STAFF: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT];
const OPEN_STATUSES: TicketStatus[] = ['open', 'assigned', 'in_progress', 'reopened'];

export function isTicketStaff(role: RoleName) {
  return STAFF.includes(role);
}

const INCLUDE = {
  category: true,
  raisedBy: { select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true, department: true, location: true } },
  assignedTo: { select: { id: true, fullName: true, email: true, role: { select: { name: true } }, employee: { select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true, department: true, location: true } } } },
  asset: { select: { id: true, assetCode: true } },
  location: { select: { id: true, code: true, name: true } },
  duplicateOf: { select: { id: true, ticketNumber: true, subject: true } },
  watchers: { include: { employee: { select: { id: true, firstName: true, lastName: true, email: true } } } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.SupportTicketInclude;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
  ) {}

  async list(
    query: ListQuery & {
      status?: string;
      priority?: string;
      categoryId?: string;
      assignedToId?: string;
      overdue?: string;
      unassigned?: string;
      awaitingReply?: string;
      mine?: string;
      view?: string;
    },
    actor: AuthUser,
  ) {
    const { skip, take, orderBy } = parseListQuery(query, [
      'id',
      'createdAt',
      'updatedAt',
      'priority',
      'status',
      'dueDate',
    ]);
    const where = await this.visibilityWhere(actor);
    if (query.status) where.status = query.status as TicketStatus;
    if (query.priority) where.priority = query.priority as TicketPriority;
    if (query.categoryId) where.categoryId = Number(query.categoryId);
    if (query.assignedToId) where.assignedToId = Number(query.assignedToId);
    if (query.unassigned === 'true' || query.view === 'unassigned') where.assignedToId = null;
    if (query.mine === 'true' || query.view === 'mine') where.assignedToId = actor.id;
    if (query.view === 'awaiting_reply' || query.awaitingReply === 'true') {
      where.assignedToId = actor.id;
    }
    if (query.overdue === 'true' || query.view === 'overdue') {
      where.dueDate = { lt: new Date() };
      where.status = { in: OPEN_STATUSES };
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      const commentFilter: Prisma.TicketCommentWhereInput = isTicketStaff(actor.role)
        ? { body: { contains: q, mode: 'insensitive' } }
        : { body: { contains: q, mode: 'insensitive' }, isInternal: false };
      const search: Prisma.SupportTicketWhereInput = {
        OR: [
          { subject: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { ticketNumber: { contains: q, mode: 'insensitive' } },
          { comments: { some: commentFilter } },
        ],
      };
      const and: Prisma.SupportTicketWhereInput[] = [];
      if (Array.isArray(where.AND)) and.push(...where.AND);
      else if (where.AND) and.push(where.AND);
      and.push(search);
      where.AND = and;
    }

    const awaiting = query.view === 'awaiting_reply' || query.awaitingReply === 'true';
    let data = await this.prisma.supportTicket.findMany({
      where,
      skip: awaiting ? 0 : skip,
      take: awaiting ? 500 : take,
      orderBy: orderBy ?? { updatedAt: 'desc' },
      include: INCLUDE,
    });
    let total = await this.prisma.supportTicket.count({ where });

    if (awaiting) {
      const ids = data.map((t) => t.id);
      const last = await this.lastCommentAuthors(ids);
      data = data.filter((t) => {
        const authorId = last.get(t.id);
        return authorId != null && authorId !== t.assignedToId;
      });
      total = data.length;
      data = data.slice(skip, skip + take);
    }

    return { data: data.map((t) => this.decorate(t)), total };
  }

  async counts(actor: AuthUser) {
    const base = await this.visibilityWhere(actor);
    const grouped = await this.prisma.supportTicket.groupBy({
      by: ['status'],
      where: base,
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
    const unassigned = await this.prisma.supportTicket.count({
      where: { ...base, assignedToId: null, status: { in: OPEN_STATUSES } },
    });
    const overdue = await this.prisma.supportTicket.count({
      where: { ...base, dueDate: { lt: new Date() }, status: { in: OPEN_STATUSES } },
    });
    return { byStatus, unassigned, overdue, openUnassigned: unassigned };
  }

  async get(id: number, actor: AuthUser) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        ...INCLUDE,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, fullName: true, role: { select: { name: true } } } } },
        },
        timeLogs: {
          orderBy: { loggedAt: 'desc' },
          include: { staff: { select: { id: true, fullName: true } } },
        },
        attachments: {
          select: { id: true, filename: true, mimeType: true, sizeBytes: true, commentId: true, createdAt: true },
        },
      },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    await this.assertCanView(ticket, actor);
    const comments = isTicketStaff(actor.role)
      ? ticket.comments
      : ticket.comments.filter((c) => !c.isInternal);
    return this.decorate({ ...ticket, comments });
  }

  async create(
    dto: {
      subject: string;
      description: string;
      categoryId: number;
      priority?: TicketPriority;
      assetId?: number;
      locationId?: number;
      dueDate?: string;
      templateId?: number;
      raisedByEmployeeId?: number;
      watcherEmployeeIds?: number[];
      autoAssign?: boolean;
    },
    actor: AuthUser,
  ) {
    let subject = dto.subject;
    let description = dto.description;
    let categoryId = dto.categoryId;
    if (dto.templateId) {
      const tpl = await this.prisma.ticketTemplate.findUniqueOrThrow({ where: { id: dto.templateId } });
      subject = subject || tpl.subject;
      description = description || tpl.description;
      categoryId = categoryId || tpl.categoryId;
    }
    const category = await this.prisma.ticketCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new BadRequestException('Unknown ticket category');
    const raisedById = dto.raisedByEmployeeId ?? actor.employeeId;
    if (!raisedById) throw new BadRequestException('Link an employee record before raising a ticket');
    const emp = await this.prisma.employee.findUnique({ where: { id: raisedById } });
    if (!emp) throw new BadRequestException('Employee not found');
    if (!isTicketStaff(actor.role) && raisedById !== actor.employeeId) {
      throw new ForbiddenException('You can only raise tickets for yourself');
    }

    const priority = dto.priority ?? category.defaultPriority;
    let assignedToId: number | null = null;
    let status: TicketStatus = 'open';
    if (dto.autoAssign !== false) {
      assignedToId = await this.leastLoadedSupport();
      if (assignedToId) status = 'assigned';
    }

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          ticketNumber: `TMP-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
          subject,
          description,
          categoryId,
          priority,
          status,
          raisedById,
          assignedToId,
          assetId: dto.assetId ?? null,
          locationId: dto.locationId ?? emp.locationId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
      });
      const numbered = await tx.supportTicket.update({
        where: { id: created.id },
        data: { ticketNumber: `TCK-${String(created.id).padStart(6, '0')}` },
        include: INCLUDE,
      });
      for (const wid of dto.watcherEmployeeIds ?? []) {
        await tx.ticketWatcher.create({ data: { ticketId: numbered.id, employeeId: wid } });
      }
      await this.audit.record(
        {
          entityType: 'SupportTicket',
          entityId: numbered.id,
          action: 'create',
          summary: `Opened ${numbered.ticketNumber}: ${subject}`,
          changedById: actor.id,
          newValue: numbered,
        },
        tx,
      );
      return numbered;
    });

    if (!assignedToId) {
      await this.notifyStaffNewUnassigned(ticket.id, ticket.ticketNumber, subject);
    } else {
      const assignedEmail = ticketAssignedEmail({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, subject });
      await this.notifyUsers([assignedToId], assignedEmail.subject, subject, ticket.id, true, assignedEmail.html);
    }
    const requesterUserId = await this.userIdForEmployee(raisedById);
    if (requesterUserId) {
      const confirmEmail = ticketCreatedEmail({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, subject });
      await this.notifyUsers([requesterUserId], confirmEmail.subject, subject, ticket.id, false, confirmEmail.html);
    }
    return this.get(ticket.id, actor);
  }

  async assign(id: number, userId: number | null, actor: AuthUser) {
    this.assertStaff(actor);
    const ticket = await this.require(id);
    const status: TicketStatus = userId ? (ticket.status === 'open' ? 'assigned' : ticket.status) : 'open';
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { assignedToId: userId, status },
      include: INCLUDE,
    });
    await this.audit.record({
      entityType: 'SupportTicket',
      entityId: id,
      action: 'assign',
      summary: userId
        ? `Assigned ${ticket.ticketNumber} to user ${userId}`
        : `Unassigned ${ticket.ticketNumber}`,
      changedById: actor.id,
      oldValue: { assignedToId: ticket.assignedToId, status: ticket.status },
      newValue: { assignedToId: userId, status },
    });
    if (userId) {
      const assignedEmail = ticketAssignedEmail({ ticketId: id, ticketNumber: ticket.ticketNumber, subject: ticket.subject });
      await this.notifyUsers([userId], assignedEmail.subject, ticket.subject, id, true, assignedEmail.html);
      const statusEmail = ticketStatusChangedEmail({ ticketId: id, ticketNumber: ticket.ticketNumber, status });
      await this.notifyRequesterAndWatchers(
        ticket,
        `${ticket.ticketNumber} assigned`,
        `Your ticket is now assigned.`,
        statusEmail.html,
      );
    }
    return this.decorate(updated);
  }

  async transition(id: number, status: TicketStatus, actor: AuthUser) {
    this.assertStaff(actor);
    const ticket = await this.require(id);
    if (!canTransitionTicket(ticket.status, status)) {
      throw new BadRequestException(`Cannot move ${ticket.status} → ${status}`);
    }
    const data: Prisma.SupportTicketUpdateInput = { status };
    if (status === 'resolved') data.resolvedAt = new Date();
    if (status === 'closed') data.closedAt = new Date();
    if (status === 'reopened') {
      data.closedAt = null;
      data.resolvedAt = null;
      data.ratingPromptDropped = true;
    }
    const updated = await this.prisma.supportTicket.update({ where: { id }, data, include: INCLUDE });
    await this.audit.record({
      entityType: 'SupportTicket',
      entityId: id,
      action: 'status_change',
      summary: `${ticket.ticketNumber} ${ticket.status} → ${status}`,
      changedById: actor.id,
      oldValue: { status: ticket.status },
      newValue: { status },
    });
    const statusEmail = ticketStatusChangedEmail({ ticketId: id, ticketNumber: ticket.ticketNumber, status });
    await this.notifyRequesterAndWatchers(
      ticket,
      `${ticket.ticketNumber} is now ${status.replaceAll('_', ' ')}`,
      ticket.subject,
      statusEmail.html,
    );
    if (status === 'resolved') {
      const requesterUser = await this.userIdForEmployee(ticket.raisedById);
      if (requesterUser) {
        const rating = ratingPromptEmail({ ticketId: id, ticketNumber: ticket.ticketNumber });
        await this.notifyUsers(
          [requesterUser],
          rating.subject,
          'Please rate this resolution (1–5) from the ticket page.',
          id,
          false,
          rating.html,
        );
      }
    }
    return this.decorate(updated);
  }

  async comment(id: number, body: string, isInternal: boolean, actor: AuthUser) {
    const ticket = await this.require(id);
    await this.assertCanView(ticket, actor);
    if (isInternal && !isTicketStaff(actor.role)) {
      throw new ForbiddenException('Only IT staff can add internal notes');
    }
    if (!isTicketStaff(actor.role) && ticket.raisedById !== actor.employeeId) {
      const watching = await this.prisma.ticketWatcher.findFirst({
        where: { ticketId: id, employeeId: actor.employeeId ?? 0 },
      });
      if (!watching) throw new ForbiddenException('You cannot comment on this ticket');
    }
    const row = await this.prisma.ticketComment.create({
      data: { ticketId: id, authorId: actor.id, body, isInternal },
      include: { author: { select: { id: true, fullName: true } } },
    });
    await this.prisma.supportTicket.update({ where: { id }, data: { updatedAt: new Date() } });
    await this.audit.record({
      entityType: 'SupportTicket',
      entityId: id,
      action: 'comment',
      summary: `${isInternal ? 'Internal note' : 'Comment'} on ${ticket.ticketNumber}`,
      changedById: actor.id,
    });
    if (!isInternal) {
      const excerpt = body.slice(0, 200);
      const commentEmail = ticketCommentEmail({
        ticketId: id,
        ticketNumber: ticket.ticketNumber,
        authorLabel: actor.fullName,
        excerpt,
      });
      await this.notifyRequesterAndWatchers(ticket, commentEmail.subject, excerpt, commentEmail.html);
      if (ticket.assignedToId && ticket.assignedToId !== actor.id) {
        await this.notifyUsers(
          [ticket.assignedToId],
          `Requester commented on ${ticket.ticketNumber}`,
          excerpt,
          id,
          true,
          commentEmail.html,
        );
      }
    }
    return row;
  }

  async addWatcher(id: number, employeeId: number, actor: AuthUser) {
    const ticket = await this.require(id);
    await this.assertCanView(ticket, actor);
    if (!isTicketStaff(actor.role) && ticket.raisedById !== actor.employeeId) {
      throw new ForbiddenException('Cannot add watchers on this ticket');
    }
    const row = await this.prisma.ticketWatcher.upsert({
      where: { ticketId_employeeId: { ticketId: id, employeeId } },
      update: {},
      create: { ticketId: id, employeeId },
    });
    await this.audit.record({
      entityType: 'SupportTicket',
      entityId: id,
      action: 'update',
      summary: `Added watcher ${employeeId} to ${ticket.ticketNumber}`,
      changedById: actor.id,
    });
    return row;
  }

  async removeWatcher(id: number, employeeId: number, actor: AuthUser) {
    this.assertStaff(actor);
    await this.prisma.ticketWatcher.deleteMany({ where: { ticketId: id, employeeId } });
    return { ok: true };
  }

  async logTime(id: number, minutes: number, note: string | undefined, actor: AuthUser) {
    this.assertStaff(actor);
    const ticket = await this.require(id);
    const row = await this.prisma.$transaction(async (tx) => {
      const log = await tx.ticketTimeLog.create({
        data: { ticketId: id, staffId: actor.id, minutes, note },
      });
      await tx.supportTicket.update({
        where: { id },
        data: { totalTimeSpentMinutes: { increment: minutes } },
      });
      return log;
    });
    await this.audit.record({
      entityType: 'SupportTicket',
      entityId: id,
      action: 'update',
      summary: `Logged ${minutes}m on ${ticket.ticketNumber}`,
      changedById: actor.id,
    });
    return row;
  }

  async rate(id: number, rating: number, comment: string | undefined, actor: AuthUser) {
    const ticket = await this.require(id);
    if (ticket.raisedById !== actor.employeeId) throw new ForbiddenException('Only the requester can rate');
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      throw new BadRequestException('Rate a ticket after it is resolved');
    }
    if (ticket.ratedAt) throw new BadRequestException('Already rated');
    if (ticket.ratingPromptDropped) throw new BadRequestException('Rating was skipped because the ticket was reopened');
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { satisfactionRating: rating, satisfactionComment: comment ?? null, ratedAt: new Date() },
      include: INCLUDE,
    });
    return this.decorate(updated);
  }

  async markDuplicate(id: number, originalNumber: string, actor: AuthUser) {
    this.assertStaff(actor);
    const ticket = await this.require(id);
    if (!OPEN_STATUSES.includes(ticket.status) && ticket.status !== 'resolved') {
      throw new BadRequestException('Only open tickets can be marked duplicate');
    }
    const original = await this.prisma.supportTicket.findUnique({ where: { ticketNumber: originalNumber } });
    if (!original || original.id === id) throw new BadRequestException('Original ticket not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id },
        data: { duplicateOfId: original.id, status: 'closed', closedAt: new Date() },
      });
      await tx.ticketComment.create({
        data: {
          ticketId: id,
          authorId: actor.id,
          body: `Marked duplicate of ${original.ticketNumber}. Follow that ticket for updates.`,
          isInternal: false,
        },
      });
    });
    await this.audit.record({
      entityType: 'SupportTicket',
      entityId: id,
      action: 'status_change',
      summary: `${ticket.ticketNumber} closed as duplicate of ${original.ticketNumber}`,
      changedById: actor.id,
    });
    await this.notifyRequesterAndWatchers(
      ticket,
      `${ticket.ticketNumber} closed as a duplicate`,
      `This is the same issue as ${original.ticketNumber}. Open that ticket and add yourself as a watcher if you want updates.`,
    );
    return this.get(id, actor);
  }

  async bulkAssign(ids: number[], userId: number, actor: AuthUser) {
    this.assertStaff(actor);
    for (const id of ids) {
      await this.assign(id, userId, actor);
    }
    return { updated: ids.length };
  }

  async bulkClose(ids: number[], comment: string, actor: AuthUser) {
    this.assertStaff(actor);
    for (const id of ids) {
      const ticket = await this.require(id);
      if (ticket.status !== 'closed') {
        if (canTransitionTicket(ticket.status, 'resolved')) {
          await this.transition(id, 'resolved', actor);
        }
        const current = await this.require(id);
        if (canTransitionTicket(current.status, 'closed')) {
          await this.transition(id, 'closed', actor);
        } else if (current.status !== 'closed') {
          await this.prisma.supportTicket.update({
            where: { id },
            data: { status: 'closed', closedAt: new Date() },
          });
        }
      }
      await this.comment(id, comment, false, actor);
    }
    return { updated: ids.length };
  }

  async reports(from?: string, to?: string) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);
    const where: Prisma.SupportTicketWhereInput = Object.keys(createdAt).length ? { createdAt } : {};
    const [byStatus, byCategory, byPriority, closed, overdue, rated] = await Promise.all([
      this.prisma.supportTicket.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.supportTicket.groupBy({ by: ['categoryId'], where, _count: { _all: true } }),
      this.prisma.supportTicket.groupBy({ by: ['priority'], where, _count: { _all: true } }),
      this.prisma.supportTicket.findMany({
        where: { ...where, status: 'closed', closedAt: { not: null }, createdAt: { not: undefined } },
        select: { createdAt: true, closedAt: true, assignedToId: true, assignedTo: { select: { fullName: true } }, satisfactionRating: true },
      }),
      this.prisma.supportTicket.count({
        where: { dueDate: { lt: new Date() }, status: { in: OPEN_STATUSES } },
      }),
      this.prisma.supportTicket.findMany({
        where: { satisfactionRating: { not: null } },
        select: { satisfactionRating: true, assignedToId: true, assignedTo: { select: { fullName: true } } },
      }),
    ]);
    const categories = await this.prisma.ticketCategory.findMany();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const resolvedMs = closed
      .filter((t) => t.closedAt)
      .map((t) => t.closedAt!.getTime() - t.createdAt.getTime());
    const avgResolutionHours =
      resolvedMs.length === 0 ? 0 : Math.round((resolvedMs.reduce((a, b) => a + b, 0) / resolvedMs.length / 36e5) * 10) / 10;
    const closedPerStaff: Record<string, { name: string; closed: number; avgRating: number | null }> = {};
    for (const t of closed) {
      const key = String(t.assignedToId ?? 'unassigned');
      const name = t.assignedTo?.fullName ?? 'Unassigned';
      closedPerStaff[key] ??= { name, closed: 0, avgRating: null };
      closedPerStaff[key].closed += 1;
    }
    const ratingsByStaff: Record<string, number[]> = {};
    const allRatings: number[] = [];
    for (const t of rated) {
      if (t.satisfactionRating == null) continue;
      allRatings.push(t.satisfactionRating);
      const key = String(t.assignedToId ?? 'unassigned');
      ratingsByStaff[key] ??= [];
      ratingsByStaff[key].push(t.satisfactionRating);
    }
    for (const [key, vals] of Object.entries(ratingsByStaff)) {
      if (!closedPerStaff[key]) closedPerStaff[key] = { name: key, closed: 0, avgRating: null };
      closedPerStaff[key].avgRating = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    }
    const dist = [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: allRatings.filter((r) => r === n).length }));
    return {
      byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
      byCategory: byCategory.map((g) => ({ category: catMap.get(g.categoryId) ?? String(g.categoryId), count: g._count._all })),
      byPriority: Object.fromEntries(byPriority.map((g) => [g.priority, g._count._all])),
      avgResolutionHours,
      overdueOpen: overdue,
      closedPerStaff: Object.values(closedPerStaff),
      avgSatisfaction: allRatings.length
        ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
        : null,
      ratingDistribution: dist,
    };
  }

  async setNotifyPref(actor: AuthUser, pref: EmailNotifyPref) {
    if (!isTicketStaff(actor.role)) throw new ForbiddenException('Only IT staff have digest preferences');
    return this.prisma.user.update({ where: { id: actor.id }, data: { emailNotifyPref: pref } });
  }

  async sendDailyDigests() {
    const staff = await this.prisma.user.findMany({
      where: { isActive: true, emailNotifyPref: 'daily_digest', role: { name: { in: STAFF } } },
    });
    const since = new Date();
    since.setDate(since.getDate() - 1);
    let sent = 0;
    for (const u of staff) {
      const [created, assigned, awaiting] = await Promise.all([
        this.prisma.supportTicket.count({ where: { createdAt: { gte: since } } }),
        this.prisma.supportTicket.count({ where: { assignedToId: u.id, updatedAt: { gte: since } } }),
        this.prisma.supportTicket.count({ where: { assignedToId: u.id, status: { in: OPEN_STATUSES } } }),
      ]);
      const digest = dailyDigestEmail({ created, assignedUpdates: assigned, stillOpen: awaiting });
      await this.mailer.send({ to: u.email, subject: digest.subject, text: digest.text, html: digest.html });
      sent += 1;
    }
    return { sent };
  }

  async exportRows(query: Parameters<TicketsService['list']>[0], actor: AuthUser) {
    const { data } = await this.list({ ...query, _start: '0', _end: '500' }, actor);
    return data.map((raw) => {
      const t = raw as typeof raw & {
        ticketNumber: string;
        subject: string;
        priority: string;
        category?: { name?: string };
        raisedBy: { firstName: string; lastName: string };
        assignedTo?: { fullName: string } | null;
        updatedAt: Date;
      };
      return {
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        category: t.category?.name,
        raisedBy: `${t.raisedBy.firstName} ${t.raisedBy.lastName}`,
        assignedTo: t.assignedTo?.fullName ?? '',
        updatedAt: t.updatedAt,
      };
    });
  }

  async timeline(id: number, actor: AuthUser) {
    await this.get(id, actor);
    const logs = await this.prisma.auditLog.findMany({
      where: { entityType: 'SupportTicket', entityId: String(id) },
      orderBy: { createdAt: 'asc' },
      include: { changedBy: { select: { id: true, fullName: true } } },
    });
    return logs.map((l) => ({
      id: l.id,
      at: l.createdAt,
      action: l.action,
      summary: l.summary,
      actor: l.changedBy?.fullName ?? 'System',
      manual: l.action === 'manual_override',
      backfilled: Boolean(
        l.newValue &&
          typeof l.newValue === 'object' &&
          !Array.isArray(l.newValue) &&
          (l.newValue as { isBackfilled?: boolean }).isBackfilled,
      ),
    }));
  }

  listCategories() {
    return this.prisma.ticketCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async upsertCategory(
    dto: { id?: number; code: string; name: string; defaultPriority?: TicketPriority },
    actor: AuthUser,
  ) {
    this.assertStaff(actor);
    const data = {
      code: dto.code.toLowerCase().replace(/\s+/g, '_'),
      name: dto.name,
      defaultPriority: dto.defaultPriority ?? TicketPriority.medium,
    };
    const row = dto.id
      ? await this.prisma.ticketCategory.update({ where: { id: dto.id }, data })
      : await this.prisma.ticketCategory.create({ data });
    await this.audit.record({
      entityType: 'TicketCategory',
      entityId: row.id,
      action: dto.id ? 'update' : 'create',
      summary: `${dto.id ? 'Updated' : 'Created'} ticket category ${row.name}`,
      changedById: actor.id,
    });
    return row;
  }

  listCanned() {
    return this.prisma.cannedResponse.findMany({
      orderBy: { title: 'asc' },
      include: { createdBy: { select: { fullName: true } } },
    });
  }

  async createCanned(dto: { title: string; body: string }, actor: AuthUser) {
    this.assertStaff(actor);
    const row = await this.prisma.cannedResponse.create({
      data: { title: dto.title, body: dto.body, createdById: actor.id },
    });
    await this.audit.record({
      entityType: 'CannedResponse',
      entityId: row.id,
      action: 'create',
      summary: `Created canned response "${row.title}"`,
      changedById: actor.id,
    });
    return row;
  }

  async updateCanned(id: number, dto: { title?: string; body?: string }, actor: AuthUser) {
    this.assertStaff(actor);
    return this.prisma.cannedResponse.update({ where: { id }, data: dto });
  }

  async deleteCanned(id: number, actor: AuthUser) {
    this.assertStaff(actor);
    await this.prisma.cannedResponse.delete({ where: { id } });
    return { ok: true };
  }

  listTemplates() {
    return this.prisma.ticketTemplate.findMany({
      orderBy: { title: 'asc' },
      include: { category: true, createdBy: { select: { fullName: true } } },
    });
  }

  async createTemplate(
    dto: { title: string; subject: string; description: string; categoryId: number },
    actor: AuthUser,
  ) {
    this.assertStaff(actor);
    const row = await this.prisma.ticketTemplate.create({
      data: { ...dto, createdById: actor.id },
    });
    await this.audit.record({
      entityType: 'TicketTemplate',
      entityId: row.id,
      action: 'create',
      summary: `Created ticket template "${row.title}"`,
      changedById: actor.id,
    });
    return row;
  }

  async updateTemplate(
    id: number,
    dto: { title?: string; subject?: string; description?: string; categoryId?: number },
    actor: AuthUser,
  ) {
    this.assertStaff(actor);
    return this.prisma.ticketTemplate.update({ where: { id }, data: dto });
  }

  async deleteTemplate(id: number, actor: AuthUser) {
    this.assertStaff(actor);
    await this.prisma.ticketTemplate.delete({ where: { id } });
    return { ok: true };
  }

  listStaff() {
    return this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: STAFF } } },
      select: { id: true, fullName: true, email: true, role: { select: { name: true } } },
      orderBy: { fullName: 'asc' },
    });
  }

  async addAttachment(
    ticketId: number,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    actor: AuthUser,
    commentId?: number,
  ) {
    await this.get(ticketId, actor);
    const ext = file.originalname.toLowerCase().replace(/^.*(\.[a-z0-9]+)$/, '$1');
    const blocked = new Set(['.exe', '.bat', '.cmd', '.msi', '.js', '.vbs', '.scr', '.com', '.pif', '.dll']);
    if (blocked.has(ext)) throw new BadRequestException('That file type is not allowed');
    if (file.size > 8 * 1024 * 1024) throw new BadRequestException('Attachments must be 8 MB or smaller');
    const allowed = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ]);
    if (file.mimetype && !allowed.has(file.mimetype) && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('That file type is not allowed');
    }
    const row = await this.prisma.ticketAttachment.create({
      data: {
        ticketId,
        commentId: commentId ?? null,
        filename: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size,
        data: Uint8Array.from(file.buffer),
        uploadedById: actor.id,
      },
      select: { id: true, filename: true, mimeType: true, sizeBytes: true, createdAt: true },
    });
    await this.audit.record({
      entityType: 'SupportTicket',
      entityId: ticketId,
      action: 'update',
      summary: `Attached ${file.originalname}`,
      changedById: actor.id,
    });
    return row;
  }

  async getAttachment(ticketId: number, attachmentId: number, actor: AuthUser) {
    await this.get(ticketId, actor);
    const row = await this.prisma.ticketAttachment.findFirst({
      where: { id: attachmentId, ticketId },
    });
    if (!row) throw new NotFoundException('Attachment not found');
    return row;
  }

  private decorate<T extends { dueDate?: Date | null; status: TicketStatus }>(t: T) {
    const overdue = Boolean(
      t.dueDate && t.dueDate < new Date() && OPEN_STATUSES.includes(t.status),
    );
    return { ...t, overdue };
  }

  private async visibilityWhere(actor: AuthUser): Promise<Prisma.SupportTicketWhereInput> {
    if (isTicketStaff(actor.role)) return {};
    if (actor.role === RoleName.MANAGER && actor.employeeId) {
      const reports = await this.prisma.employee.findMany({
        where: { managerId: actor.employeeId },
        select: { id: true },
      });
      const ids = [actor.employeeId, ...reports.map((r) => r.id)];
      return {
        OR: [{ raisedById: { in: ids } }, { watchers: { some: { employeeId: actor.employeeId } } }],
      };
    }
    if (!actor.employeeId) return { id: -1 };
    return {
      OR: [{ raisedById: actor.employeeId }, { watchers: { some: { employeeId: actor.employeeId } } }],
    };
  }

  private async assertCanView(
    ticket: { id: number; raisedById: number },
    actor: AuthUser,
  ) {
    if (isTicketStaff(actor.role)) return;
    const where = await this.visibilityWhere(actor);
    const ok = await this.prisma.supportTicket.findFirst({
      where: { AND: [{ id: ticket.id }, where] },
    });
    if (!ok) throw new ForbiddenException('Not allowed to view this ticket');
  }

  private async require(id: number) {
    const t = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { watchers: true, raisedBy: { select: { id: true, email: true } } },
    });
    if (!t) throw new NotFoundException(`Ticket ${id} not found`);
    return t;
  }

  private assertStaff(actor: AuthUser) {
    if (!isTicketStaff(actor.role)) throw new ForbiddenException('IT staff only');
  }

  private async leastLoadedSupport(): Promise<number | null> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: RoleName.IT_SUPPORT } },
      select: { id: true },
    });
    if (users.length === 0) return null;
    const counts = await this.prisma.supportTicket.groupBy({
      by: ['assignedToId'],
      where: { assignedToId: { in: users.map((u) => u.id) }, status: { in: OPEN_STATUSES } },
      _count: { _all: true },
    });
    const map = new Map(counts.map((c) => [c.assignedToId, c._count._all]));
    users.sort((a, b) => (map.get(a.id) ?? 0) - (map.get(b.id) ?? 0));
    return users[0].id;
  }

  private async lastCommentAuthors(ticketIds: number[]) {
    const map = new Map<number, number>();
    if (ticketIds.length === 0) return map;
    const comments = await this.prisma.ticketComment.findMany({
      where: { ticketId: { in: ticketIds }, isInternal: false },
      orderBy: { createdAt: 'desc' },
      select: { ticketId: true, authorId: true },
    });
    for (const c of comments) {
      if (!map.has(c.ticketId)) map.set(c.ticketId, c.authorId);
    }
    return map;
  }

  private async userIdForEmployee(employeeId: number) {
    const u = await this.prisma.user.findUnique({ where: { employeeId } });
    return u?.id ?? null;
  }

  private async notifyRequesterAndWatchers(
    ticket: { id: number; ticketNumber: string; raisedById: number },
    title: string,
    message: string,
    html?: string,
  ) {
    const watchers = await this.prisma.ticketWatcher.findMany({
      where: { ticketId: ticket.id },
      include: { employee: { include: { user: true } } },
    });
    const userIds: number[] = [];
    const requester = await this.userIdForEmployee(ticket.raisedById);
    if (requester) userIds.push(requester);
    for (const w of watchers) {
      if (w.employee.user?.id) userIds.push(w.employee.user.id);
    }
    await this.notifyUsers([...new Set(userIds)], title, message, ticket.id, false, html);
  }

  private async notifyStaffNewUnassigned(ticketId: number, number: string, subject: string) {
    const staff = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: [RoleName.IT_ADMIN, RoleName.IT_SUPPORT] } } },
      select: { id: true },
    });
    const email = newUnassignedTicketEmail({ ticketId, ticketNumber: number, subject });
    await this.notifyUsers(
      staff.map((s) => s.id),
      email.subject,
      subject,
      ticketId,
      true,
      email.html,
    );
  }

  /** In-app always. Email is skipped for IT staff who chose daily digest. */
  async notifyUsers(
    userIds: number[],
    title: string,
    message: string,
    ticketId: number,
    honorDigest: boolean,
    html?: string,
  ) {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return;
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      include: { role: true },
    });
    await this.prisma.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        type: NotificationType.support_ticket,
        title,
        message,
        supportTicketId: ticketId,
      })),
    });
    for (const u of users) {
      if (honorDigest && isTicketStaff(u.role.name) && u.emailNotifyPref === EmailNotifyPref.daily_digest) {
        continue;
      }
      await this.mailer.send({ to: u.email, subject: title, text: message, html });
    }
  }
}
