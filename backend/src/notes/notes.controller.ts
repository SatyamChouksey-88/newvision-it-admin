import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateNoteDto } from '../tickets/dto';
import { NotesService } from './notes.service';

const ANY_STAFF = [
  RoleName.SUPER_ADMIN,
  RoleName.IT_ADMIN,
  RoleName.IT_SUPPORT,
  RoleName.MANAGER,
  RoleName.EMPLOYEE,
] as const;

@ApiTags('notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Roles(...ANY_STAFF)
  @Get()
  list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notes.list(entityType, entityId, user);
  }

  @Roles(...ANY_STAFF)
  @Post()
  create(@Body() dto: CreateNoteDto, @CurrentUser() user: AuthUser) {
    return this.notes.create(dto, user);
  }
}
