import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { CreateSavedViewDto, UpdateSavedViewDto } from './dto';
import { SavedViewsService } from './saved-views.service';

const ANY_STAFF = [
  RoleName.SUPER_ADMIN,
  RoleName.IT_ADMIN,
  RoleName.IT_SUPPORT,
  RoleName.MANAGER,
  RoleName.EMPLOYEE,
] as const;

@ApiTags('saved-views')
@Controller('saved-views')
export class SavedViewsController {
  constructor(private readonly views: SavedViewsService) {}

  @Roles(...ANY_STAFF)
  @Get()
  list(@Query() query: ListQuery & { resource?: string }, @CurrentUser() user: AuthUser) {
    return this.views.list(query, user);
  }

  @Roles(...ANY_STAFF)
  @Post()
  create(@Body() dto: CreateSavedViewDto, @CurrentUser() user: AuthUser) {
    return this.views.create(dto, user);
  }

  @Roles(...ANY_STAFF)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSavedViewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.views.update(id, dto, user);
  }

  @Roles(...ANY_STAFF)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.views.remove(id, user);
  }
}
