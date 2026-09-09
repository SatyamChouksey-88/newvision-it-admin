import { Module } from '@nestjs/common';
import { PublicAssetsController } from '../public-assets/public-assets.controller';
import { QrService } from './qr.service';

@Module({
  controllers: [PublicAssetsController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
