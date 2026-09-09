import { Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { NotificationsService } from './notifications.service';
import { WarrantyAlertService } from './warranty-alert.service';

@ApiTags('notifications')
@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly warranty: WarrantyAlertService,
  ) {}

  @Get('notifications')
  list(@Query() query: ListQuery & { isRead?: string }, @CurrentUser() user: AuthUser) {
    return this.notifications.listForUser(query, user);
  }

  @Patch('notifications/:id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.notifications.markRead(id, user);
  }

  /** Manually trigger the warranty threshold scan (also runs daily on a schedule). */
  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('warranty/run-check')
  runWarrantyCheck() {
    return this.warranty.runCheck();
  }
}
