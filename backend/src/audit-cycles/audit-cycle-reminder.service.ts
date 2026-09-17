import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoleName } from '@prisma/client';
import { MailerService } from '../notifications/mailer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { runUnscoped, runWithTenant } from '../tenancy/context';

const REMINDER_AFTER_DAYS = Number(process.env.AUDIT_CYCLE_REMINDER_DAYS ?? 7);

@Injectable()
export class AuditCycleReminderService {
  private readonly logger = new Logger(AuditCycleReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'audit-cycle-reminders' })
  async remindOpenCycles(): Promise<void> {
    const tenants = await runUnscoped(() =>
      this.prisma.tenant.findMany({
        where: { status: { in: ['active', 'trial'] } },
        select: { id: true },
      }),
    );
    for (const t of tenants) {
      await runWithTenant(t.id, () => this.remindInTenant());
    }
  }

  async remindInTenant(now = new Date()): Promise<number> {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - REMINDER_AFTER_DAYS);
    const cycles = await this.prisma.auditCycle.findMany({
      where: {
        status: 'in_progress',
        startedAt: { lt: cutoff },
      },
      select: { id: true, name: true, startedAt: true },
    });
    if (!cycles.length) return 0;
    const admins = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] } },
      },
      select: { id: true, email: true },
    });
    if (!admins.length) return 0;
    let sent = 0;
    for (const cycle of cycles) {
      const days = cycle.startedAt
        ? Math.floor((now.getTime() - cycle.startedAt.getTime()) / 86400000)
        : REMINDER_AFTER_DAYS;
      const title = `Audit cycle reminder: ${cycle.name}`;
      const message = `Cycle has been in progress for ${days} day(s). Review findings and close or extend the cycle.`;
      await this.notifications.fanOut(
        admins.map((a) => a.id),
        {
          type: 'general',
          title,
          message,
          link: `/settings/audit-cycles`,
        },
      );
      await this.mailer.send({
        to: admins.map((a) => a.email),
        subject: title,
        text: `${message}\n\nOpen Settings → Audit cycles in NewVision.`,
      });
      sent += 1;
    }
    if (sent) {
      this.logger.log(`Audit cycle reminders: ${sent} cycle(s)`);
    }
    return sent;
  }
}
