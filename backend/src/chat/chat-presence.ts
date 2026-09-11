export type PresenceMode = 'auto' | 'available' | 'away' | 'busy' | 'dnd';
export type PresenceStatus = 'available' | 'away' | 'busy' | 'dnd' | 'offline';

export const PRESENCE_AWAY_MS = 5 * 60 * 1000;

/** Derive a Teams-style presence from connection + idle + optional manual override. */
export function derivePresence(input: {
  connected: boolean;
  lastActiveAt?: Date | string | null;
  mode?: PresenceMode | null;
  now?: Date;
}): PresenceStatus {
  if (!input.connected) return 'offline';
  const mode = input.mode ?? 'auto';
  if (mode !== 'auto') return mode;
  const now = input.now ?? new Date();
  const last = input.lastActiveAt ? new Date(input.lastActiveAt).getTime() : 0;
  if (!last || now.getTime() - last > PRESENCE_AWAY_MS) return 'away';
  return 'available';
}
