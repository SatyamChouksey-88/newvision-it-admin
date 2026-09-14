import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailInboxController } from './email-inbox.controller';
import { EmailInboxService } from './email-inbox.service';
import { TicketDigestService } from './tickets.digest';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [NotificationsModule, AuthModule],
  controllers: [TicketsController, EmailInboxController],
  providers: [TicketsService, TicketDigestService, EmailInboxService],
  exports: [TicketsService, EmailInboxService],
})
export class TicketsModule {}
