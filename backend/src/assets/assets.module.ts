import { Module } from '@nestjs/common';
import { AccessoriesModule } from '../accessories/accessories.module';
import { QrModule } from '../qr/qr.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { IssueKitsController } from './issue-kits.controller';
import { IssueKitsService } from './issue-kits.service';

@Module({
  imports: [QrModule, WebhooksModule, AccessoriesModule],
  controllers: [AssetsController, IssueKitsController],
  providers: [AssetsService, IssueKitsService],
  exports: [AssetsService, IssueKitsService],
})
export class AssetsModule {}
