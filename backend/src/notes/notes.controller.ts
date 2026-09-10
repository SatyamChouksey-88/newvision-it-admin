import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateNoteDto } from '../tickets/dto';
import { NotesService } from './notes.service';

@ApiTags('notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notes.list(entityType, entityId, user);
  }

  @Post()
  create(@Body() dto: CreateNoteDto, @CurrentUser() user: AuthUser) {
    return this.notes.create(dto, user);
  }
}
