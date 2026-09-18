import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailInboxController } from './email-inbox.controller';
import { EmailInboxService } from './email-inbox.service';
import { TicketChatNotifyService } from './ticket-chat-notify.service';
import { TicketSlaEscalationService } from './ticket-sla-escalation.service';
import { TicketDigestService } from './tickets.digest';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [NotificationsModule, AuthModule],
  controllers: [TicketsController, EmailInboxController],
  providers: [
    TicketsService,
    TicketDigestService,
    EmailInboxService,
    TicketChatNotifyService,
    TicketSlaEscalationService,
  ],
  exports: [
    TicketsService,
    EmailInboxService,
    TicketDigestService,
    TicketSlaEscalationService,
  ],
})
export class TicketsModule {}
