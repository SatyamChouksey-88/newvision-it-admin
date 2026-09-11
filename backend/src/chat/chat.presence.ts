import { Injectable } from '@nestjs/common';
import type { ChatPresenceMode } from '@prisma/client';
import { ChatRealtimeService } from './chat.realtime';
import { derivePresence, type PresenceStatus } from './chat-presence';

@Injectable()
export class ChatPresenceService {
  private readonly sockets = new Map<number, Set<string>>();
  private readonly lastActive = new Map<number, Date>();
  private readonly modes = new Map<number, ChatPresenceMode>();

  constructor(private readonly realtime: ChatRealtimeService) {}

  connect(userId: number, socketId: string, mode: ChatPresenceMode) {
    const set = this.sockets.get(userId) ?? new Set<string>();
    set.add(socketId);
    this.sockets.set(userId, set);
    this.modes.set(userId, mode);
    this.touch(userId, false);
    this.broadcast(userId);
  }

  disconnect(userId: number, socketId: string) {
    const set = this.sockets.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) this.sockets.delete(userId);
    this.broadcast(userId);
  }

  touch(userId: number, emit = true) {
    this.lastActive.set(userId, new Date());
    if (emit) this.broadcast(userId);
  }

  setMode(userId: number, mode: ChatPresenceMode) {
    this.modes.set(userId, mode);
    this.touch(userId, false);
    this.broadcast(userId);
  }

  statusOf(
    userId: number,
    fallbackMode?: ChatPresenceMode,
    fallbackLast?: Date | null,
  ): PresenceStatus {
    const connected = (this.sockets.get(userId)?.size ?? 0) > 0;
    return derivePresence({
      connected,
      lastActiveAt: this.lastActive.get(userId) ?? fallbackLast ?? null,
      mode: this.modes.get(userId) ?? fallbackMode ?? 'auto',
    });
  }

  snapshot(
    userIds: number[],
    extras: Map<number, { mode: ChatPresenceMode; lastSeenAt: Date | null }> = new Map(),
  ): Record<number, PresenceStatus> {
    const out: Record<number, PresenceStatus> = {};
    for (const id of userIds) {
      const extra = extras.get(id);
      out[id] = this.statusOf(id, extra?.mode, extra?.lastSeenAt);
    }
    return out;
  }

  private broadcast(userId: number) {
    this.realtime.toStaff('presence', { userId, status: this.statusOf(userId) });
  }
}
