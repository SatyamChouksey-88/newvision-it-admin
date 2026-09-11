import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatPresenceMode, RoleName } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ChatPresenceService } from './chat.presence';
import { ChatRealtimeService } from './chat.realtime';

const STAFF: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT];

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly realtime: ChatRealtimeService,
    private readonly presence: ChatPresenceService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  async handleConnection(client: Socket) {
    try {
      const user = await this.userFromHandshake(client);
      if (!user) {
        client.disconnect(true);
        return;
      }
      client.data.userId = user.id;
      await client.join(`user:${user.id}`);
      const memberships = await this.prisma.chatChannelMember.findMany({
        where: { userId: user.id },
        select: { channelId: true },
      });
      await Promise.all(memberships.map((m) => client.join(`channel:${m.channelId}`)));
      this.presence.connect(user.id, client.id, user.presenceMode);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() },
      });
    } catch (err) {
      this.log.debug(`Chat socket rejected: ${err instanceof Error ? err.message : err}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as number | undefined;
    if (userId) this.presence.disconnect(userId, client.id);
  }

  @SubscribeMessage('join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { channelId?: number }) {
    const userId = client.data.userId as number | undefined;
    if (!userId || !body?.channelId) return;
    const member = await this.prisma.chatChannelMember.findUnique({
      where: { channelId_userId: { channelId: body.channelId, userId } },
    });
    if (!member) return;
    await client.join(`channel:${body.channelId}`);
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId?: number; threadId?: number },
  ) {
    const userId = client.data.userId as number | undefined;
    if (!userId || !body?.channelId) return;
    this.presence.touch(userId, false);
    client.to(`channel:${body.channelId}`).emit('typing', {
      channelId: body.channelId,
      threadId: body.threadId ?? null,
      userId,
    });
  }

  @SubscribeMessage('presence:ping')
  async ping(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId as number | undefined;
    if (!userId) return;
    this.presence.touch(userId);
    await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  }

  @SubscribeMessage('presence:set')
  async setMode(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { mode?: ChatPresenceMode },
  ) {
    const userId = client.data.userId as number | undefined;
    if (!userId || !body?.mode) return;
    if (!Object.values(ChatPresenceMode).includes(body.mode)) return;
    this.presence.setMode(userId, body.mode);
    await this.prisma.user.update({
      where: { id: userId },
      data: { presenceMode: body.mode, lastSeenAt: new Date() },
    });
  }

  private async userFromHandshake(client: Socket) {
    const raw =
      (client.handshake.auth?.token as string | undefined) ||
      (typeof client.handshake.headers.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : '');
    if (!raw) return null;
    const payload = await this.jwt.verifyAsync<{ sub: number }>(raw);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
    if (!user?.isActive || !STAFF.includes(user.role.name)) return null;
    return user;
  }
}
