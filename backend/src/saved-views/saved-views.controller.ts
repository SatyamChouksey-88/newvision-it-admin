import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ListQuery } from '../common/query';
import { CreateSavedViewDto, UpdateSavedViewDto } from './dto';
import { SavedViewsService } from './saved-views.service';

@ApiTags('saved-views')
@Controller('saved-views')
export class SavedViewsController {
  constructor(private readonly views: SavedViewsService) {}

  @Get()
  list(@Query() query: ListQuery & { resource?: string }, @CurrentUser() user: AuthUser) {
    return this.views.list(query, user);
  }

  @Post()
  create(@Body() dto: CreateSavedViewDto, @CurrentUser() user: AuthUser) {
    return this.views.create(dto, user);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSavedViewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.views.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.views.remove(id, user);
  }
}
