import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeedbackController } from './feedback.controller';

@Module({
  imports: [AuditModule],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
