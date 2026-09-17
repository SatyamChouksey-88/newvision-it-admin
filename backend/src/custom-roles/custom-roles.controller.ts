import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCustomRoleDto, UpdateCustomRoleDto } from './dto';
import { CustomRolesService } from './custom-roles.service';

@ApiTags('custom-roles')
@Controller('custom-roles')
@Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
export class CustomRolesController {
  constructor(private readonly roles: CustomRolesService) {}

  @Get('permission-catalog')
  catalog() {
    return { permissions: this.roles.listPermissionCatalog() };
  }

  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.roles.list(actor);
  }

  @Post()
  create(@Body() dto: CreateCustomRoleDto, @CurrentUser() actor: AuthUser) {
    return this.roles.create(dto, actor);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomRoleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.roles.update(id, dto, actor);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.roles.remove(id, actor);
  }
}
