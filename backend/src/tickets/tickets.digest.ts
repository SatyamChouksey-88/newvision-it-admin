import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TicketsService } from './tickets.service';

@Injectable()
export class TicketDigestService {
  private readonly logger = new Logger(TicketDigestService.name);

  constructor(private readonly tickets: TicketsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'ticket-daily-digest' })
  async scheduled(): Promise<void> {
    const result = await this.tickets.sendDailyDigests();
    this.logger.log(`Ticket digest sent to ${result.sent} staff member(s).`);
  }
}
