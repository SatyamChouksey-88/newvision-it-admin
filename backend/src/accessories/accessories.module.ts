import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AccessoriesController } from './accessories.controller';
import { AccessoriesService } from './accessories.service';

@Module({
  imports: [AuditModule],
  controllers: [AccessoriesController],
  providers: [AccessoriesService],
  exports: [AccessoriesService],
})
export class AccessoriesModule {}
