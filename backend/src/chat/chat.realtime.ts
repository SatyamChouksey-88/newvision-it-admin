import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

/** Thin fan-out so ChatService never imports the gateway (avoids a circular module). */
@Injectable()
export class ChatRealtimeService {
  private server?: Server;

  attach(server: Server) {
    this.server = server;
  }

  toChannel(channelId: number, event: string, data: unknown) {
    this.server?.to(`channel:${channelId}`).emit(event, data);
  }

  toUser(userId: number, event: string, data: unknown) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  toStaff(event: string, data: unknown) {
    this.server?.emit(event, data);
  }
}
