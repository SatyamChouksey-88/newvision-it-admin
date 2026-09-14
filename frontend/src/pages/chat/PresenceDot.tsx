import type { PresenceStatus } from './types';

export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  available: 'Available',
  away: 'Away',
  busy: 'Busy',
  dnd: 'Do not disturb',
  offline: 'Offline',
};

/** Colour + shape so presence is not colour-only. */
export function PresenceDot({
  status,
  size = 10,
}: {
  status?: PresenceStatus | null;
  size?: number;
}) {
  const s = status ?? 'offline';
  return (
    <span
      className={`nv-presence nv-presence-${s}`}
      style={{ width: size, height: size }}
      title={PRESENCE_LABEL[s]}
      role="img"
      aria-label={PRESENCE_LABEL[s]}
    />
  );
}
