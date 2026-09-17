import { Injectable, Logger } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const STAFF: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT];

/** Post a short triage line to #helpdesk when a new ticket is opened (staff-only channel). */
@Injectable()
export class TicketChatNotifyService {
  private readonly logger = new Logger(TicketChatNotifyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notifyNewTicket(ticketNumber: string, subject: string, priority: string) {
    try {
      const channel = await this.prisma.chatChannel.findFirst({
        where: { name: '#helpdesk' },
        select: { id: true },
      });
      if (!channel) return;
      const author = await this.prisma.user.findFirst({
        where: { isActive: true, role: { name: { in: STAFF } } },
        orderBy: { id: 'asc' },
        select: { id: true },
      });
      if (!author) return;
      const body = `New ticket **${ticketNumber}** (${priority}): ${subject}`;
      await this.prisma.chatMessage.create({
        data: { channelId: channel.id, authorId: author.id, body },
      });
    } catch (e) {
      this.logger.warn(`Helpdesk chat notify failed: ${(e as Error).message}`);
    }
  }
}
