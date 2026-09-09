import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssetRequestsController } from './asset-requests.controller';
import { AssetRequestsService } from './asset-requests.service';

@Module({
  imports: [AuditModule],
  controllers: [AssetRequestsController],
  providers: [AssetRequestsService],
  exports: [AssetRequestsService],
})
export class AssetRequestsModule {}
