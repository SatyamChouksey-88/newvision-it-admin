import { ChatChannelType, ChatVisibility } from '@prisma/client';

/** Public team/channel rooms — message fan-out. */
export function teamChannelName(channelId: number): string {
  return `channel-${channelId}`;
}

/** Private team/group rooms (non-DM, not public visibility). */
export function privateTeamChannelName(channelId: number): string {
  return `private-channel-${channelId}`;
}

/** Direct messages — both users must compute the same name. */
export function dmChannelName(userIdA: number, userIdB: number): string {
  const [a, b] = [userIdA, userIdB].sort((x, y) => x - y);
  return `private-dm-${a}-${b}`;
}

/** Who is viewing a channel + client typing events. */
export function presenceChannelName(channelId: number): string {
  return `presence-channel-${channelId}`;
}

/** Staff-wide presence directory. */
export function staffPresenceChannelName(): string {
  return 'presence-staff';
}

/** Per-user notifications (unread badges). */
export function userNotifyChannelName(userId: number): string {
  return `private-user-${userId}`;
}

export type ChannelRoute = {
  message: string;
  isPrivate: boolean;
  isPresence: boolean;
};

export function messageChannelFor(
  channel: {
    id: number;
    type: ChatChannelType;
    visibility: ChatVisibility;
  },
  memberUserIds: number[],
): ChannelRoute {
  if (channel.type === ChatChannelType.dm) {
    if (memberUserIds.length < 2) {
      return { message: privateTeamChannelName(channel.id), isPrivate: true, isPresence: false };
    }
    return {
      message: dmChannelName(memberUserIds[0], memberUserIds[1]),
      isPrivate: true,
      isPresence: false,
    };
  }
  const isPublicTeam =
    channel.type === ChatChannelType.channel && channel.visibility === ChatVisibility.public;
  if (isPublicTeam) {
    return { message: teamChannelName(channel.id), isPrivate: false, isPresence: false };
  }
  return {
    message: privateTeamChannelName(channel.id),
    isPrivate: true,
    isPresence: false,
  };
}

export function parsePusherChannelName(channelName: string): {
  kind:
    | 'team'
    | 'private-team'
    | 'dm'
    | 'presence-channel'
    | 'presence-staff'
    | 'user-notify'
    | 'unknown';
  channelId?: number;
  userIds?: [number, number];
  userId?: number;
} {
  if (channelName === staffPresenceChannelName()) return { kind: 'presence-staff' };
  const team = /^channel-(\d+)$/.exec(channelName);
  if (team) return { kind: 'team', channelId: Number(team[1]) };
  const privTeam = /^private-channel-(\d+)$/.exec(channelName);
  if (privTeam) return { kind: 'private-team', channelId: Number(privTeam[1]) };
  const dm = /^private-dm-(\d+)-(\d+)$/.exec(channelName);
  if (dm) return { kind: 'dm', userIds: [Number(dm[1]), Number(dm[2])] };
  const pres = /^presence-channel-(\d+)$/.exec(channelName);
  if (pres) return { kind: 'presence-channel', channelId: Number(pres[1]) };
  const user = /^private-user-(\d+)$/.exec(channelName);
  if (user) return { kind: 'user-notify', userId: Number(user[1]) };
  return { kind: 'unknown' };
}
