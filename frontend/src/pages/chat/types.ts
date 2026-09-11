export type ChatType = 'channel' | 'dm' | 'group';
export type PresenceStatus = 'available' | 'away' | 'busy' | 'dnd' | 'offline';

export interface ChatMember {
  userId: number;
  fullName: string;
  presence?: PresenceStatus;
  role?: string;
  lastReadMessageId?: number | null;
}

export interface ChatConversation {
  id: number;
  type: ChatType;
  name: string;
  archived: boolean;
  visibility: 'public' | 'private';
  joined: boolean;
  role: string | null;
  muted: boolean;
  notifyPref: 'all' | 'mentions' | 'muted';
  unread: number;
  otherUserId: number | null;
  members: ChatMember[];
  lastMessage: { body: string; at: string; author: string } | null;
  description?: string | null;
  topic?: string | null;
  seenBy?: { userId: number; fullName: string }[];
}

export interface ChatLink {
  kind: string;
  href: string;
  code: string;
  title?: string;
  status?: string;
}

export interface ChatMessage {
  id: number;
  channelId: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deleted: boolean;
  author: { id: number; fullName: string };
  links: ChatLink[];
  mentions: { kind: string; userId: number | null; fullName: string | null }[];
  reactions: {
    emoji: string;
    count: number;
    mine: boolean;
    users: { id: number; fullName: string }[];
  }[];
  attachments: {
    id: number;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    image: boolean;
  }[];
  replyCount: number;
  lastReplyAt: string | null;
}

export interface ChatStaff {
  id: number;
  fullName: string;
  email: string;
  presence: PresenceStatus;
  role: { name: string };
}
