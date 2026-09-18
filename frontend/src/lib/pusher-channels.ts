export function dmChannelName(userIdA: number, userIdB: number): string {
  const [a, b] = [userIdA, userIdB].sort((x, y) => x - y);
  return `private-dm-${a}-${b}`;
}

export function messageChannelForConversation(
  conv: { id: number; type: string; visibility: string; otherUserId: number | null },
  myUserId: number,
): string {
  if (conv.type === 'dm' && conv.otherUserId != null) {
    return dmChannelName(myUserId, conv.otherUserId);
  }
  if (conv.type === 'channel' && conv.visibility === 'public') {
    return `channel-${conv.id}`;
  }
  return `private-channel-${conv.id}`;
}

export function presenceChannelName(channelId: number): string {
  return `presence-channel-${channelId}`;
}

export function userNotifyChannelName(userId: number): string {
  return `private-user-${userId}`;
}

export const STAFF_PRESENCE_CHANNEL = 'presence-staff';
