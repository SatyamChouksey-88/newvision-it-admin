import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
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
import { ApprovalDto, CreateRequisitionDto, ReasonDto, UpdateRequisitionDto } from './dto';
import { RequisitionsService } from './requisitions.service';

type Uploaded = { originalname: string; mimetype: string; size: number; buffer: Buffer };

const STAFF = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.MANAGER] as const;

@ApiTags('purchase-requisitions')
@Controller('purchase-requisitions')
export class RequisitionsController {
  constructor(
    private readonly requisitions: RequisitionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(...STAFF)
  @Get()
  list(@Query() query: ListQuery & { status?: string }, @CurrentUser() user: AuthUser) {
    return this.requisitions.list(query, user);
  }

  @Roles(...STAFF)
  @Get(':id/history')
  history(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.requisitions.history(id, user);
  }

  @Roles(...STAFF)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.requisitions.get(id, user);
  }

  @Roles(...STAFF)
  @Post()
  create(@Body() dto: CreateRequisitionDto, @CurrentUser() user: AuthUser) {
    return this.requisitions.create(dto, user);
  }

  @Roles(...STAFF)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequisitionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requisitions.update(id, dto, user);
  }

  @Roles(...STAFF)
  @HttpCode(200)
  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.requisitions.submit(id, user);
  }

  @Roles(...STAFF)
  @HttpCode(200)
  @Post(':id/decide')
  decide(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requisitions.decide(id, dto, user);
  }

  @Roles(...STAFF)
  @HttpCode(200)
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requisitions.withdraw(id, dto, user);
  }

  @Roles(...STAFF)
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  async attach(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Uploaded,
    @CurrentUser() user: AuthUser,
  ) {
    await this.requisitions.get(id, user);
    return this.prisma.procurementAttachment.create({
      data: {
        recordType: 'requisition',
        recordId: id,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        data: new Uint8Array(file.buffer),
        uploadedById: user.id,
      },
      select: { id: true, filename: true, mimeType: true, sizeBytes: true, createdAt: true },
    });
  }
}
