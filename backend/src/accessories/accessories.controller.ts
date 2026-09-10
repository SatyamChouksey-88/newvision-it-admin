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
import { AccessoriesService } from './accessories.service';
import {
  AdjustStockDto,
  CheckoutAccessoryDto,
  CreateAccessoryDto,
  UpdateAccessoryDto,
} from './dto';

@ApiTags('accessories')
@Controller('accessories')
export class AccessoriesController {
  constructor(private readonly svc: AccessoriesService) {}

  @Get()
  list(@Query() query: ListQuery & { category?: string; locationId?: string }) {
    return this.svc.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  create(@Body() dto: CreateAccessoryDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccessoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.update(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Post(':id/checkout')
  checkout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckoutAccessoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.checkout(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Post(':id/checkin')
  checkin(
    @Param('id', ParseIntPipe) id: number,
    @Body('checkoutId', ParseIntPipe) checkoutId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.checkin(id, checkoutId, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Patch(':id/stock')
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.adjustStock(id, dto, user);
  }
}
