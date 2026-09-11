import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, ScorecardDto, UpdateVendorDto, VendorStatusDto } from './dto';
import { VendorsService } from './vendors.service';

type Uploaded = { originalname: string; mimetype: string; size: number; buffer: Buffer };

const ADMIN = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] as const;

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly vendors: VendorsService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(...ADMIN, RoleName.MANAGER)
  @Get()
  list(
    @Query() query: ListQuery & { status?: string; category?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.vendors.list(query, user);
  }

  @Roles(...ADMIN, RoleName.MANAGER)
  @Get(':id/history')
  history(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.vendors.history(id, user);
  }

  @Roles(...ADMIN)
  @Get(':id/kpis')
  kpis(@Param('id', ParseIntPipe) id: number) {
    return this.vendors.computedKpis(id);
  }

  @Roles(...ADMIN, RoleName.MANAGER)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.vendors.get(id, user);
  }

  @Roles(...ADMIN)
  @Post()
  create(@Body() dto: CreateVendorDto, @CurrentUser() user: AuthUser) {
    return this.vendors.create(dto, user);
  }

  @Roles(...ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vendors.update(id, dto, user);
  }

  @Roles(...ADMIN)
  @Patch(':id/status')
  status(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VendorStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vendors.changeStatus(id, dto, user);
  }

  @Roles(...ADMIN)
  @HttpCode(200)
  @Post(':id/approve-bank')
  approveBank(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.vendors.approveBank(id, user);
  }

  @Roles(...ADMIN)
  @Post(':id/scorecards')
  scorecard(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScorecardDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.vendors.addScorecard(id, dto, user);
  }

  @Roles(...ADMIN)
  @Post(':id/compliance')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  async compliance(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; expiresAt?: string },
    @UploadedFile() file: Uploaded | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    await this.vendors.get(id, user);
    return this.prisma.vendorComplianceDoc.create({
      data: {
        vendorId: id,
        title: (body.title ?? file?.originalname ?? 'Compliance document').toString(),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        filename: file?.originalname,
        mimeType: file?.mimetype,
        data: file ? new Uint8Array(file.buffer) : undefined,
      },
      select: { id: true, title: true, expiresAt: true, filename: true },
    });
  }
}
