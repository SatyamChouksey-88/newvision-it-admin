import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ImportKind, RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { CommitImportDto, PreviewImportDto } from './dto';
import { ImportJobsService } from './import-jobs.service';

type Uploaded = { originalname: string; buffer: Buffer };

@ApiTags('import-jobs')
@Controller('import-jobs')
export class ImportJobsController {
  constructor(private readonly jobs: ImportJobsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Get()
  list(@Query() query: ListQuery) {
    return this.jobs.list(query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.get(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @UploadedFile() file: Uploaded,
    @Query('kind') kindRaw: string,
    @CurrentUser() user: AuthUser,
  ) {
    const kind: ImportKind = kindRaw === 'employees' ? 'employees' : 'assets';
    if (!file) throw new BadRequestException('No file uploaded (field name must be "file")');
    return this.jobs.create(file, kind, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/preview')
  preview(@Param('id', ParseIntPipe) id: number, @Body() dto: PreviewImportDto) {
    return this.jobs.preview(id, dto.mapping);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/commit')
  commit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommitImportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.jobs.commit(id, user, dto.mapping);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/rollback')
  rollback(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.jobs.rollback(id, user);
  }
}
