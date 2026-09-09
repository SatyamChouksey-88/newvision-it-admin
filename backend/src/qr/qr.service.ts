import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { scanPageUrl } from '../common/scan-url';

@Injectable()
export class QrService {
  /** PNG sticker that opens the public scan page for this asset code. */
  async pngForCode(assetCode: string): Promise<Buffer> {
    const url = scanPageUrl(assetCode);
    return QRCode.toBuffer(url, { type: 'png', width: 320, margin: 1, errorCorrectionLevel: 'M' });
  }
}
