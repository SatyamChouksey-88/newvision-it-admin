import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateIssueKitDto, IssueKitToEmployeeDto, UpdateIssueKitDto } from './dto';
import { IssueKitsService } from './issue-kits.service';

@ApiTags('issue-kits')
@Controller('issue-kits')
export class IssueKitsController {
  constructor(private readonly kits: IssueKitsService) {}

  @Get()
  list() {
    return this.kits.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.kits.get(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  create(@Body() dto: CreateIssueKitDto, @CurrentUser() user: AuthUser) {
    return this.kits.create(dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueKitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.kits.update(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.kits.remove(id, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/issue')
  issue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IssueKitToEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.kits.issue(id, dto, user);
  }
}
