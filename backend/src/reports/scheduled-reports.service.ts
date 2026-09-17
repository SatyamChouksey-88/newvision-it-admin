import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RoleName } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { MailerService } from '../notifications/mailer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { runUnscoped, runWithTenant } from '../tenancy/context';
import { ReportType, ReportsService } from './reports.service';

const WEEKLY_TYPES: ReportType[] = ['assets', 'warranty', 'supplies'];

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly mailer: MailerService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Monday 08:00 — estate summary reports for IT admins (in-app + email). */
  @Cron('0 8 * * 1', { name: 'scheduled-weekly-reports' })
  async runWeekly(): Promise<void> {
    const tenants = await runUnscoped(() =>
      this.prisma.tenant.findMany({
        where: { status: { in: ['active', 'trial'] } },
        select: { id: true, name: true },
      }),
    );
    for (const tenant of tenants) {
      await runWithTenant(tenant.id, () => this.runWeeklyForTenant(tenant.name));
    }
  }

  async runWeeklyForTenant(tenantName: string): Promise<void> {
    const actor = await this.resolveItActor();
    if (!actor) {
      this.logger.warn('Scheduled reports skipped — no active IT Admin user in tenant');
      return;
    }
    const summaries: string[] = [];
    for (const type of WEEKLY_TYPES) {
      try {
        const data = await this.reports.build(type, actor);
        summaries.push(`${data.title}: ${data.rows.length} row(s)`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        summaries.push(`${type}: skipped (${msg})`);
      }
    }
    const body =
      `Weekly NewVision reports for ${tenantName}\n\n` +
      summaries.map((s) => `• ${s}`).join('\n') +
      '\n\nOpen Reports in the app to export CSV/PDF.';
    const recipients = await this.notifications.itRecipients();
    if (recipients.length) {
      await this.mailer.send({
        to: recipients,
        subject: `NewVision weekly report summary — ${tenantName}`,
        text: body,
      });
    }
    const userIds = await this.notifications.itAlertUserIds();
    await this.notifications.fanOut(userIds, {
      type: 'general',
      title: 'Weekly report summary ready',
      message: summaries.join('; '),
      link: '/reports',
    });
    this.logger.log(`Weekly scheduled reports tenant ${actor.tenantId}: ${summaries.join(' | ')}`);
  }

  private async resolveItActor(): Promise<AuthUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] } },
      },
      include: { role: true, employee: true },
    });
    if (!user?.role) return null;
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      tenantId: user.tenantId,
      employeeId: user.employeeId,
      customRoleId: user.customRoleId,
    };
  }
}
