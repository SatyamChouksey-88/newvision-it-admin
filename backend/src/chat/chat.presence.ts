import { Injectable } from '@nestjs/common';
import type { ChatPresenceMode } from '@prisma/client';
import { ChatRealtimeService } from './chat.realtime';
import { derivePresence, type PresenceStatus } from './chat-presence';

const LIVE_WINDOW_MS = 90_000;

@Injectable()
export class ChatPresenceService {
  private readonly lastActive = new Map<number, Date>();
  private readonly modes = new Map<number, ChatPresenceMode>();

  constructor(private readonly realtime: ChatRealtimeService) {}

  touch(userId: number, emit = true) {
    this.lastActive.set(userId, new Date());
    if (emit) this.broadcast(userId);
  }

  setMode(userId: number, mode: ChatPresenceMode) {
    this.modes.set(userId, mode);
    this.touch(userId, false);
    this.broadcast(userId);
  }

  private isLive(userId: number): boolean {
    const last = this.lastActive.get(userId);
    if (!last) return false;
    return Date.now() - last.getTime() < LIVE_WINDOW_MS;
  }

  statusOf(
    userId: number,
    fallbackMode?: ChatPresenceMode,
    fallbackLast?: Date | null,
  ): PresenceStatus {
    const connected = this.isLive(userId);
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
    void this.realtime.toStaff('presence', { userId, status: this.statusOf(userId) });
  }
}
