import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatChannelType, RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { getPusherServer } from '../common/pusher-server';
import { PrismaService } from '../prisma/prisma.service';
import { parsePusherChannelName } from './pusher-channels';

const STAFF: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT];

@ApiTags('pusher')
@Controller('pusher')
@Roles(...STAFF)
export class PusherAuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('auth')
  async auth(
    @CurrentUser() actor: AuthUser,
    @Body() body: { socket_id?: string; channel_name?: string },
  ) {
    const pusher = getPusherServer();
    if (!pusher) {
      throw new ServiceUnavailableException('Pusher is not configured on this server');
    }
    const socketId = body.socket_id?.trim();
    const channelName = body.channel_name?.trim();
    if (!socketId || !channelName) {
      throw new ForbiddenException('socket_id and channel_name are required');
    }

    const parsed = parsePusherChannelName(channelName);
    const userRow = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { id: true, fullName: true, email: true },
    });
    if (!userRow) throw new ForbiddenException('User not found');

    switch (parsed.kind) {
      case 'user-notify':
        if (parsed.userId !== actor.id) throw new ForbiddenException('Not your notification channel');
        return pusher.authorizeChannel(socketId, channelName);

      case 'presence-staff':
        return pusher.authorizeChannel(socketId, channelName, {
          user_id: String(actor.id),
          user_info: {
            name: userRow.fullName,
            avatar: null,
          },
        });

      case 'team':
      case 'private-team':
      case 'presence-channel': {
        const channelId = parsed.channelId;
        if (!channelId) throw new ForbiddenException('Invalid channel');
        const member = await this.prisma.chatChannelMember.findUnique({
          where: { channelId_userId: { channelId, userId: actor.id } },
        });
        if (!member) throw new ForbiddenException('Not a member of this channel');
        if (parsed.kind === 'presence-channel') {
          return pusher.authorizeChannel(socketId, channelName, {
            user_id: String(actor.id),
            user_info: {
              name: userRow.fullName,
              avatar: null,
            },
          });
        }
        return pusher.authorizeChannel(socketId, channelName);
      }

      case 'dm': {
        const ids = parsed.userIds;
        if (!ids || !ids.includes(actor.id)) {
          throw new ForbiddenException('Not a participant in this DM');
        }
        const dm = await this.prisma.chatChannel.findFirst({
          where: {
            type: ChatChannelType.dm,
            AND: [
              { members: { some: { userId: ids[0] } } },
              { members: { some: { userId: ids[1] } } },
            ],
          },
          select: { id: true },
        });
        if (!dm) throw new ForbiddenException('DM channel not found');
        return pusher.authorizeChannel(socketId, channelName);
      }

      default:
        throw new ForbiddenException('Unknown channel');
    }
  }
}
