import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuditCyclesModule } from '../audit-cycles/audit-cycles.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { ReportsModule } from '../reports/reports.module';
import { TicketsModule } from '../tickets/tickets.module';
import { InternalCronController } from './internal-cron.controller';

@Module({
  imports: [
    TicketsModule,
    NotificationsModule,
    ProcurementModule,
    AuditModule,
    AuditCyclesModule,
    ReportsModule,
  ],
  controllers: [InternalCronController],
})
export class InternalCronModule {}
