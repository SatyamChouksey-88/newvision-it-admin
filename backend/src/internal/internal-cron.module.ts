import { Module } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module';
import { InternalCronController } from './internal-cron.controller';

@Module({
  imports: [TicketsModule],
  controllers: [InternalCronController],
})
export class InternalCronModule {}
