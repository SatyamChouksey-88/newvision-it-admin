import { Body, Controller, Get, Header, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { AuditCyclesService } from './audit-cycles.service';
import { CreateAuditCycleDto, CreateAuditFindingDto, UpdateAuditCycleDto } from './dto';

@ApiTags('audit-cycles')
@Controller('audit-cycles')
@Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
export class AuditCyclesController {
  constructor(private readonly cycles: AuditCyclesService) {}

  @Get()
  list(@Query() query: ListQuery) {
    return this.cycles.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.cycles.get(id);
  }

  @Get(':id/export')
  @Header('Content-Type', 'text/csv')
  async export(@Param('id', ParseIntPipe) id: number) {
    const { filename, body } = await this.cycles.exportCsv(id);
    return { filename, csv: body };
  }

  @Post()
  create(@Body() dto: CreateAuditCycleDto, @CurrentUser() user: AuthUser) {
    return this.cycles.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuditCycleDto) {
    return this.cycles.update(id, dto);
  }

  @Post(':id/start')
  start(@Param('id', ParseIntPipe) id: number) {
    return this.cycles.start(id);
  }

  @Post(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.cycles.close(id, user);
  }

  @Post(':id/findings')
  addFinding(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateAuditFindingDto) {
    return this.cycles.addFinding(id, dto);
  }

  @Post(':id/findings/:findingId/resolve')
  resolveFinding(
    @Param('id', ParseIntPipe) id: number,
    @Param('findingId', ParseIntPipe) findingId: number,
  ) {
    return this.cycles.resolveFinding(id, findingId);
  }
}
