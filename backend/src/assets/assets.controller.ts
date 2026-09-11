import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AssetListQuery, AssetsService } from './assets.service';
import {
  AssignAssetDto,
  AuditAssetDto,
  BulkAssetsDto,
  ChangeStatusDto,
  CreateAssetDto,
  RetireAssetDto,
  TransferAssetDto,
  UpdateAssetDto,
} from './dto';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  list(@Query() query: AssetListQuery, @CurrentUser() user: AuthUser) {
    return this.assets.list(query, user);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.assets.get(id, user);
  }

  @Get(':id/qr')
  async qrPng(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const png = await this.assets.qrPng(id, user);
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('labels')
  async labels(
    @Body() body: { ids?: number[] },
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const pdf = await this.assets.labelsPdf(body?.ids, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="asset-labels.pdf"');
    res.send(pdf);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthUser) {
    return this.assets.create(dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/duplicate')
  duplicate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.assets.duplicate(id, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('bulk')
  bulk(@Body() dto: BulkAssetsDto, @CurrentUser() user: AuthUser) {
    return this.assets.bulk(dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.update(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.assign(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/audit')
  audit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AuditAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.stampAudit(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/transfer')
  transfer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.transfer(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/retire')
  retire(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RetireAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.retire(id, dto.reason, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.changeStatus(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.assets.remove(id, user);
  }
}
