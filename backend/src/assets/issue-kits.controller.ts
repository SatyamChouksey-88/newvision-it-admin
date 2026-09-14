import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateIssueKitDto, IssueKitToEmployeeDto, UpdateIssueKitDto } from './dto';
import { IssueKitsService } from './issue-kits.service';

const ADMIN = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] as const;

@ApiTags('issue-kits')
@Controller('issue-kits')
export class IssueKitsController {
  constructor(private readonly kits: IssueKitsService) {}

  @Roles(...ADMIN)
  @Get()
  list() {
    return this.kits.list();
  }

  @Roles(...ADMIN)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.kits.get(id);
  }

  @Roles(...ADMIN)
  @Post()
  create(@Body() dto: CreateIssueKitDto, @CurrentUser() user: AuthUser) {
    return this.kits.create(dto, user);
  }

  @Roles(...ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueKitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.kits.update(id, dto, user);
  }

  @Roles(...ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.kits.remove(id, user);
  }

  @Roles(...ADMIN)
  @Post(':id/issue')
  issue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IssueKitToEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.kits.issue(id, dto, user);
  }
}
