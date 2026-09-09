import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { ConsumablesService } from './consumables.service';
import {
  AdjustConsumableStockDto,
  CreateConsumableDto,
  IssueConsumableDto,
  UpdateConsumableDto,
} from './dto';

@ApiTags('consumables')
@Controller('consumables')
export class ConsumablesController {
  constructor(private readonly svc: ConsumablesService) {}

  @Get()
  list(@Query() query: ListQuery & { category?: string; lowStock?: string }) {
    return this.svc.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  create(@Body() dto: CreateConsumableDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConsumableDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.update(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Post(':id/issue')
  issue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IssueConsumableDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.issue(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Patch(':id/stock')
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustConsumableStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.adjustStock(id, dto, user);
  }
}
