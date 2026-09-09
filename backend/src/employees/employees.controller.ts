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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateEmployeeDto, OffboardEmployeeDto, UpdateEmployeeDto } from './dto';
import { EmployeeListQuery, EmployeesService } from './employees.service';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  list(@Query() query: EmployeeListQuery, @CurrentUser() user: AuthUser) {
    return this.employees.list(query, user);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.employees.get(id, user);
  }

  @Get(':id/profile')
  profile(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.employees.profile(id, user);
  }

  @Get(':id/history')
  history(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.employees.history(id, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/offboard')
  offboard(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OffboardEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employees.offboard(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post(':id/reinstate')
  reinstate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.employees.reinstate(id, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.employees.create(dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employees.update(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.employees.remove(id, user);
  }
}
