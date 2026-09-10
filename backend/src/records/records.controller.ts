import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BackfillAssignmentDto, BackfillMaintenanceDto, ManualEditDto } from '../tickets/dto';
import { RecordsService } from './records.service';

@ApiTags('records')
@Controller('records')
@Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Post(':entityType/:id/manual')
  manual(
    @Param('entityType') entityType: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManualEditDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.records.apply(entityType, id, dto, user);
  }

  @Post('Asset/:id/backfill-assignment')
  backfillAssignment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BackfillAssignmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.records.backfillAssignment(id, dto, user);
  }

  @Post('maintenance/backfill')
  backfillMaintenance(@Body() dto: BackfillMaintenanceDto, @CurrentUser() user: AuthUser) {
    return this.records.backfillMaintenance(dto, user);
  }
}
