import {
  BoldOutlined,
  CodeOutlined,
  ItalicOutlined,
  NumberOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  SmileOutlined,
  StrikethroughOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useToast } from '../../components/Toast';
import { useChatSocket } from '../../hooks/useChatSocket';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { CHAT_MAX_FILES, readChatPaste } from '../../utils/clipboardChat';
import { avatarColor, avatarInitials } from './avatarColor';
import { ChatBody, ChatFileChip, UnfurlCards } from './ChatBody';
import { EMOJI_PICKER, QUICK_REACTIONS } from './emoji';
import { PresenceDot } from './PresenceDot';
import type { ChatConversation, ChatMessage, ChatStaff, PresenceStatus } from './types';

const GROUP_MS = 5 * 60 * 1000;

function defaultConversationId(conversations: ChatConversation[]) {
  return (
    conversations.find((c) => c.type === 'channel' && /it-ops/i.test(c.name))?.id ??
    conversations.find((c) => c.type === 'channel')?.id ??
    conversations[0]?.id ??
    null
  );
}

function mergeTranscript(server: ChatMessage[], local: ChatMessage[], channelId: number) {
  const map = new Map<number, ChatMessage>();
  for (const m of server) map.set(m.id, m);
  for (const m of local) {
    if (m.channelId === channelId && !map.has(m.id)) map.set(m.id, m);
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id,
  );
}

