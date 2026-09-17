import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditCycleReminderService } from './audit-cycle-reminder.service';
import { AuditCyclesController } from './audit-cycles.controller';
import { AuditCyclesService } from './audit-cycles.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AuditCyclesController],
  providers: [AuditCyclesService, AuditCycleReminderService],
  exports: [AuditCyclesService],
})
export class AuditCyclesModule {}
