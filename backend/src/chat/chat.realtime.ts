import { Injectable, Logger } from '@nestjs/common';
import { getPusherServer } from '../common/pusher-server';
import { PrismaService } from '../prisma/prisma.service';
import {
  messageChannelFor,
  presenceChannelName,
  staffPresenceChannelName,
  userNotifyChannelName,
} from './pusher-channels';

/** Fan-out to Pusher Channels so ChatService never imports the gateway. */
@Injectable()
export class ChatRealtimeService {
  private readonly log = new Logger(ChatRealtimeService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async trigger(channel: string, event: string, data: unknown) {
    const pusher = getPusherServer();
    if (!pusher) return;
    try {
      await pusher.trigger(channel, event, data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.warn(`Pusher trigger failed (${channel} / ${event}): ${msg}`);
    }
  }

  private async messageChannelForId(channelId: number): Promise<string | null> {
    const channel = await this.prisma.chatChannel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        type: true,
        visibility: true,
        members: { select: { userId: true } },
      },
    });
    if (!channel) return null;
    const memberIds = channel.members.map((m) => m.userId);
    return messageChannelFor(channel, memberIds).message;
  }

  async toChannel(channelId: number, event: string, data: unknown) {
    const name = await this.messageChannelForId(channelId);
    if (!name) return;
    await this.trigger(name, event, data);
  }

  async toUser(userId: number, event: string, data: unknown) {
    await this.trigger(userNotifyChannelName(userId), event, data);
  }

  async toStaff(event: string, data: unknown) {
    await this.trigger(staffPresenceChannelName(), event, data);
  }

  async toChannelPresence(channelId: number, event: string, data: unknown) {
    await this.trigger(presenceChannelName(channelId), event, data);
  }
}
