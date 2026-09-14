import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssetsModule } from '../assets/assets.module';
import { AssetRequestsController } from './asset-requests.controller';
import { AssetRequestsService } from './asset-requests.service';

@Module({
  imports: [AuditModule, AssetsModule],
  controllers: [AssetRequestsController],
  providers: [AssetRequestsService],
  exports: [AssetRequestsService],
})
export class AssetRequestsModule {}
