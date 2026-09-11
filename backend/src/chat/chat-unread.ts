export interface UnreadMessage {
  id: number;
  createdAt: Date | string;
  authorId: number;
  deletedAt?: Date | string | null;
}

export interface UnreadCursor {
  lastReadMessageId?: number | null;
  lastReadAt?: Date | string | null;
}

/** True when the viewer has not yet read this message. Own and tombstoned rows never count. */
export function messageIsUnread(
  message: UnreadMessage,
  cursor: UnreadCursor,
  viewerId: number,
): boolean {
  if (message.authorId === viewerId) return false;
  if (message.deletedAt) return false;
  if (cursor.lastReadMessageId != null) return message.id > cursor.lastReadMessageId;
  const readAt = cursor.lastReadAt ? new Date(cursor.lastReadAt).getTime() : 0;
  return new Date(message.createdAt).getTime() > readAt;
}

export function countUnread(
  messages: UnreadMessage[],
  cursor: UnreadCursor,
  viewerId: number,
): number {
  return messages.reduce((n, m) => n + (messageIsUnread(m, cursor, viewerId) ? 1 : 0), 0);
}
