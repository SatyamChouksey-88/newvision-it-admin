import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { forEachTenant } from '../tenancy/context';

@Injectable()
export class TicketSlaEscalationService {
  private readonly logger = new Logger(TicketSlaEscalationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Hourly — flag overdue tickets and notify IT admins. */
  async runEscalationCycle(): Promise<{ escalated: number }> {
    let escalated = 0;
    await forEachTenant(this.prisma, async () => {
      const now = new Date();
      const overdue = await this.prisma.supportTicket.findMany({
        where: {
          dueDate: { lt: now },
          status: { in: ['open', 'assigned', 'in_progress', 'waiting_on_employee'] },
          slaEscalatedAt: null,
        },
        select: { id: true, ticketNumber: true, subject: true },
        take: 50,
      });
      if (!overdue.length) return;
      const admins = await this.prisma.user.findMany({
        where: { isActive: true, role: { name: { in: [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] } } },
        select: { id: true },
      });
      for (const t of overdue) {
        await this.prisma.supportTicket.update({
          where: { id: t.id },
          data: { slaEscalatedAt: now },
        });
        for (const admin of admins) {
          await this.prisma.notification.create({
            data: {
              userId: admin.id,
              type: NotificationType.support_ticket,
              title: `SLA escalation: ${t.ticketNumber}`,
              message: t.subject,
              supportTicketId: t.id,
            },
          });
        }
      }
      escalated += overdue.length;
      this.logger.log(`SLA escalated ${overdue.length} ticket(s) to IT Admin(s).`);
    });
    return { escalated };
  }
}
