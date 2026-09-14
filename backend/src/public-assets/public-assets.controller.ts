import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { runUnscoped } from '../tenancy/context';

const assetCardInclude = { location: true, category: true, tenant: { select: { slug: true, name: true } } };

/**
 * Unauthenticated, read-only asset card for physical audits (phone-camera QR scan).
 * Tenant-scoped URLs live under /t/:slug/:code so they never collide with /:code/qr.
 */
@ApiTags('public')
@Controller('public/assets')
export class PublicAssetsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrService,
  ) {}

  @Public()
  @Get('t/:slug/:code/qr')
  async qrPngScoped(
    @Param('slug') slug: string,
    @Param('code') code: string,
    @Res() res: Response,
  ) {
    const asset = await this.requireAsset(code, slug);
    const png = await this.qr.pngForCode(asset.assetCode, slug);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(png);
  }

  @Public()
  @Get('t/:slug/:code')
  async showScoped(@Param('slug') slug: string, @Param('code') code: string) {
    return this.present(await this.requireAsset(code, slug));
  }

  @Public()
  @Get(':code/qr')
  async qrPng(@Param('code') code: string, @Res() res: Response) {
    const asset = await this.requireAsset(code);
    const png = await this.qr.pngForCode(asset.assetCode, asset.tenant.slug);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(png);
  }

  @Public()
  @Get(':code')
  async show(@Param('code') code: string) {
    return this.present(await this.requireAsset(code));
  }

  private present(asset: Awaited<ReturnType<PublicAssetsController['requireAsset']>>) {
    return {
      assetCode: asset.assetCode,
      brand: asset.brand,
      model: asset.model,
      status: asset.status,
      location: asset.location?.name,
      locationCode: asset.location?.code,
      category: asset.category?.name,
      assigned: asset.status === 'assigned',
      tenantSlug: asset.tenant.slug,
      tenantName: asset.tenant.name,
    };
  }

  private async requireAsset(code: string, slug?: string) {
    const decoded = decodeURIComponent(code);
    return runUnscoped(async () => {
      if (slug) {
        const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
        if (!tenant) throw new NotFoundException(`Asset ${code} not found`);
        const asset = await this.prisma.asset.findFirst({
          where: { assetCode: decoded, tenantId: tenant.id },
          include: assetCardInclude,
        });
        if (!asset) throw new NotFoundException(`Asset ${code} not found`);
        return asset;
      }
      const matches = await this.prisma.asset.findMany({
        where: { assetCode: decoded },
        include: assetCardInclude,
        take: 2,
      });
      if (matches.length !== 1) {
        throw new NotFoundException(`Asset ${code} not found`);
      }
      return matches[0];
    });
  }
}
