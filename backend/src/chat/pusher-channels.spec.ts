import { ChatChannelType, ChatVisibility } from '@prisma/client';
import { dmChannelName, messageChannelFor, parsePusherChannelName } from './pusher-channels';

describe('pusher-channels', () => {
  it('sorts DM user ids consistently', () => {
    expect(dmChannelName(5, 12)).toBe('private-dm-5-12');
    expect(dmChannelName(12, 5)).toBe('private-dm-5-12');
  });

  it('maps channel types to Pusher names', () => {
    expect(
      messageChannelFor(
        { id: 3, type: ChatChannelType.channel, visibility: ChatVisibility.public },
        [1, 2],
      ).message,
    ).toBe('channel-3');
    expect(
      messageChannelFor(
        { id: 4, type: ChatChannelType.dm, visibility: ChatVisibility.private },
        [1, 9],
      ).message,
    ).toBe('private-dm-1-9');
  });

  it('parses channel names for auth', () => {
    expect(parsePusherChannelName('presence-channel-7').channelId).toBe(7);
    expect(parsePusherChannelName('private-dm-2-8').userIds).toEqual([2, 8]);
  });
});
