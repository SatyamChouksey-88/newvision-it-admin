import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsInt, IsString, MinLength } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ChatService } from './chat.service';

class PostMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

class OpenDmDto {
  @IsInt()
  userId!: number;
}

const STAFF = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT] as const;

@ApiTags('chat')
@Controller('chat')
@Roles(...STAFF)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('staff')
  staff(@CurrentUser() actor: AuthUser) {
    return this.chat.staffDirectory(actor);
  }

  @Get('unread')
  unread(@CurrentUser() actor: AuthUser) {
    return this.chat.unreadTotal(actor);
  }

  @Get('channels')
  channels(@CurrentUser() actor: AuthUser) {
    return this.chat.listChannels(actor);
  }

  @Post('dm')
  dm(@Body() dto: OpenDmDto, @CurrentUser() actor: AuthUser) {
    return this.chat.openDm(actor, dto.userId);
  }

  @Get('channels/:id/messages')
  messages(
    @Param('id', ParseIntPipe) id: number,
    @Query('after') after: string | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.messages(actor, id, after ? Number(after) : undefined);
  }

  @Post('channels/:id/messages')
  post(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostMessageDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.post(actor, id, dto.body);
  }

  @Post('channels/:id/read')
  read(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.chat.markRead(actor, id);
  }
}
