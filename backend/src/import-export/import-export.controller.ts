import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ImportExportService } from './import-export.service';

type UploadedCsv = { originalname: string; buffer: Buffer };

@ApiTags('import-export')
@Controller()
export class ImportExportController {
  constructor(private readonly svc: ImportExportService) {}

  // ---- export (available to IT roles) ----

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Get('export/assets')
  async exportAssets(
    @Res() res: Response,
    @Query('format') format = 'csv',
    @Query('status') status?: string,
    @Query('locationId') locationId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('q') q?: string,
  ) {
    const fmt = format === 'xlsx' ? 'xlsx' : 'csv';
    const { buffer, rowCount, filename } = await this.svc.exportAssets(fmt, {
      status,
      locationId: locationId ? Number(locationId) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      q,
    });
    if (rowCount === 0) {
      throw new BadRequestException('No rows match the current filters — adjust filters and try again');
    }
    res.setHeader('X-Row-Count', String(rowCount));
    this.send(res, buffer, filename, fmt);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Get('export/employees')
  async exportEmployees(@Res() res: Response, @Query('format') format = 'csv') {
    const fmt = format === 'xlsx' ? 'xlsx' : 'csv';
    const buf = await this.svc.exportEmployees(fmt);
    this.send(res, buf, `employees.${fmt}`, fmt);
  }

  // ---- import (IT Admin / Super Admin) ----

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('import/assets')
  @UseInterceptors(FileInterceptor('file'))
  importAssets(@UploadedFile() file: UploadedCsv, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('No file uploaded (field name must be "file")');
    return this.svc.importAssets(file.buffer, file.originalname, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('import/employees')
  @UseInterceptors(FileInterceptor('file'))
  importEmployees(@UploadedFile() file: UploadedCsv, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('No file uploaded (field name must be "file")');
    return this.svc.importEmployees(file.buffer, file.originalname, user);
  }

  private send(res: Response, buf: Buffer, filename: string, fmt: 'csv' | 'xlsx') {
    const contentType =
      fmt === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }
}
