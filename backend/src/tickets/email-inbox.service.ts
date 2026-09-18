import { Injectable, Logger } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { MailerService } from '../notifications/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId, resolveTenantId, runUnscoped, runWithTenant } from '../tenancy/context';
import {
  extractTicketNumber,
  isMailLoopOrAutoReply,
  parseRfc822,
  stripQuotedReply,
  type ParsedEmail,
} from './email-parser';
import { TicketsService } from './tickets.service';

export type IngestResult =
  | { action: 'ignored'; reason: string }
  | { action: 'duplicate'; messageId: string }
  | { action: 'rate_limited'; from: string }
  | { action: 'ticket'; ticketId: number; ticketNumber: string; unmatchedSender?: string }
  | { action: 'comment'; ticketId: number; ticketNumber: string; unmatchedSender?: string }
  /** Phase 1 hardening: sender didn't match the requester/assignee/a watcher — recorded as an
   * internal-only note for staff review instead of an authenticated public update. */
  | { action: 'comment_unverified'; ticketId: number; ticketNumber: string; unmatchedSender: string };

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 15;

@Injectable()
export class EmailInboxService {
  private readonly logger = new Logger(EmailInboxService.name);
  private readonly recentFrom = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
    private readonly mailer: MailerService,
  ) {}

  isConfigured(): boolean {
    return Boolean(process.env.IMAP_HOST || process.env.EMAIL_INGEST_SECRET);
  }

  helpdeskAddress(): string {
    return (
      process.env.HELPDESK_MAILBOX ||
      process.env.MAIL_REPLY_TO ||
      'it@newvision.local'
    ).toLowerCase();
  }

  async status() {
    const tenantId = requireTenantId();
    const row = await this.prisma.emailIngestState.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
    });
    return {
      configured: this.isConfigured(),
      mailbox: this.helpdeskAddress(),
      imapHost: process.env.IMAP_HOST || null,
      lastCheckedAt: row.lastCheckedAt,
      lastMessageCount: row.lastMessageCount,
      lastError: row.lastError,
    };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!process.env.IMAP_HOST) {
      return {
        ok: true,
        message:
          'IMAP is not configured. Inbound mail can still be posted to POST /api/email-in/ingest when EMAIL_INGEST_SECRET is set.',
      };
    }
    try {
      const { ImapFlow } = await import('imapflow');
      const client = new ImapFlow({
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT ?? 993),
        secure: process.env.IMAP_SECURE !== 'false',
        auth: { user: process.env.IMAP_USER ?? '', pass: process.env.IMAP_PASS ?? '' },
        logger: false,
      });
      await client.connect();
      await client.logout();
      return { ok: true, message: `Connected to ${process.env.IMAP_HOST}` };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, message };
    }
  }

  /** One full IMAP poll cycle for external cron (Hostinger hPanel). */
  async runEmailPollCycle(): Promise<{
    emailsProcessed: number;
    ticketsCreated: number;
    commentsAdded: number;
    skipped: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    if (!process.env.IMAP_HOST) {
      return { emailsProcessed: 0, ticketsCreated: 0, commentsAdded: 0, skipped: 1, errors };
    }
    try {
      const stats = await this.pollImapWithStats();
      await this.touchState({
        lastMessageCount: stats.ticketsCreated + stats.commentsAdded,
        lastError: stats.errors.length ? stats.errors.join('; ') : null,
      });
      return stats;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(message);
      if (resolveTenantId() != null) await this.touchState({ lastError: message });
      throw e;
    }
  }

  async pollImap(): Promise<number> {
    const stats = await this.pollImapWithStats();
    return stats.ticketsCreated + stats.commentsAdded;
  }

  private async pollImapWithStats(): Promise<{
    emailsProcessed: number;
    ticketsCreated: number;
    commentsAdded: number;
    skipped: number;
    errors: string[];
  }> {
    if (!process.env.IMAP_HOST) {
      this.logger.log('Email-in IMAP not configured — skipping poll');
      return {
        emailsProcessed: 0,
        ticketsCreated: 0,
        commentsAdded: 0,
        skipped: 1,
        errors: [],
      };
    }
    const { ImapFlow } = await import('imapflow');
    const client = new ImapFlow({
      host: process.env.IMAP_HOST,
      port: Number(process.env.IMAP_PORT ?? 993),
      secure: process.env.IMAP_SECURE !== 'false',
      auth: { user: process.env.IMAP_USER ?? '', pass: process.env.IMAP_PASS ?? '' },
      logger: false,
    });
    await client.connect();
    let emailsProcessed = 0;
    let ticketsCreated = 0;
    let commentsAdded = 0;
    const errors: string[] = [];
    try {
      const lock = await client.getMailboxLock(process.env.IMAP_MAILBOX || 'INBOX');
      try {
        for await (const msg of client.fetch({ seen: false }, { source: true, uid: true })) {
          const raw = msg.source?.toString('utf8') ?? '';
          if (!raw) continue;
          emailsProcessed += 1;
          try {
            const result = await this.processRaw(raw);
            if (result.action === 'ticket') ticketsCreated += 1;
            if (result.action === 'comment' || result.action === 'comment_unverified') {
              commentsAdded += 1;
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            errors.push(message);
          }
          await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
    if (resolveTenantId() != null) {
      await this.touchState({
        lastMessageCount: ticketsCreated + commentsAdded,
        lastError: errors.length ? errors.join('; ') : null,
      });
    }
    return {
      emailsProcessed,
      ticketsCreated,
      commentsAdded,
      skipped: 0,
      errors,
    };
  }

  async processRaw(raw: string): Promise<IngestResult> {
    if (resolveTenantId() == null) {
      const parsed = parseRfc822(raw);
      const tenantId = await runUnscoped(() =>
        this.inferTenantId(parsed.fromAddress, [extractAddr(parsed.to)]),
      );
      if (tenantId) return runWithTenant(tenantId, () => this.ingestParsed(parsed));
    }
    return this.ingestParsed(parseRfc822(raw));
  }

  private async ingestParsed(parsed: ParsedEmail): Promise<IngestResult> {
    const own = [
      this.helpdeskAddress(),
      extractAddr(process.env.MAIL_FROM),
      extractAddr(process.env.SMTP_USER),
    ].filter(Boolean);

    const loop = isMailLoopOrAutoReply(parsed, own);
    if (loop.skip) {
      this.logger.log(`Email-in discarded ${parsed.messageId}: ${loop.reason}`);
      return { action: 'ignored', reason: loop.reason ?? 'filtered' };
    }

    const existing = await this.prisma.ticketMessage.findUnique({
      where: { messageId: parsed.messageId },
    });
    if (existing) return { action: 'duplicate', messageId: parsed.messageId };

    if (this.isRateLimited(parsed.fromAddress)) {
      await this.notifyAdminsUnmatched(
        parsed.fromAddress,
        `Rate-limited inbound mail from ${parsed.fromAddress}`,
      );
      return { action: 'rate_limited', from: parsed.fromAddress };
    }

    const matched = await this.matchTicket(parsed);
    const employee = await this.prisma.employee.findFirst({
      where: { email: { equals: parsed.fromAddress, mode: 'insensitive' } },
    });
    const user = employee
      ? await this.prisma.user.findUnique({ where: { employeeId: employee.id }, include: { role: true } })
      : await this.prisma.user.findFirst({
          where: { email: { equals: parsed.fromAddress, mode: 'insensitive' } },
          include: { role: true },
        });

    const body = stripQuotedReply(parsed.text) || parsed.text || parsed.subject;

    if (matched) {
      const authorized = await this.isAuthorizedTicketSender(matched, employee, user);
      if (!authorized) {
        // Don't accept an unverified reply as an authenticated public update — the sender
        // isn't the requester, the assignee, or a watcher on this ticket (they may just have
        // guessed/observed the ticket number). Record it as an internal-only note instead.
        await this.tickets.addPublicOrInternalComment({
          ticket: matched,
          body: `[Unverified email reply from ${parsed.fromAddress} — sender does not match the requester, assignee, or a watcher on this ticket]\n\n${body}`,
          isInternal: true,
          authorId: user?.id ?? null,
          actorName: user?.fullName ?? parsed.from,
          actorRole: user?.role.name,
          actorEmployeeId: employee?.id ?? user?.employeeId ?? null,
          unmatchedSender: parsed.fromAddress,
        });
        await this.storeInbound(matched.id, parsed, await this.systemActor());
        await this.notifyAdminsUnmatched(
          parsed.fromAddress,
          `Unverified email reply on ${matched.ticketNumber} from ${parsed.fromAddress} — flagged for review, not posted publicly`,
        );
        return {
          action: 'comment_unverified',
          ticketId: matched.id,
          ticketNumber: matched.ticketNumber,
          unmatchedSender: parsed.fromAddress,
        };
      }
      await this.tickets.addPublicOrInternalComment({
        ticket: matched,
        body,
        isInternal: false,
        authorId: user?.id ?? null,
        actorName: user?.fullName ?? parsed.from,
        actorRole: user?.role.name,
        actorEmployeeId: employee?.id ?? user?.employeeId ?? null,
        unmatchedSender: user || employee ? null : parsed.fromAddress,
      });
      await this.storeInbound(matched.id, parsed, await this.systemActor());
      return {
        action: 'comment',
        ticketId: matched.id,
        ticketNumber: matched.ticketNumber,
        unmatchedSender: user || employee ? undefined : parsed.fromAddress,
      };
    }

    const category =
      (await this.prisma.ticketCategory.findFirst({ where: { code: 'general' } })) ??
      (await this.prisma.ticketCategory.findFirst());
    if (!category) {
      return { action: 'ignored', reason: 'no-ticket-category' };
    }

    const placeholderRaisedBy =
      employee?.id ??
      (await this.prisma.employee.findFirst({ orderBy: { id: 'asc' } }))?.id;
    if (!placeholderRaisedBy) {
      return { action: 'ignored', reason: 'no-employee-to-attach' };
    }

    const actor = await this.systemActor();
    const created = await this.tickets.create(
      {
        subject: parsed.subject.replace(/^((re|fwd):\s*)+/i, '').trim() || parsed.subject,
        description: body,
        categoryId: category.id,
        autoAssign: true,
        raisedByEmployeeId: placeholderRaisedBy,
        channel: 'email',
        unmatchedSender: employee ? null : parsed.fromAddress,
      },
      actor,
    );

    await this.storeInbound(created.id, parsed, actor);
    if (!employee) {
      await this.notifyAdminsUnmatched(
        parsed.fromAddress,
        `Unrecognized sender ${parsed.fromAddress} opened ${created.ticketNumber}`,
      );
    }
    return {
      action: 'ticket',
      ticketId: created.id,
      ticketNumber: created.ticketNumber,
      unmatchedSender: employee ? undefined : parsed.fromAddress,
    };
  }

  private async matchTicket(parsed: ParsedEmail) {
    const ids = [parsed.inReplyTo, ...parsed.references].filter(Boolean) as string[];
    if (ids.length) {
      const hit = await this.prisma.ticketMessage.findFirst({
        where: { messageId: { in: ids } },
        include: {
          ticket: true,
        },
      });
      if (hit?.ticket) return hit.ticket;
    }
    const number = extractTicketNumber(parsed.subject);
    if (number) {
      return this.prisma.supportTicket.findFirst({ where: { ticketNumber: number } });
    }
    return null;
  }

  /**
   * Phase 1 hardening: a matched reply is only trusted as an authenticated update from the
   * ticket's requester, its currently assigned staff member, or a watcher — not from anyone who
   * merely got the ticket number into a subject/References header (e.g. by CC, forwarding, or
   * guessing). Everyone else's reply still gets recorded, just as an internal-only note.
   */
  private async isAuthorizedTicketSender(
    ticket: { id: number; raisedById: number; assignedToId: number | null },
    employee: { id: number } | null,
    user: { id: number } | null,
  ): Promise<boolean> {
    if (employee && employee.id === ticket.raisedById) return true;
    if (user && ticket.assignedToId != null && user.id === ticket.assignedToId) return true;
    if (employee) {
      const watcher = await this.prisma.ticketWatcher.findUnique({
        where: { ticketId_employeeId: { ticketId: ticket.id, employeeId: employee.id } },
      });
      if (watcher) return true;
    }
    return false;
  }

  private async storeInbound(ticketId: number, parsed: ParsedEmail, actor: AuthUser) {
    await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        direction: 'inbound',
        messageId: parsed.messageId,
        inReplyTo: parsed.inReplyTo ?? null,
        references: parsed.references.join(' ') || null,
        fromAddress: parsed.fromAddress,
        toAddress: parsed.to,
        subject: parsed.subject,
      },
    });
    for (const att of parsed.attachments) {
      try {
        await this.tickets.addAttachment(
          ticketId,
          {
            originalname: att.filename,
            mimetype: att.mimeType,
            size: att.data.length,
            buffer: att.data,
          },
          actor,
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Skipped inbound attachment ${att.filename}: ${message}`);
      }
    }
  }

  private async systemActor(): Promise<AuthUser> {
    const u = await this.prisma.user.findFirst({
      where: { role: { name: RoleName.SUPER_ADMIN }, isActive: true },
      include: { role: true },
    });
    if (!u) {
      throw new Error('No Super Admin user exists to attribute email-in tickets');
    }
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role.name,
      employeeId: u.employeeId,
      tenantId: u.tenantId,
    };
  }

  private async notifyAdminsUnmatched(from: string, message: string) {
    const admins = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] } } },
      select: { id: true },
    });
    if (admins.length === 0) return;
    await this.prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: 'support_ticket',
        title: 'Unrecognized email-in sender',
        message,
      })),
    });
    this.logger.warn(message);
    void from;
    void this.mailer;
  }

  private isRateLimited(from: string): boolean {
    const now = Date.now();
    const prev = (this.recentFrom.get(from) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    prev.push(now);
    this.recentFrom.set(from, prev);
    return prev.length > RATE_MAX;
  }

  private async touchState(patch: { lastMessageCount?: number; lastError?: string | null }) {
    const tenantId = requireTenantId();
    await this.prisma.emailIngestState.upsert({
      where: { tenantId },
      create: {
        tenantId,
        lastCheckedAt: new Date(),
        lastMessageCount: patch.lastMessageCount ?? 0,
        lastError: patch.lastError ?? null,
      },
      update: {
        lastCheckedAt: new Date(),
        ...(patch.lastMessageCount !== undefined ? { lastMessageCount: patch.lastMessageCount } : {}),
        lastError: patch.lastError ?? null,
      },
    });
  }

  private async inferTenantId(fromAddress: string, toAddresses: string[]): Promise<number | null> {
    if (typeof this.prisma.tenant?.findFirst !== 'function') return null;
    try {
      const mailboxes = toAddresses.map((a) => a.trim().toLowerCase()).filter(Boolean);
      for (const addr of mailboxes) {
        const byMailbox = await this.prisma.tenant.findFirst({
          where: {
            OR: [
              { helpdeskMailbox: { equals: addr, mode: 'insensitive' } },
              { mailFromAddress: { equals: addr, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        if (byMailbox) return byMailbox.id;
      }
      const emp = await this.prisma.employee.findFirst({
        where: { email: { equals: fromAddress, mode: 'insensitive' } },
        select: { tenantId: true },
      });
      return emp?.tenantId ?? null;
    } catch {
      return null;
    }
  }
}

function extractAddr(from?: string): string {
  if (!from) return '';
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}
