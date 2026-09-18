import { Controller, Headers, Logger, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditCycleReminderService } from '../audit-cycles/audit-cycle-reminder.service';
import { WarrantyAlertService } from '../notifications/warranty-alert.service';
import { ContractsService } from '../procurement/contracts.service';
import { ScheduledReportsService } from '../reports/scheduled-reports.service';
import { EmailInboxService } from '../tickets/email-inbox.service';
import { TicketSlaEscalationService } from '../tickets/ticket-sla-escalation.service';
import { TicketDigestService } from '../tickets/tickets.digest';
import { assertCronSecret } from './cron-auth';
import { runCronJob } from './cron-run';

@ApiTags('internal')
@Controller('internal/cron')
export class InternalCronController {
  private readonly logger = new Logger(InternalCronController.name);

  constructor(
    private readonly inbox: EmailInboxService,
    private readonly warranty: WarrantyAlertService,
    private readonly ticketDigest: TicketDigestService,
    private readonly ticketSla: TicketSlaEscalationService,
    private readonly contracts: ContractsService,
    private readonly audit: AuditService,
    private readonly auditCycles: AuditCycleReminderService,
    private readonly scheduledReports: ScheduledReportsService,
  ) {}

  @Public()
  @Post('poll-email-tickets')
  pollEmailTickets(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'poll-email-tickets', () => this.inbox.runEmailPollCycle());
  }

  @Public()
  @Post('warranty-alerts')
  warrantyAlerts(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'warranty-alerts', () => this.warranty.runThresholdAlertsAllTenants());
  }

  @Public()
  @Post('warranty-weekly-digest')
  warrantyWeeklyDigest(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'warranty-weekly-digest', () =>
      this.warranty.runWeeklyDigestAllTenants(),
    );
  }

  @Public()
  @Post('ticket-daily-digest')
  ticketDailyDigest(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'ticket-daily-digest', () => this.ticketDigest.runDailyDigestCycle());
  }

  @Public()
  @Post('ticket-overdue-mail')
  ticketOverdueMail(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'ticket-overdue-mail', () =>
      this.ticketDigest.runOverdueTicketMailCycle(),
    );
  }

  @Public()
  @Post('ticket-sla-escalation')
  ticketSlaEscalation(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'ticket-sla-escalation', () => this.ticketSla.runEscalationCycle());
  }

  @Public()
  @Post('contract-renewals')
  contractRenewals(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'contract-renewals', () => this.contracts.runRenewalCheckAllTenants());
  }

  @Public()
  @Post('audit-prune')
  auditPrune(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'audit-prune', () => this.audit.runPruneAuthEvents());
  }

  @Public()
  @Post('audit-cycle-reminders')
  auditCycleReminders(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'audit-cycle-reminders', () =>
      this.auditCycles.runRemindersAllTenants(),
    );
  }

  @Public()
  @Post('scheduled-weekly-reports')
  scheduledWeeklyReports(@Headers('x-cron-secret') secret?: string) {
    assertCronSecret(secret);
    return runCronJob(this.logger, 'scheduled-weekly-reports', () =>
      this.scheduledReports.runWeeklyAllTenants(),
    );
  }
}