function initials(name: string) {
  return avatarInitials(name);
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function previewText(body: string) {
  return body
    .replace(/\[@([^\]]+)\]\(mention:\d+\)/g, '@$1')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function wrapSelection(value: string, start: number, end: number, left: string, right = left) {
  return {
    next: value.slice(0, start) + left + value.slice(start, end) + right + value.slice(end),
    caret: end + left.length + right.length,
  };
}

export function ChatPage() {
  const { data: identity } = useGetIdentity<Identity>();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [staff, setStaff] = useState<ChatStaff[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<{ parent: ChatMessage; replies: ChatMessage[] } | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState('');
  const [threadDraft, setThreadDraft] = useState('');
  const [pending, setPending] = useState<File[]>([]);
  const [threadPending, setThreadPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [railReady, setRailReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState<
    { id: number; body: string; channelId: number; parentId: number | null; channel?: { name: string | null } }[]
  >([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dropOver, setDropOver] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [typing, setTyping] = useState<{ userId: number; at: number }[]>([]);
  const [presence, setPresence] = useState<Record<number, PresenceStatus>>({});
  const [pickedId, setPickedId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const loadSeq = useRef(0);
  const urlConversationId = Number(params.get('c') || 0) || 0;
  const highlightId = Number(params.get('m') || 0) || 0;
  const activeId = urlConversationId || pickedId;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const threadId = params.get('thread') ? Number(params.get('thread')) : null;

  const loadConversations = useCallback(async () => {
    const { data } = await httpClient.get('/chat/channels');
    setConversations(Array.isArray(data) ? data : []);
    setRailReady(true);
  }, []);

  const loadMessages = useCallback(async (channelId: number, after?: number) => {
    const seq = after ? loadSeq.current : ++loadSeq.current;
    const { data } = await httpClient.get(`/chat/channels/${channelId}/messages`, {
      params: after ? { after } : {},
    });
    if (loadSeq.current !== seq) return;
    const rows: ChatMessage[] = Array.isArray(data) ? data : [];
    setMessages((prev) => {
      if (after) {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      }
      return mergeTranscript(rows, prev, channelId);
    });
    void httpClient.post(`/chat/channels/${channelId}/read`);
  }, []);

  const loadThread = useCallback(async (channelId: number, parentId: number) => {
    const { data } = await httpClient.get(
      `/chat/channels/${channelId}/messages/${parentId}/thread`,
    );
    setThread(data);
  }, []);

  const socket = useChatSocket(true, {
    onMessageNew: (raw) => {
      const msg = raw as ChatMessage;
      if (msg.channelId === activeId && !msg.parentId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        void httpClient.post(`/chat/channels/${msg.channelId}/read`);
      }
      if (msg.parentId && msg.parentId === threadId) {
        setThread((t) => (t ? { ...t, replies: [...t.replies, msg] } : t));
      }
      if (msg.parentId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.parentId
              ? { ...m, replyCount: m.replyCount + 1, lastReplyAt: msg.createdAt }
              : m,
          ),
        );
      }
      void loadConversations();
    },
    onMessageUpdated: (raw) => {
      const msg = raw as ChatMessage;
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      setThread((t) => {
        if (!t) return t;
        if (t.parent.id === msg.id) return { ...t, parent: msg };
        return { ...t, replies: t.replies.map((m) => (m.id === msg.id ? msg : m)) };
      });
    },
    onMessageDeleted: (raw) => {
      const msg = raw as ChatMessage;
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    },
    onUnread: () => void loadConversations(),
    onPresence: (p) => setPresence((prev) => ({ ...prev, [p.userId]: p.status as PresenceStatus })),
    onTyping: (p) => {
      if (p.userId === identity?.id || p.channelId !== activeId) return;
      setTyping((prev) => [
        ...prev.filter((t) => t.userId !== p.userId),
        { userId: p.userId, at: Date.now() },
      ]);
    },
    onReconnect: () => {
      if (activeId) {
        setMessages((prev) => {
          const last = prev[prev.length - 1]?.id;
          void loadMessages(activeId, last);
          return prev;
        });
      }
      void loadConversations();
    },
  });

  useEffect(() => {
    void loadConversations();
    httpClient
      .get('/chat/staff')
      .then(({ data }) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => undefined);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    setMessages((prev) => prev.filter((m) => m.channelId === activeId));
    void loadMessages(activeId);
    socket.join(activeId);
  }, [activeId, loadMessages, socket.join]);

  useEffect(() => {
    if (activeId && threadId) void loadThread(activeId, threadId);
    else setThread(null);
  }, [activeId, threadId, loadThread]);

  // Scroll after render when the transcript changes; listRef is stable.
  // biome-ignore lint/correctness/useExhaustiveDependencies: length is the signal to pin to bottom
  useEffect(() => {
    if (highlightId) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, highlightId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rerun after the transcript paints
  useEffect(() => {
    if (!highlightId) return;
    const node = document.querySelector(`[data-message-id="${highlightId}"]`);
    if (!node) return;
    node.scrollIntoView({ block: 'center' });
    node.classList.add('is-highlight');
    const t = window.setTimeout(() => {
      node.classList.remove('is-highlight');
      const next = new URLSearchParams(params);
      next.delete('m');
      setParams(next, { replace: true });
    }, 2000);
    return () => window.clearTimeout(t);
  }, [highlightId, messages.length, params, setParams]);

  const selectConv = (id: number, extra?: { thread?: number | null; message?: number }) => {
    setPickedId(id);
    const next = new URLSearchParams(params);
    next.set('c', String(id));
    if (extra?.thread) next.set('thread', String(extra.thread));
    else next.delete('thread');
    if (extra?.message) next.set('m', String(extra.message));
    else next.delete('m');
    setParams(next, { replace: true });
  };

  // Opening /chat with no query should land on #it-ops, not whichever DM was last active.
  // biome-ignore lint/correctness/useExhaustiveDependencies: seed once when the conversation list first arrives
  useEffect(() => {
    if (urlConversationId || pickedId || conversations.length === 0) return;
    const id = defaultConversationId(conversations);
    if (id) selectConv(id);
  }, [conversations, urlConversationId, pickedId]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setTyping((prev) => prev.filter((x) => Date.now() - x.at < 4000));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const filtered = conversations.filter((c) => {
    if (!filter.trim()) return true;
    return c.name.toLowerCase().includes(filter.trim().toLowerCase());
  });
  const channels = filtered.filter((c) => c.type === 'channel');
  const chats = filtered.filter((c) => c.type !== 'channel');

  const mentionChoices = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    return staff.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [staff, mentionQuery]);

  const send = async (channelId: number, body: string, parentId?: number, files = pending) => {
    const text = body.trim();
    if (!text && files.length === 0) return;
    setSending(true);
    try {
      let created: ChatMessage | undefined;
      if (files.length) {
        const fd = new FormData();
        fd.append('body', text);
        if (parentId) fd.append('parentId', String(parentId));
        for (const f of files) fd.append('files', f);
        created = (await httpClient.post(`/chat/channels/${channelId}/messages`, fd))
          .data as ChatMessage;
        if (parentId) setThreadPending([]);
        else setPending([]);
      } else {
        created = (
          await httpClient.post(`/chat/channels/${channelId}/messages`, { body: text, parentId })
        ).data as ChatMessage;
      }
      if (parentId) setThreadDraft('');
      else setDraft('');
      if (created && parentId) {
        setThread((t) =>
          t && !t.replies.some((m) => m.id === created.id)
            ? { ...t, replies: [...t.replies, created] }
            : t,
        );
      } else if (created && !created.parentId && activeIdRef.current === channelId) {
        setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
      }
      void loadConversations();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send'));
    } finally {
      setSending(false);
    }
  };

  const onComposerChange = (value: string, threadMode: boolean) => {
    if (threadMode) setThreadDraft(value);
    else setDraft(value);
    const at = /(?:^|\s)@([^\s@]*)$/.exec(value);
    if (at) {
      setMentionOpen(true);
      setMentionQuery(at[1]);
    } else {
      setMentionOpen(false);
    }
    if (activeId) socket.emitTyping(activeId, threadMode ? threadId : null);
  };

  const insertMention = (user: ChatStaff, threadMode: boolean) => {
    const value = threadMode ? threadDraft : draft;
    const next = value.replace(/(^|\s)@([^\s@]*)$/, `$1[@${user.fullName}](mention:${user.id}) `);
    if (threadMode) setThreadDraft(next);
    else setDraft(next);
    setMentionOpen(false);
    composerRef.current?.focus();
  };

  const applyWrap = (left: string, right?: string) => {
    const el = composerRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const { next, caret } = wrapSelection(draft, start, end, left, right);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const typingLabel = typing
    .map((t) => staff.find((s) => s.id === t.userId)?.fullName)
    .filter(Boolean)
    .join(', ');

  const statusOf = (userId: number, fallback?: PresenceStatus) =>
    presence[userId] ?? fallback ?? 'offline';

  return (
    <div className="nv-teams-chat" data-testid="chat-page">
      <aside className="nv-teams-rail" data-testid="chat-rail">
        <div className="nv-teams-rail-head">
          <Typography.Title level={4} style={{ margin: 0 }}>
            Chat
          </Typography.Title>
          <Space size={4}>
            <Button
              size="small"
              icon={<SearchOutlined />}
              aria-label="Search messages"
              onClick={() => setSearchOpen(true)}
            />
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              aria-label="New chat or channel"
              onClick={() => setNewOpen(true)}
            />
          </Space>
        </div>
        <Input
          allowClear
          size="small"
          prefix={<SearchOutlined />}
          placeholder="Filter conversations"
          aria-label="Filter conversations"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div
          className="nv-teams-rail-list"
          role="listbox"
          aria-label="Conversations"
          tabIndex={0}
          onKeyDown={(e) => {
            if (!filtered.length) return;
            const idx = Math.max(
              0,
              filtered.findIndex((c) => c.id === activeId),
            );
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              selectConv(filtered[Math.min(idx + 1, filtered.length - 1)].id);
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              selectConv(filtered[Math.max(idx - 1, 0)].id);
            }
          }}
        >
          {!railReady ? <Skeleton active paragraph={{ rows: 6 }} title={false} /> : null}
          {railReady && filtered.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical">
                  <span>No conversations match this filter.</span>
                  <Button size="small" type="primary" onClick={() => setNewOpen(true)}>
                    New conversation
                  </Button>
                </Space>
              }
            />
          ) : null}
          <p className="nv-teams-section">Channels</p>
          {channels.map((c) => (
            <ConvRow
              key={c.id}
              conv={c}
              active={c.id === activeId}
              presence={
                c.members[0] ? statusOf(c.members[0].userId, c.members[0].presence) : 'offline'
              }
              onClick={() => selectConv(c.id)}
            />
          ))}
          <p className="nv-teams-section">Chats</p>
          {chats.map((c) => {
            const other = c.members.find((m) => m.userId !== identity?.id);
            return (
              <ConvRow
                key={c.id}
                conv={c}
                active={c.id === activeId}
                presence={other ? statusOf(other.userId, other.presence) : 'offline'}
                onClick={() => selectConv(c.id)}
              />
            );
          })}
        </div>
      </aside>

      <section className="nv-teams-main">
        {active ? (
          <>
            <header className="nv-teams-header">
              <div className="nv-teams-header__titles">
                <Typography.Text strong className="nv-cell-line" title={active.name}>
                  {active.type === 'channel' ? active.name : active.name}
                </Typography.Text>
                <div
                  className="nv-teams-sub nv-cell-line"
                  title={active.topic || active.description || `${active.members.length} people`}
                >
                  {active.topic || active.description || `${active.members.length} people`}
                </div>
              </div>
              <Space>
                {active.members.slice(0, 4).map((m) => (
                  <span key={m.userId} className="nv-teams-av">
                    <Avatar size={22} style={{ background: avatarColor(m.userId) }}>
                      {initials(m.fullName)}
                    </Avatar>
                    <PresenceDot status={statusOf(m.userId, m.presence)} size={8} />
                  </span>
                ))}
                <Button
                  size="small"
                  icon={<TeamOutlined />}
                  onClick={() => setDetailsOpen((v) => !v)}
                >
                  Details
                </Button>
              </Space>
            </header>
            <section
              className="nv-teams-messages"
              ref={listRef}
              data-testid="chat-message-list"
              aria-label="Message transcript"
              onDragOver={(e) => {
                e.preventDefault();
                setDropOver(true);
              }}
              onDragLeave={() => setDropOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDropOver(false);
                const files = Array.from(e.dataTransfer.files ?? []);
                if (files.length) setPending((p) => [...p, ...files].slice(0, CHAT_MAX_FILES));
              }}
            >
              {dropOver ? <div className="nv-chat-drop">Drop files to attach</div> : null}
              {messages.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No messages yet. Say hello." />
              ) : (
                messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const showDay = !prev || !sameDay(prev.createdAt, m.createdAt);
                  const grouped =
                    prev &&
                    !showDay &&
                    prev.author.id === m.author.id &&
                    !prev.deleted &&
                    !m.deleted &&
                    new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS;
                  return (
                    <div key={m.id}>
                      {showDay ? <div className="nv-chat-day">{dayLabel(m.createdAt)}</div> : null}
                      <MessageRow
                        msg={m}
                        grouped={Boolean(grouped)}
                        mine={m.author.id === identity?.id}
                        mentionedYou={m.mentions.some((x) => x.userId === identity?.id)}
                        editing={editingId === m.id}
                        seenBy={
                          i === messages.length - 1 && m.author.id === identity?.id
                            ? active.seenBy
                            : undefined
                        }
                        presence={statusOf(m.author.id)}
                        onReact={(emoji) =>
                          void httpClient.post(`/chat/messages/${m.id}/reactions`, { emoji })
                        }
                        onThread={() => selectConv(active.id, { thread: m.id })}
                        onStartEdit={() => setEditingId(m.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSaveEdit={async (next) => {
                          await httpClient.patch(`/chat/messages/${m.id}`, { body: next });
                          setEditingId(null);
                        }}
                        onDelete={async () => {
                          await httpClient.delete(`/chat/messages/${m.id}`);
                        }}
                        canModerate={
                          identity?.role === 'SUPER_ADMIN' || identity?.role === 'IT_ADMIN'
                        }
                      />
                    </div>
                  );
                })
              )}
            </section>
            <div className="nv-teams-typing" aria-live="polite">
              {typingLabel ? `${typingLabel} is typing…` : ' '}
            </div>
            {active.joined && !active.archived ? (
              <Composer
                value={draft}
                textareaRef={composerRef}
                sending={sending}
                pending={pending}
                mentionOpen={mentionOpen}
                mentionChoices={mentionChoices}
                onMention={insertMention}
                onChange={(v) => onComposerChange(v, false)}
                onSend={() => void send(active.id, draft)}
                onFiles={(files) => setPending((p) => [...p, ...files])}
                onRemoveFile={(i) => setPending((p) => p.filter((_, idx) => idx !== i))}
                onWrap={applyWrap}
                onInsert={(s) => setDraft((d) => d + s)}
              />
            ) : active.joined ? (
              <Typography.Text type="secondary">This conversation is archived.</Typography.Text>
            ) : (
              <Button
                type="primary"
                onClick={() =>
                  void httpClient.post(`/chat/channels/${active.id}/join`).then(loadConversations)
                }
              >
                Join {active.name}
              </Button>
            )}
          </>
        ) : (
          <Empty description="Select a conversation" />
        )}
      </section>

      {thread || detailsOpen ? (
        <aside className="nv-teams-panel" aria-label={thread ? 'Thread' : 'Conversation details'}>
          {thread ? (
            <>
              <header className="nv-teams-header">
                <Typography.Text strong>Thread</Typography.Text>
                <Button
                  size="small"
                  type="text"
                  onClick={() => selectConv(activeId!, { thread: null })}
                >
                  Close
                </Button>
              </header>
              <div className="nv-teams-messages">
                <MessageRow
                  msg={thread.parent}
                  grouped={false}
                  mine={thread.parent.author.id === identity?.id}
                  mentionedYou={thread.parent.mentions.some((x) => x.userId === identity?.id)}
                  presence={statusOf(thread.parent.author.id)}
                  onReact={(emoji) =>
                    void httpClient.post(`/chat/messages/${thread.parent.id}/reactions`, { emoji })
                  }
                  onThread={() => undefined}
                  hideThread
                />
                {thread.replies.map((m) => (
                  <MessageRow
                    key={m.id}
                    msg={m}
                    grouped={false}
                    mine={m.author.id === identity?.id}
                    mentionedYou={m.mentions.some((x) => x.userId === identity?.id)}
                    presence={statusOf(m.author.id)}
                    onReact={(emoji) =>
                      void httpClient.post(`/chat/messages/${m.id}/reactions`, { emoji })
                    }
                    onThread={() => undefined}
                    hideThread
                  />
                ))}
              </div>
              {active && !active.archived ? (
                <Composer
                  value={threadDraft}
                  sending={sending}
                  pending={threadPending}
                  mentionOpen={false}
                  mentionChoices={[]}
                  onMention={() => undefined}
                  onChange={(v) => onComposerChange(v, true)}
                  onSend={() => void send(active.id, threadDraft, thread.parent.id, threadPending)}
                  onFiles={(files) => setThreadPending((p) => [...p, ...files].slice(0, CHAT_MAX_FILES))}
                  onRemoveFile={(i) => setThreadPending((p) => p.filter((_, idx) => idx !== i))}
                  onWrap={() => undefined}
                  onInsert={(s) => setThreadDraft((d) => d + s)}
                  compact
                />
              ) : null}
            </>
          ) : active ? (
            <DetailsPanel
              conv={active}
              identityId={identity?.id}
              statusOf={statusOf}
              staff={staff}
              onClose={() => setDetailsOpen(false)}
              onChanged={loadConversations}
            />
          ) : null}
        </aside>
      ) : null}

      <Modal
        title="Search messages"
        open={searchOpen}
        onCancel={() => setSearchOpen(false)}
        footer={null}
      >
        <Input.Search
          autoFocus
          placeholder="Search in chat"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onSearch={(q) => {
            if (q.trim().length < 2) return;
            void httpClient.get('/chat/search', { params: { q: q.trim() } }).then(({ data }) => {
              setSearchHits(Array.isArray(data) ? data : []);
            });
          }}
        />
        <div style={{ marginTop: 12, maxHeight: 320, overflow: 'auto' }}>
          {searchHits.map((h) => (
            <button
              key={h.id}
              type="button"
              className="nv-palette-result"
              title={h.body}
              onClick={() => {
                setSearchOpen(false);
                selectConv(h.channelId, {
                  message: h.id,
                  thread: h.parentId ?? undefined,
                });
              }}
            >
              <span className="nv-cell-line">
                {h.channel?.name ?? 'Chat'} — {h.body.slice(0, 80)}
              </span>
            </button>
          ))}
        </div>
      </Modal>
      <NewChatModal
        open={newOpen}
        staff={staff.filter((s) => s.id !== identity?.id)}
        onClose={() => setNewOpen(false)}
        onCreated={(id) => {
          setNewOpen(false);
          void loadConversations().then(() => selectConv(id));
        }}
      />
    </div>
  );
}

function ConvRow({
  conv,
  active,
  presence,
  onClick,
}: {
  conv: ChatConversation;
  active: boolean;
  presence: PresenceStatus;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={`nv-teams-conv${active ? ' is-active' : ''}${conv.unread ? ' is-unread' : ''}`}
      onClick={onClick}
    >
      <span className="nv-teams-av">
        {conv.type === 'channel' ? (
          <Avatar size={28} style={{ background: '#475569' }}>
            #
          </Avatar>
        ) : conv.type === 'group' ? (
          <Avatar size={28} style={{ background: '#0F766E' }} icon={<TeamOutlined />} />
        ) : (
          <Avatar size={28} style={{ background: avatarColor(conv.otherUserId ?? conv.id) }}>
            {initials(conv.name)}
          </Avatar>
        )}
        {conv.type === 'dm' ? <PresenceDot status={presence} size={8} /> : null}
      </span>
      <span className="nv-teams-conv-body">
        <span className="nv-teams-conv-name" title={conv.name}>
          {conv.name}
        </span>
        <span
          className="nv-teams-conv-preview"
          title={conv.lastMessage ? previewText(conv.lastMessage.body) : 'No messages yet'}
        >
          {conv.lastMessage ? previewText(conv.lastMessage.body) : 'No messages yet'}
        </span>
      </span>
      <span className="nv-teams-conv-meta">
        {conv.lastMessage
          ? new Date(conv.lastMessage.at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : ''}
        {conv.unread > 0 ? <Badge count={conv.unread} size="small" /> : null}
      </span>
    </button>
  );
}

function MessageRow({
  msg,
  grouped,
  mine,
  mentionedYou,
  editing,
  seenBy,
  presence,
  onReact,
  onThread,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  canModerate,
  hideThread,
}: {
  msg: ChatMessage;
  grouped: boolean;
  mine: boolean;
  mentionedYou?: boolean;
  editing?: boolean;
  seenBy?: { userId: number; fullName: string }[];
  presence: PresenceStatus;
  onReact: (emoji: string) => void;
  onThread: () => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (body: string) => Promise<void>;
  onDelete?: () => void;
  canModerate?: boolean;
  hideThread?: boolean;
}) {
  const [draft, setDraft] = useState(msg.body);
  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <article
      data-message-id={msg.id}
      data-testid={mine ? 'chat-msg-mine' : 'chat-msg-theirs'}
      aria-label={mine ? `You: ${msg.body.slice(0, 80)}` : `${msg.author.fullName}`}
      className={`nv-teams-msg ${mine ? 'is-mine' : 'is-theirs'}${grouped ? ' is-grouped' : ''}${mentionedYou ? ' is-mention-you' : ''}`}
    >
      {mine ? null : (
        <div className="nv-teams-msg-gutter">
          {grouped ? (
            <span className="nv-teams-msg-time">{time}</span>
          ) : (
            <span className="nv-teams-av">
              <Avatar size={32} style={{ background: avatarColor(msg.author.id) }}>
                {initials(msg.author.fullName)}
              </Avatar>
              <PresenceDot status={presence} size={9} />
            </span>
          )}
        </div>
      )}
      <div className="nv-teams-msg-cluster">
        {grouped ? null : (
          <header className="nv-teams-msg-head">
            <Typography.Text strong>{mine ? 'You' : msg.author.fullName}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {time}
              {msg.editedAt ? ' · edited' : ''}
            </Typography.Text>
          </header>
        )}
        <div className="nv-teams-bubble">
          {!msg.deleted ? (
            <div className="nv-chat-msg-actions">
              <Popover
                content={
                  <Space wrap>
                    {QUICK_REACTIONS.map((e) => (
                      <Button key={e} size="small" type="text" onClick={() => onReact(e)}>
                        {e}
                      </Button>
                    ))}
                  </Space>
                }
                trigger="hover"
              >
                <Button size="small" type="text" icon={<SmileOutlined />} aria-label="Add reaction" />
              </Popover>
              {hideThread ? null : (
                <Button size="small" type="text" onClick={onThread}>
                  Reply
                </Button>
              )}
              {mine && onStartEdit ? (
                <Button size="small" type="text" onClick={onStartEdit}>
                  Edit
                </Button>
              ) : null}
              {mine || canModerate ? (
                <Popconfirm
                  title="Delete this message? This cannot be undone."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void onDelete?.()}
                >
                  <Button size="small" type="text" danger>
                    Delete
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
          ) : null}
          {msg.deleted ? (
            <em className="nv-chat-tombstone">This message was deleted</em>
          ) : editing ? (
            <div className="nv-chat-edit">
              <Input.TextArea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <Space>
                <Button size="small" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => void onSaveEdit?.(draft)}
                  disabled={!draft.trim()}
                >
                  Save
                </Button>
              </Space>
            </div>
          ) : (
            <>
              <ChatBody body={msg.body} />
              <UnfurlCards links={msg.links} />
              <div className="nv-chat-files">
                {msg.attachments.map((a) => (
                  <ChatFileChip
                    key={a.id}
                    id={a.id}
                    filename={a.filename}
                    image={a.image}
                    sizeBytes={a.sizeBytes}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        {msg.reactions.length > 0 ? (
          <div className="nv-chat-reactions">
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                className={`nv-chat-rxn${r.mine ? ' is-mine' : ''}`}
                onClick={() => onReact(r.emoji)}
                aria-label={`${r.emoji} ${r.count}`}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        ) : null}
        {msg.replyCount > 0 && !hideThread ? (
          <Button size="small" type="link" onClick={onThread}>
            {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
            {msg.lastReplyAt
              ? ` · ${new Date(msg.lastReplyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </Button>
        ) : null}
        {seenBy && seenBy.length > 0 ? (
          <div className="nv-teams-seen">
            {seenBy.length === 1 ? `Seen by ${seenBy[0].fullName}` : `Seen by ${seenBy.map((s) => s.fullName).join(', ')}`}
          </div>
        ) : seenBy ? (
          <div className="nv-teams-seen">Seen</div>
        ) : null}
      </div>
    </article>
  );
}

function Composer({
  value,
  sending,
  pending,
  mentionOpen,
  mentionChoices,
  onMention,
  onChange,
  onSend,
  onFiles,
  onRemoveFile,
  onWrap,
  onInsert,
  textareaRef,
  compact,
}: {
  value: string;
  sending: boolean;
  pending: File[];
  mentionOpen: boolean;
  mentionChoices: ChatStaff[];
  onMention: (u: ChatStaff, threadMode: boolean) => void;
  onChange: (v: string) => void;
  onSend: () => void;
  onFiles: (files: File[]) => void;
  onRemoveFile: (i: number) => void;
  onWrap: (left: string, right?: string) => void;
  onInsert: (s: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const canSend = Boolean(value.trim() || pending.length);
  return (
    <fieldset
      className="nv-teams-composer"
      data-testid={compact ? undefined : 'chat-composer'}
      aria-label="Message composer"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onFiles(files.slice(0, CHAT_MAX_FILES));
      }}
    >
      {pending.length > 0 ? (
        <div className="nv-chat-pending">
          {pending.map((f, i) => (
            <Button key={`${f.name}-${i}`} size="small" onClick={() => onRemoveFile(i)}>
              {f.name} ×
            </Button>
          ))}
        </div>
      ) : null}
      {mentionOpen && mentionChoices.length > 0 ? (
        <ul className="nv-chat-mentions" aria-label="Mention someone">
          {mentionChoices.slice(0, 8).map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onMention(s, false)}>
                {s.fullName}
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => onInsert(' @channel ')}>
              @channel — notify everyone here
            </button>
          </li>
        </ul>
      ) : null}
      {!compact ? (
        <div className="nv-teams-toolbar">
          <Button
            size="small"
            type="text"
            icon={<BoldOutlined />}
            aria-label="Bold"
            onClick={() => onWrap('**')}
          />
          <Button
            size="small"
            type="text"
            icon={<ItalicOutlined />}
            aria-label="Italic"
            onClick={() => onWrap('*')}
          />
          <Button
            size="small"
            type="text"
            icon={<StrikethroughOutlined />}
            aria-label="Strikethrough"
            onClick={() => onWrap('~~')}
          />
          <Button
            size="small"
            type="text"
            icon={<CodeOutlined />}
            aria-label="Inline code"
            onClick={() => onWrap('`')}
          />
          <Button
            size="small"
            type="text"
            icon={<NumberOutlined />}
            aria-label="Bulleted list"
            onClick={() => onInsert('\n- ')}
          />
          <Popover
            content={
              <div className="nv-emoji-grid">
                {EMOJI_PICKER.map((e) => (
                  <button key={e} type="button" onClick={() => onInsert(e)}>
                    {e}
                  </button>
                ))}
              </div>
            }
            trigger="click"
          >
            <Button size="small" type="text" icon={<SmileOutlined />} aria-label="Emoji" />
          </Popover>
          <Button
            size="small"
            type="text"
            icon={<PaperClipOutlined />}
            aria-label="Attach file"
            onClick={() => fileRef.current?.click()}
          />
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
            onChange={(e) => {
              onFiles(Array.from(e.target.files ?? []).slice(0, CHAT_MAX_FILES));
              e.target.value = '';
            }}
          />
        </div>
      ) : null}
      <Input.TextArea
        ref={textareaRef as never}
        rows={compact ? 2 : 3}
        value={value}
        aria-label="Message"
        placeholder="Write a message — @ to mention, Ctrl+V to paste a file or screenshot, Enter to send"
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => {
          if ((e.nativeEvent as unknown as { shiftKey?: boolean }).shiftKey) return;
          const result = readChatPaste(e.clipboardData);
          if (result.kind === 'files') {
            e.preventDefault();
            onFiles(result.files);
          } else if (result.kind === 'text') {
            e.preventDefault();
            onChange(value ? `${value}\n${result.text}` : result.text);
          } else if (result.kind === 'rejected') {
            e.preventDefault();
            toast.error(result.reason);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        loading={sending}
        disabled={!canSend}
        onClick={onSend}
        aria-label="Send"
      >
        Send
      </Button>
    </fieldset>
  );
}

function DetailsPanel({
  conv,
  statusOf,
  staff,
  onClose,
  onChanged,
}: {
  conv: ChatConversation;
  identityId?: number;
  statusOf: (id: number, fallback?: PresenceStatus) => PresenceStatus;
  staff: ChatStaff[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [addId, setAddId] = useState<number | null>(null);
  return (
    <>
      <header className="nv-teams-header">
        <Typography.Text strong>Details</Typography.Text>
        <Button size="small" type="text" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="nv-teams-details">
        {conv.topic ? <p>{conv.topic}</p> : null}
        <p className="nv-teams-section">Members</p>
        {conv.members.map((m) => (
          <div key={m.userId} className="nv-teams-member">
            <span className="nv-teams-av">
              <Avatar size={24} style={{ background: avatarColor(m.userId) }}>
                {initials(m.fullName)}
              </Avatar>
              <PresenceDot status={statusOf(m.userId, m.presence)} size={8} />
            </span>
            <span>{m.fullName}</span>
            {m.role === 'owner' ? <Typography.Text type="secondary">owner</Typography.Text> : null}
          </div>
        ))}
        {conv.type !== 'dm' ? (
          <Space wrap style={{ marginTop: 12 }}>
            <Select
              placeholder="Add people"
              style={{ minWidth: 180 }}
              options={staff
                .filter((s) => !conv.members.some((m) => m.userId === s.id))
                .map((s) => ({ value: s.id, label: s.fullName }))}
              value={addId}
              onChange={setAddId}
              allowClear
            />
            <Button
              size="small"
              disabled={!addId}
              onClick={() => {
                if (!addId) return;
                void httpClient
                  .post(`/chat/channels/${conv.id}/members`, { userIds: [addId] })
                  .then(() => {
                    setAddId(null);
                    onChanged();
                  });
              }}
            >
              Add
            </Button>
            {conv.joined ? (
              <Popconfirm
                title="Leave this channel? You will stop receiving messages until you rejoin."
                okText="Leave"
                okButtonProps={{ danger: true }}
                onConfirm={() =>
                  void httpClient.post(`/chat/channels/${conv.id}/leave`).then(onChanged)
                }
              >
                <Button size="small">Leave</Button>
              </Popconfirm>
            ) : null}
          </Space>
        ) : null}
        <p className="nv-teams-section">Notifications</p>
        <Select
          value={conv.muted ? 'muted' : conv.notifyPref}
          style={{ width: '100%' }}
          options={[
            { value: 'all', label: 'All messages' },
            { value: 'mentions', label: 'Mentions only' },
            { value: 'muted', label: 'Muted' },
          ]}
          onChange={(v) =>
            void httpClient
              .patch(`/chat/channels/${conv.id}/prefs`, {
                muted: v === 'muted',
                notifyPref: v === 'muted' ? 'muted' : v,
              })
              .then(onChanged)
          }
        />
        {conv.seenBy && conv.seenBy.length > 0 ? (
          <p className="nv-teams-seen">Seen by {conv.seenBy.map((s) => s.fullName).join(', ')}</p>
        ) : null}
      </div>
    </>
  );
}

function NewChatModal({
  open,
  staff,
  onClose,
  onCreated,
}: {
  open: boolean;
  staff: ChatStaff[];
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState<'dm' | 'group' | 'channel'>('dm');
  const [userIds, setUserIds] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const submit = async () => {
    try {
      if (kind === 'dm') {
        if (userIds.length !== 1) {
          toast.error('Pick one person');
          return;
        }
        const { data } = await httpClient.post('/chat/dm', { userId: userIds[0] });
        onCreated(data.id);
        return;
      }
      if (kind === 'group') {
        const { data } = await httpClient.post('/chat/group', { userIds, name: name || undefined });
        onCreated(data.id);
        return;
      }
      const { data } = await httpClient.post('/chat/channels', {
        name,
        visibility,
        memberIds: userIds,
      });
      onCreated(data.id);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not create chat'));
    }
  };
  return (
    <Modal
      title="New conversation"
      open={open}
      onCancel={onClose}
      onOk={() => void submit()}
      okText="Start"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Select
          value={kind}
          onChange={setKind}
          options={[
            { value: 'dm', label: 'Direct message' },
            { value: 'group', label: 'Group chat' },
            { value: 'channel', label: 'Channel' },
          ]}
        />
        {kind === 'channel' ? (
          <>
            <Input
              placeholder="Channel name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Select
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'public', label: 'Public — any staff can join' },
                { value: 'private', label: 'Private — invite only' },
              ]}
            />
          </>
        ) : null}
        {kind === 'group' ? (
          <Input
            placeholder="Group name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : null}
        <Select
          mode={kind === 'dm' ? undefined : 'multiple'}
          placeholder={kind === 'dm' ? 'Person' : 'People'}
          style={{ width: '100%' }}
          options={staff.map((s) => ({ value: s.id, label: s.fullName }))}
          value={kind === 'dm' ? userIds[0] : userIds}
          onChange={(v) => setUserIds(kind === 'dm' ? (v ? [v as number] : []) : (v as number[]))}
        />
      </Space>
    </Modal>
  );
}
