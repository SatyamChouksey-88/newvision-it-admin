import { describe, expect, it } from '@jest/globals';
import { countUnread, messageIsUnread } from './chat-unread';

const t = (
  id: number,
  authorId: number,
  extra: Partial<{ createdAt: string; deletedAt: string }> = {},
) => ({
  id,
  authorId,
  createdAt: extra.createdAt ?? '2026-09-11T10:00:00.000Z',
  deletedAt: extra.deletedAt ?? null,
});

describe('messageIsUnread', () => {
  it('uses lastReadMessageId when set', () => {
    expect(messageIsUnread(t(5, 2), { lastReadMessageId: 4 }, 1)).toBe(true);
    expect(messageIsUnread(t(4, 2), { lastReadMessageId: 4 }, 1)).toBe(false);
  });

  it('falls back to lastReadAt and ignores own / deleted rows', () => {
    expect(messageIsUnread(t(1, 1), { lastReadAt: null }, 1)).toBe(false);
    expect(
      messageIsUnread(t(2, 2, { deletedAt: '2026-09-11T11:00:00.000Z' }), { lastReadAt: null }, 1),
    ).toBe(false);
    expect(
      messageIsUnread(
        t(3, 2, { createdAt: '2026-09-11T12:00:00.000Z' }),
        { lastReadAt: '2026-09-11T11:00:00.000Z' },
        1,
      ),
    ).toBe(true);
  });

  it('counts a conversation preview list', () => {
    expect(countUnread([t(1, 2), t(2, 1), t(3, 2)], { lastReadMessageId: 1 }, 1)).toBe(1);
  });
});
