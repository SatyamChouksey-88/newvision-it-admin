import { Module } from '@nestjs/common';
import { AccessoriesModule } from '../accessories/accessories.module';
import { QrModule } from '../qr/qr.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [QrModule, WebhooksModule, AccessoriesModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
