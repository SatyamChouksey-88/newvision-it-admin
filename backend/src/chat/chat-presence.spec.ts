import { describe, expect, it } from '@jest/globals';
import { derivePresence } from './chat-presence';

describe('derivePresence', () => {
  const now = new Date('2026-09-11T12:00:00.000Z');

  it('is offline when disconnected', () => {
    expect(derivePresence({ connected: false, mode: 'dnd', now })).toBe('offline');
  });

  it('honours a manual mode while connected', () => {
    expect(derivePresence({ connected: true, mode: 'busy', lastActiveAt: now, now })).toBe('busy');
    expect(derivePresence({ connected: true, mode: 'dnd', lastActiveAt: now, now })).toBe('dnd');
  });

  it('marks auto users away after five idle minutes', () => {
    expect(
      derivePresence({
        connected: true,
        mode: 'auto',
        lastActiveAt: new Date('2026-09-11T11:56:00.000Z'),
        now,
      }),
    ).toBe('available');
    expect(
      derivePresence({
        connected: true,
        mode: 'auto',
        lastActiveAt: new Date('2026-09-11T11:50:00.000Z'),
        now,
      }),
    ).toBe('away');
  });
});
