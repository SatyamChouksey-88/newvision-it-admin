import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
