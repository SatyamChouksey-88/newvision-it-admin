import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { CreateWebhookDto, UpdateWebhookDto } from './dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Get()
  list(@Query() query: ListQuery) {
    return this.webhooks.list(query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.webhooks.get(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  create(@Body() dto: CreateWebhookDto, @CurrentUser() user: AuthUser) {
    return this.webhooks.create(dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWebhookDto) {
    return this.webhooks.update(id, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.webhooks.remove(id);
  }
}
