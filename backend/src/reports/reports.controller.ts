import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportFormat, ReportsService, ReportType } from './reports.service';

const VALID_TYPES: ReportType[] = ['assets', 'employees', 'locations', 'warranty', 'supplies'];

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Any role with report:run may generate reports.
  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT, RoleName.MANAGER)
  @Get(':type')
  async report(
    @Param('type') type: string,
    @Res() res: Response,
    @Query('format') format = 'csv',
  ) {
    if (!VALID_TYPES.includes(type as ReportType)) {
      throw new BadRequestException(`Unknown report type "${type}". Valid: ${VALID_TYPES.join(', ')}`);
    }
    const fmt: ReportFormat = format === 'pdf' ? 'pdf' : 'csv';
    const { buffer, filename } = await this.reports.render(type as ReportType, fmt);
    res.setHeader('Content-Type', fmt === 'pdf' ? 'application/pdf' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
