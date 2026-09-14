import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { scanPageUrl } from '../common/scan-url';
import { PrismaService } from '../prisma/prisma.service';
import { resolveTenantId, runUnscoped } from '../tenancy/context';

@Injectable()
export class QrService {
  constructor(private readonly prisma: PrismaService) {}

  /** PNG sticker that opens the public scan page for this asset code. */
  async pngForCode(assetCode: string, tenantSlug?: string): Promise<Buffer> {
    const slug = tenantSlug ?? (await this.currentSlug());
    const url = scanPageUrl(assetCode, undefined, slug);
    return QRCode.toBuffer(url, { type: 'png', width: 320, margin: 1, errorCorrectionLevel: 'M' });
  }

  private async currentSlug(): Promise<string | undefined> {
    const id = resolveTenantId();
    if (!id) return undefined;
    const tenant = await runUnscoped(() =>
      this.prisma.tenant.findUnique({ where: { id }, select: { slug: true } }),
    );
    return tenant?.slug;
  }
}
