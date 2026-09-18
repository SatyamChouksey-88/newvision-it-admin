import { Injectable, Logger } from '@nestjs/common';
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

  /** Daily 08:00 — staff digests + overdue requester nudges (original combined daily job). */
  async runDailyDigestCycle(): Promise<{
    digestSent: number;
    overdueRequesterSent: number;
  }> {
    let digestSent = 0;
    let overdueRequesterSent = 0;
    await forEachTenant(this.prisma, async () => {
      const result = await this.tickets.sendDailyDigests();
      const overdue = await this.tickets.sendOverdueRequesterMails();
      digestSent += result.sent;
      overdueRequesterSent += overdue.sent;
    });
    this.logger.log(
      `Ticket daily digest: ${digestSent} staff digest(s); ${overdueRequesterSent} overdue requester mail(s).`,
    );
    return { digestSent, overdueRequesterSent };
  }

  /** Hourly — mail IT about overdue tickets. */
  async runOverdueTicketMailCycle(): Promise<{ sent: number }> {
    let sent = 0;
    await forEachTenant(this.prisma, async () => {
      const result = await this.tickets.mailOverdueTickets();
      sent += result.sent;
    });
    if (sent > 0) {
      this.logger.log(`Overdue ticket mail sent for ${sent} ticket(s).`);
    }
    return { sent };
  }
}
