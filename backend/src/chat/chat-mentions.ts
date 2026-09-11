export type ParsedMention =
  | { kind: 'user'; userId: number }
  | { kind: 'channel' }
  | { kind: 'here' };

const USER_RE = /\[@([^\]]+)\]\(mention:(\d+)\)/g;
const CHANNEL_RE = /(^|[\s(])@channel\b/gi;
const HERE_RE = /(^|[\s(])@here\b/gi;

/** Structured mentions in a chat body — user chips plus @channel / @here. */
export function parseMentions(body: string): ParsedMention[] {
  const found: ParsedMention[] = [];
  const seenUsers = new Set<number>();
  let channel = false;
  let here = false;

  for (const m of body.matchAll(USER_RE)) {
    const userId = Number(m[2]);
    if (!Number.isFinite(userId) || seenUsers.has(userId)) continue;
    seenUsers.add(userId);
    found.push({ kind: 'user', userId });
  }
  CHANNEL_RE.lastIndex = 0;
  if (CHANNEL_RE.test(body)) channel = true;
  HERE_RE.lastIndex = 0;
  if (HERE_RE.test(body)) here = true;
  if (channel) found.push({ kind: 'channel' });
  if (here) found.push({ kind: 'here' });
  return found;
}

export function formatUserMention(user: { id: number; fullName: string }): string {
  const name = user.fullName.replace(/[[\]]/g, '');
  return `[@${name}](mention:${user.id})`;
}
