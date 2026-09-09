import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateMaintenanceDto, TransitionMaintenanceDto, UpdateMaintenanceDto } from './dto';
import { MaintenanceListQuery, MaintenanceService } from './maintenance.service';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  // Viewing / managing the repair queue is for IT roles (maintenance:read).
  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Get()
  list(@Query() query: MaintenanceListQuery) {
    return this.maintenance.list(query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.maintenance.get(id);
  }

  // Reporting an issue is open to everyone with issue:report (Employees included);
  // the service enforces that Employees may only report on their own assigned asset.
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.IT_ADMIN,
    RoleName.IT_SUPPORT,
    RoleName.MANAGER,
    RoleName.EMPLOYEE,
  )
  @Post()
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: AuthUser) {
    return this.maintenance.create(dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.maintenance.update(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Patch(':id/transition')
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionMaintenanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.maintenance.transition(id, dto, user);
  }
}
