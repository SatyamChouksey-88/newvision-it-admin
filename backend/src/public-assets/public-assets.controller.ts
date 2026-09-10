import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { daysRemaining } from '../common/warranty';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';

/**
 * Unauthenticated, read-only asset card for physical audits (phone-camera QR scan).
 * Intentionally omits purchase cost, invoice, assignment history, the assignee's name, and the
 * serial number — anyone who can see or photograph the printed sticker can hit this endpoint
 * with no login, so it must not leak who holds the device or a number useful for a fraudulent
 * warranty/insurance claim. "Assigned" vs "Available" status is enough for a physical audit.
 */
@ApiTags('public')
@Controller('public/assets')
export class PublicAssetsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrService,
  ) {}

  @Public()
  @Get(':code/qr')
  async qrPng(@Param('code') code: string, @Res() res: Response) {
    await this.requireAsset(code);
    const png = await this.qr.pngForCode(code);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(png);
  }

  @Public()
  @Get(':code')
  async show(@Param('code') code: string) {
    const asset = await this.requireAsset(code);
    return {
      assetCode: asset.assetCode,
      brand: asset.brand,
      model: asset.model,
      status: asset.status,
      condition: asset.condition,
      location: asset.location?.name,
      locationCode: asset.location?.code,
      category: asset.category?.name,
      assigned: asset.status === 'assigned',
      warrantyEnd: asset.warrantyEnd,
      warrantyDays: asset.warrantyEnd ? daysRemaining(asset.warrantyEnd) : null,
    };
  }

  private async requireAsset(code: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { assetCode: decodeURIComponent(code) },
      include: {
        location: true,
        category: true,
      },
    });
    if (!asset) throw new NotFoundException(`Asset ${code} not found`);
    return asset;
  }
}
