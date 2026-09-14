import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { forEachTenant } from '../tenancy/context';
import { TicketsService } from './tickets.service';

@Injectable()
export class TicketDigestService {
  private readonly logger = new Logger(TicketDigestService.name);

  constructor(
    private readonly tickets: TicketsService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'ticket-daily-digest' })
  async scheduled(): Promise<void> {
    await forEachTenant(this.prisma, async () => {
      const result = await this.tickets.sendDailyDigests();
      const overdue = await this.tickets.sendOverdueRequesterMails();
      this.logger.log(
        `Ticket digest sent to ${result.sent} staff; overdue mail to ${overdue.sent} requester(s).`,
      );
    });
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'ticket-overdue-mail' })
  async scheduledOverdue(): Promise<void> {
    await forEachTenant(this.prisma, async () => {
      const result = await this.tickets.mailOverdueTickets();
      if (result.sent > 0) {
        this.logger.log(`Overdue ticket mail sent for ${result.sent} ticket(s).`);
      }
    });
  }
}
