import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { AssetRequestsService } from './asset-requests.service';
import { CreateAssetRequestDto, ReviewAssetRequestDto } from './dto';

@ApiTags('asset-requests')
@Controller('asset-requests')
export class AssetRequestsController {
  constructor(private readonly svc: AssetRequestsService) {}

  @Get()
  list(
    @Query() query: ListQuery & { status?: string; kind?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.list(query, user);
  }

  @Roles(RoleName.EMPLOYEE)
  @Post()
  create(@Body() dto: CreateAssetRequestDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user);
  }

  @Roles(RoleName.MANAGER, RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Patch(':id/review')
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewAssetRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.review(id, dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Patch(':id/fulfill')
  fulfill(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.svc.fulfill(id, user);
  }
}
