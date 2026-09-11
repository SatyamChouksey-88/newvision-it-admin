import { describe, expect, it } from '@jest/globals';
import { formatUserMention, parseMentions } from './chat-mentions';

describe('parseMentions', () => {
  it('extracts structured user mentions and ignores display-name-only @text', () => {
    const found = parseMentions('Hey [@Jane Doe](mention:7) and @jane');
    expect(found).toEqual([{ kind: 'user', userId: 7 }]);
  });

  it('dedupes the same user and flags @channel / @here', () => {
    const found = parseMentions('[@A](mention:2) [@A](mention:2) @channel @here');
    expect(found).toEqual([{ kind: 'user', userId: 2 }, { kind: 'channel' }, { kind: 'here' }]);
  });

  it('does not treat emails as @channel', () => {
    expect(parseMentions('mail ops@channel.com')).toEqual([]);
  });

  it('formats a chip token from a staff record', () => {
    expect(formatUserMention({ id: 9, fullName: 'Ishan Admin' })).toBe('[@Ishan Admin](mention:9)');
  });
});
