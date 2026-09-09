import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { daysRemaining } from '../common/warranty';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';

/**
 * Unauthenticated, read-only asset card for physical audits (phone-camera QR scan).
 * Intentionally omits purchase cost, invoice, and assignment history.
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
      serialNumber: asset.serialNumber,
      status: asset.status,
      condition: asset.condition,
      location: asset.location?.name,
      locationCode: asset.location?.code,
      category: asset.category?.name,
      assignedTo: asset.assignedEmployee
        ? `${asset.assignedEmployee.firstName} ${asset.assignedEmployee.lastName}`
        : null,
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
        assignedEmployee: { select: { firstName: true, lastName: true } },
      },
    });
    if (!asset) throw new NotFoundException(`Asset ${code} not found`);
    return asset;
  }
}
