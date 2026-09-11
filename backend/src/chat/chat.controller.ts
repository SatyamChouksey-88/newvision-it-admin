import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ChatService } from './chat.service';
import {
  AddMembersDto,
  CreateChannelDto,
  EditMessageDto,
  MemberPrefsDto,
  OpenDmDto,
  OpenGroupDto,
  PatchChannelDto,
  PostMessageDto,
  PresenceDto,
  ReactionDto,
} from './dto';

type Uploaded = { originalname: string; mimetype: string; size: number; buffer: Buffer };

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

  @Get('presence')
  presence(@CurrentUser() actor: AuthUser) {
    return this.chat.presenceMap(actor);
  }

  @Post('presence')
  setPresence(@Body() dto: PresenceDto, @CurrentUser() actor: AuthUser) {
    return this.chat.heartbeat(actor, dto.mode);
  }

  @Post('presence/ping')
  ping(@CurrentUser() actor: AuthUser) {
    return this.chat.heartbeat(actor);
  }

  @Get('search')
  search(@Query('q') q: string | undefined, @CurrentUser() actor: AuthUser) {
    return this.chat.search(actor, q ?? '');
  }

  @Get('channels')
  channels(@CurrentUser() actor: AuthUser) {
    return this.chat.listChannels(actor);
  }

  @Post('channels')
  createChannel(@Body() dto: CreateChannelDto, @CurrentUser() actor: AuthUser) {
    return this.chat.createChannel(actor, dto);
  }

  @Post('dm')
  dm(@Body() dto: OpenDmDto, @CurrentUser() actor: AuthUser) {
    return this.chat.openDm(actor, dto.userId);
  }

  @Post('group')
  group(@Body() dto: OpenGroupDto, @CurrentUser() actor: AuthUser) {
    return this.chat.openGroup(actor, dto.userIds, dto.name);
  }

  @Get('channels/:id')
  channel(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.chat.getChannel(actor, id);
  }

  @Patch('channels/:id')
  patchChannel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchChannelDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.patchChannel(actor, id, dto);
  }

  @Post('channels/:id/join')
  join(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.chat.joinChannel(actor, id);
  }

  @Post('channels/:id/leave')
  leave(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.chat.leaveChannel(actor, id);
  }

  @Post('channels/:id/members')
  addMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMembersDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.addMembers(actor, id, dto.userIds);
  }

  @Delete('channels/:id/members/:userId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.removeMember(actor, id, userId);
  }

  @Patch('channels/:id/prefs')
  prefs(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MemberPrefsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.setPrefs(actor, id, dto);
  }

  @Get('channels/:id/messages')
  messages(
    @Param('id', ParseIntPipe) id: number,
    @Query('after') after: string | undefined,
    @Query('threadOf') threadOf: string | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.messages(actor, id, {
      after: after ? Number(after) : undefined,
      threadOf: threadOf ? Number(threadOf) : undefined,
    });
  }

  @Get('channels/:id/messages/:messageId/thread')
  thread(
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.thread(actor, id, messageId);
  }

  @Post('channels/:id/messages')
  @UseInterceptors(FilesInterceptor('files', 8, { limits: { fileSize: 8 * 1024 * 1024 } }))
  post(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostMessageDto,
    @UploadedFiles() files: Uploaded[] | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.post(actor, id, dto.body, dto.parentId, files);
  }

  @Post('channels/:id/read')
  read(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.chat.markRead(actor, id);
  }

  @Patch('messages/:id')
  edit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditMessageDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.editMessage(actor, id, dto.body);
  }

  @Delete('messages/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser) {
    return this.chat.deleteMessage(actor, id);
  }

  @Post('messages/:id/reactions')
  react(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.toggleReaction(actor, id, dto.emoji);
  }

  @Delete('messages/:id/reactions')
  unreact(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.toggleReaction(actor, id, dto.emoji);
  }

  @Get('attachments/:id')
  async attachment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUser,
    @Res() res: Response,
  ) {
    const row = await this.chat.getAttachment(actor, id);
    const inline = row.mimeType.startsWith('image/');
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${row.filename.replace(/"/g, '')}"`,
    );
    res.send(Buffer.from(row.data));
  }
}
