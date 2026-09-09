import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WarrantyAlertService } from './warranty-alert.service';

@Module({
  controllers: [NotificationsController],
  providers: [MailerService, NotificationsService, WarrantyAlertService],
  exports: [NotificationsService, WarrantyAlertService, MailerService],
})
export class NotificationsModule {}
