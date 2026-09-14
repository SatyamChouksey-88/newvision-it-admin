import {
  ArrowLeftOutlined,
  BoldOutlined,
  CodeOutlined,
  CommentOutlined,
  EllipsisOutlined,
  FontSizeOutlined,
  InfoCircleOutlined,
  ItalicOutlined,
  LeftOutlined,
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
  Dropdown,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Space,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useToast } from '../../components/Toast';
import { useChatSocket } from '../../hooks/useChatSocket';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { CHAT_MAX_FILES, readChatPaste } from '../../utils/clipboardChat';
import { avatarColor, avatarInitials } from './avatarColor';
import { ChatBody, ChatFileChip, UnfurlCards } from './ChatBody';
import { EMOJI_PICKER, QUICK_REACTIONS } from './emoji';
import { PRESENCE_LABEL, PresenceDot } from './PresenceDot';
import type {
  ChatConversation,
  ChatMessage,
  ChatSearchHit,
  ChatStaff,
  PresenceStatus,
} from './types';

const GROUP_MS = 5 * 60 * 1000;
const TABLET_MQ = '(max-width: 1023px)';
const FILTER_KEY = 'nv.chat.listFilter';
const DENSITY_KEY = 'nv.chat.density';

type ListFilter = 'all' | 'unread' | 'mentions';
type Density = 'comfy' | 'compact';
type TabletPane = 'list' | 'conversation' | 'panel';

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw && (allowed as readonly string[]).includes(raw)) return raw as T;
  } catch {
    /* private mode */
  }
  return fallback;
}

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

function useTablet() {
  const [tablet, setTablet] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(TABLET_MQ).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(TABLET_MQ);
    const onChange = () => setTablet(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return tablet;
}

export function ChatPage() {
  const { data: identity } = useGetIdentity<Identity>();
  const toast = useToast();
  const isTablet = useTablet();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [staff, setStaff] = useState<ChatStaff[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<{ parent: ChatMessage; replies: ChatMessage[] } | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [find, setFind] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>(() =>
    readStored(FILTER_KEY, ['all', 'unread', 'mentions'] as const, 'all'),
  );
  const [density, setDensity] = useState<Density>(() =>
    readStored(DENSITY_KEY, ['comfy', 'compact'] as const, 'comfy'),
  );
  const [tabletPane, setTabletPane] = useState<TabletPane>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia(TABLET_MQ).matches &&
    !new URLSearchParams(window.location.search).get('c')
      ? 'list'
      : 'conversation',
  );
  const [draft, setDraft] = useState('');
  const [threadDraft, setThreadDraft] = useState('');
  const [pending, setPending] = useState<File[]>([]);
  const [threadPending, setThreadPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [railReady, setRailReady] = useState(false);
  const [transcriptReady, setTranscriptReady] = useState(false);
  const [searchHits, setSearchHits] = useState<ChatSearchHit[] | null>(null);
  const [mentionHits, setMentionHits] = useState<ChatSearchHit[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dropOver, setDropOver] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [typing, setTyping] = useState<{ userId: number; at: number }[]>([]);
  const [presence, setPresence] = useState<Record<number, PresenceStatus>>({});
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [unseen, setUnseen] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const prevLen = useRef(0);
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
    setTranscriptReady(true);
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
    setTranscriptReady(false);
    setUnseen(0);
    stickToBottom.current = true;
    prevLen.current = 0;
    setMessages((prev) => prev.filter((m) => m.channelId === activeId));
    void loadMessages(activeId);
    socket.join(activeId);
  }, [activeId, loadMessages, socket.join]);

  useEffect(() => {
    if (activeId && threadId) {
      void loadThread(activeId, threadId);
      if (isTablet) setTabletPane('panel');
    } else setThread(null);
  }, [activeId, threadId, loadThread, isTablet]);

  useEffect(() => {
    if (highlightId) return;
    const el = listRef.current;
    if (!el) return;
    if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    } else if (messages.length > prevLen.current) {
      setUnseen((n) => n + (messages.length - prevLen.current));
    }
    prevLen.current = messages.length;
  }, [messages.length, highlightId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rerun after the transcript paints
  useEffect(() => {
    if (!highlightId) return;
    const node = document.querySelector(`[data-message-id="${highlightId}"]`);
    if (!node) return;
    stickToBottom.current = false;
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

  const selectConv = (
    id: number,
    extra?: { thread?: number | null; message?: number; pane?: TabletPane },
  ) => {
    setPickedId(id);
    const next = new URLSearchParams(params);
    next.set('c', String(id));
    if (extra?.thread) next.set('thread', String(extra.thread));
    else next.delete('thread');
    if (extra?.message) next.set('m', String(extra.message));
    else next.delete('m');
    setParams(next, { replace: true });
    if (isTablet) {
      setTabletPane(extra?.pane ?? (extra?.thread ? 'panel' : 'conversation'));
    }
  };

  useEffect(() => {
    if (urlConversationId || pickedId || conversations.length === 0) return;
    const id = defaultConversationId(conversations);
    if (id) {
      setPickedId(id);
      const next = new URLSearchParams(params);
      next.set('c', String(id));
      setParams(next, { replace: true });
    }
  }, [conversations, urlConversationId, pickedId, params, setParams]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setTyping((prev) => prev.filter((x) => Date.now() - x.at < 4000));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, listFilter);
    } catch {
      /* ignore */
    }
  }, [listFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      /* ignore */
    }
  }, [density]);

  useEffect(() => {
    const q = find.trim();
    if (q.length < 2) {
      setSearchHits(null);
      return;
    }
    const t = window.setTimeout(() => {
      void httpClient.get('/chat/search', { params: { q } }).then(({ data }) => {
        setSearchHits(Array.isArray(data) ? data : []);
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [find]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh after the rail reloads
  useEffect(() => {
    if (listFilter !== 'mentions') return;
    void httpClient
      .get('/chat/mentions')
      .then(({ data }) => {
        setMentionHits(Array.isArray(data) ? data : []);
      })
      .catch(() => setMentionHits([]));
  }, [listFilter, conversations]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const mentionChannelIds = useMemo(
    () => new Set(mentionHits.map((h) => h.channelId)),
    [mentionHits],
  );
  const filtered = conversations.filter((c) => {
    if (listFilter === 'unread' && c.unread <= 0) return false;
    if (listFilter === 'mentions' && !mentionChannelIds.has(c.id)) return false;
    if (!find.trim()) return true;
    return c.name.toLowerCase().includes(find.trim().toLowerCase());
  });
  const channels = filtered.filter((c) => c.type === 'channel');
  const chats = filtered.filter((c) => c.type !== 'channel');
  const unreadTotal = conversations.reduce((n, c) => n + (c.joined ? c.unread : 0), 0);

  const mentionChoices = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    return staff.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [staff, mentionQuery]);

  const send = async (channelId: number, body: string, parentId?: number, files = pending) => {
    const text = (body ?? '').trim();
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
      stickToBottom.current = true;
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

  const jumpToLatest = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = true;
    setUnseen(0);
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const markAllRead = () => {
    void httpClient
      .post('/chat/read-all')
      .then(() => {
        setConversations((prev) => prev.map((c) => ({ ...c, unread: 0 })));
      })
      .catch((e) => toast.error(apiErrorMessage(e, 'Could not mark conversations read')));
  };

  const setMute = (conv: ChatConversation, muted: boolean) => {
    void httpClient
      .patch(`/chat/channels/${conv.id}/prefs`, {
        muted,
        notifyPref: muted ? 'muted' : 'all',
      })
      .then(loadConversations);
  };

  const typingLabel = typing
    .map((t) => staff.find((s) => s.id === t.userId)?.fullName)
    .filter(Boolean)
    .join(', ');

  const statusOf = (userId: number, fallback?: PresenceStatus) =>
    presence[userId] ?? fallback ?? 'offline';

  const dmOther = active?.type === 'dm' ? active.members.find((m) => m.userId !== identity?.id) : null;
  const dmStatus = dmOther ? statusOf(dmOther.userId, dmOther.presence) : 'offline';
  const panelOpen = Boolean(thread || detailsOpen);
  const pane = isTablet ? tabletPane : 'desktop';

  const backOnTablet = () => {
    if (tabletPane === 'panel') {
      if (thread) selectConv(activeId!, { thread: null, pane: 'conversation' });
      else setDetailsOpen(false);
      setTabletPane('conversation');
      return;
    }
    setTabletPane('list');
  };

  const openDetails = () => {
    setDetailsOpen((v) => !v);
    if (isTablet) setTabletPane('panel');
  };

  return (
    <div
      className={`nv-teams-shell is-${density}${isTablet ? ` is-tablet is-${tabletPane}` : ''}`}
      data-testid="chat-page"
      data-density={density}
    >
      <a href="#nv-teams-transcript" className="nv-skip-link">
        Skip to messages
      </a>
      <header className="nv-teams-appbar" data-testid="chat-appbar">
        <Link to="/" className="nv-teams-brand" aria-label="NewVision home">
          <img src="/brand/favicon.png" alt="" className="nv-brand-img" width={22} height={22} />
          <span>NewVision</span>
        </Link>
        <div className="nv-teams-appbar__title">
          {active ? active.name : 'Chat'}
        </div>
        <div className="nv-teams-appbar__actions">
          {active ? (
            <div className="nv-teams-stack" aria-hidden>
              {active.members.slice(0, 3).map((m) => (
                <span key={m.userId} className="nv-teams-av">
                  <Avatar size={22} style={{ background: avatarColor(m.userId) }}>
                    {initials(m.fullName)}
                  </Avatar>
                  <PresenceDot status={statusOf(m.userId, m.presence)} size={8} />
                </span>
              ))}
            </div>
          ) : null}
          {active ? (
            <button
              type="button"
              className="nv-teams-icon-btn"
              aria-label="Conversation details"
              aria-pressed={detailsOpen}
              onClick={openDetails}
            >
              <InfoCircleOutlined />
            </button>
          ) : null}
          <button
            type="button"
            className="nv-teams-icon-btn"
            aria-label={`Message density, ${density}`}
            aria-pressed={density === 'compact'}
            title={density === 'comfy' ? 'Switch to Compact' : 'Switch to Comfy'}
            onClick={() => setDensity((d) => (d === 'comfy' ? 'compact' : 'comfy'))}
          >
            {density === 'comfy' ? 'Comfy' : 'Compact'}
          </button>
          <Link to="/" className="nv-teams-back">
            <ArrowLeftOutlined /> Back to console
          </Link>
        </div>
      </header>

      <div className="nv-teams-chat">
        <aside className="nv-teams-rail" data-testid="chat-rail">
          <div className="nv-teams-rail-head">
            <h1 className="nv-teams-rail-title">Chat</h1>
            <button
              type="button"
              className="nv-teams-icon-btn is-primary"
              aria-label="New chat or channel"
              onClick={() => setNewOpen(true)}
            >
              <PlusOutlined />
            </button>
          </div>
          <div className="nv-teams-pills" role="toolbar" aria-label="Conversation filters" data-testid="chat-filters">
            {(
              [
                ['all', 'All'],
                ['unread', 'Unread'],
                ['mentions', 'Mentions'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={listFilter === id ? 'is-active' : ''}
                aria-pressed={listFilter === id}
                onClick={() => setListFilter(id)}
              >
                {label}
              </button>
            ))}
            {unreadTotal > 0 ? (
              <button type="button" className="nv-teams-markread" onClick={markAllRead}>
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="nv-teams-find">
            <SearchOutlined aria-hidden />
            <input
              data-testid="chat-find"
              aria-label="Find"
              placeholder="Find"
              value={find}
              onChange={(e) => setFind(e.target.value)}
            />
          </div>
          {searchHits && searchHits.length > 0 ? (
            <div className="nv-teams-find-hits" role="listbox" aria-label="Find results">
              {searchHits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  role="option"
                  className="nv-teams-find-hit"
                  title={h.body}
                  onClick={() =>
                    selectConv(h.channelId, {
                      message: h.id,
                      thread: h.parentId ?? undefined,
                    })
                  }
                >
                  <span className="nv-teams-find-hit__room">{h.channel?.name ?? 'Chat'}</span>
                  <span className="nv-teams-find-hit__body">{previewText(h.body)}</span>
                </button>
              ))}
            </div>
          ) : searchHits && find.trim().length >= 2 ? (
            <p className="nv-teams-find-empty">No messages match {find.trim()}.</p>
          ) : null}
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
            {!railReady ? (
              <div className="nv-teams-skel-list" aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="nv-teams-skel-row" />
                ))}
              </div>
            ) : null}
            {railReady && filtered.length === 0 ? (
              <div className="nv-teams-rail-empty">
                <p>
                  {listFilter === 'unread'
                    ? 'Nothing unread.'
                    : listFilter === 'mentions'
                      ? 'No mentions yet.'
                      : 'No conversations match this filter.'}
                </p>
                <button type="button" className="nv-teams-text-btn" onClick={() => setNewOpen(true)}>
                  New conversation
                </button>
              </div>
            ) : null}
            {channels.length ? <p className="nv-teams-section">Channels</p> : null}
            {channels.map((c) => (
              <ConvRow
                key={c.id}
                conv={c}
                active={c.id === activeId && (!isTablet || tabletPane !== 'list')}
                presence={
                  c.members[0] ? statusOf(c.members[0].userId, c.members[0].presence) : 'offline'
                }
                onClick={() => selectConv(c.id)}
                onMute={() => setMute(c, !c.muted)}
              />
            ))}
            {chats.length ? <p className="nv-teams-section">Chats</p> : null}
            {chats.map((c) => {
              const other = c.members.find((m) => m.userId !== identity?.id);
              return (
                <ConvRow
                  key={c.id}
                  conv={c}
                  active={c.id === activeId && (!isTablet || tabletPane !== 'list')}
                  presence={other ? statusOf(other.userId, other.presence) : 'offline'}
                  onClick={() => selectConv(c.id)}
                  onMute={() => setMute(c, !c.muted)}
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
                  {isTablet && pane !== 'list' ? (
                    <button
                      type="button"
                      className="nv-teams-icon-btn"
                      aria-label="Back to conversations"
                      onClick={backOnTablet}
                    >
                      <LeftOutlined />
                    </button>
                  ) : null}
                  <div className="nv-teams-header__text">
                    <div className="nv-teams-title nv-cell-line" title={active.name}>
                      {active.name}
                    </div>
                    {active.type === 'dm' ? (
                      <div className={`nv-teams-sub nv-presence-word is-${dmStatus}`}>
                        <PresenceDot status={dmStatus} size={8} />
                        {PRESENCE_LABEL[dmStatus]}
                      </div>
                    ) : (
                      <div
                        className="nv-teams-sub nv-cell-line"
                        title={active.topic || active.description || `${active.members.length} people`}
                      >
                        {active.topic || active.description || `${active.members.length} people`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="nv-teams-header__right">
                  <div className="nv-teams-stack">
                    {active.members.slice(0, 4).map((m) => (
                      <span key={m.userId} className="nv-teams-av">
                        <Avatar size={24} style={{ background: avatarColor(m.userId) }}>
                          {initials(m.fullName)}
                        </Avatar>
                        <PresenceDot status={statusOf(m.userId, m.presence)} size={8} />
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="nv-teams-icon-btn"
                    aria-label="Conversation details"
                    aria-pressed={detailsOpen}
                    onClick={openDetails}
                  >
                    <InfoCircleOutlined />
                  </button>
                </div>
              </header>
              <div className="nv-teams-transcript-wrap">
                <section
                  id="nv-teams-transcript"
                  className="nv-teams-messages"
                  ref={listRef}
                  data-testid="chat-message-list"
                  role="log"
                  aria-label="Message transcript"
                  aria-live="polite"
                  aria-relevant="additions"
                  aria-atomic="false"
                  onScroll={() => {
                    const el = listRef.current;
                    if (!el) return;
                    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
                    stickToBottom.current = atBottom;
                    if (atBottom) setUnseen(0);
                  }}
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
                  {!transcriptReady ? (
                    <div className="nv-teams-skel-msgs" aria-hidden>
                      {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="nv-teams-skel-msg" />
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <ChannelStartCard conv={active} onWrite={() => composerRef.current?.focus()} />
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
                        new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() <
                          GROUP_MS;
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
                            onThread={() => selectConv(active.id, { thread: m.id, pane: 'panel' })}
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
                {unseen > 0 ? (
                  <button type="button" className="nv-teams-jump" onClick={jumpToLatest}>
                    {unseen} new {unseen === 1 ? 'message' : 'messages'} · Jump to latest
                  </button>
                ) : null}
              </div>
              <div className="nv-teams-typing" aria-live="polite">
                {typingLabel ? `${typingLabel} is typing…` : ' '}
              </div>
              {active.joined && !active.archived ? (
                <Composer
                  value={draft}
                  textareaRef={composerRef}
                  sending={sending}
                  pending={pending}
                  mentionOpen={mentionOpen && !thread}
                  mentionChoices={mentionChoices}
                  onMention={insertMention}
                  onChange={(v) => onComposerChange(v, false)}
                  onSend={(body) => void send(active.id, body)}
                  onFiles={(files) => setPending((p) => [...p, ...files])}
                  onRemoveFile={(i) => setPending((p) => p.filter((_, idx) => idx !== i))}
                  onInsert={(s) => setDraft((d) => d + s)}
                />
              ) : active.joined ? (
                <p className="nv-teams-archived">This conversation is archived.</p>
              ) : (
                <div className="nv-teams-join">
                  <Button
                    type="primary"
                    onClick={() =>
                      void httpClient.post(`/chat/channels/${active.id}/join`).then(loadConversations)
                    }
                  >
                    Join {active.name}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="nv-teams-start">
              <h2>Select a conversation</h2>
              <p>Pick a channel or chat from the list.</p>
            </div>
          )}
        </section>

        {panelOpen ? (
          <aside
            className="nv-teams-panel"
            aria-label={thread ? 'Thread' : 'Conversation details'}
          >
            {thread ? (
              <>
                <header className="nv-teams-thread-head">
                  {isTablet ? (
                    <button
                      type="button"
                      className="nv-teams-icon-btn"
                      aria-label="Back to conversation"
                      onClick={backOnTablet}
                    >
                      <LeftOutlined />
                    </button>
                  ) : null}
                  <div className="nv-teams-thread-head__text">
                    <div className="nv-teams-title">Thread</div>
                    <p className="nv-teams-thread-quote" title={thread.parent.body}>
                      {previewText(thread.parent.body)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="nv-teams-icon-btn"
                    aria-label="Close thread"
                    onClick={() => selectConv(activeId!, { thread: null, pane: 'conversation' })}
                  >
                    ×
                  </button>
                </header>
                <div className="nv-teams-messages">
                  <MessageRow
                    msg={thread.parent}
                    grouped={false}
                    mine={thread.parent.author.id === identity?.id}
                    mentionedYou={thread.parent.mentions.some((x) => x.userId === identity?.id)}
                    presence={statusOf(thread.parent.author.id)}
                    onReact={(emoji) =>
                      void httpClient.post(`/chat/messages/${thread.parent.id}/reactions`, {
                        emoji,
                      })
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
                    mentionOpen={mentionOpen && Boolean(thread)}
                    mentionChoices={mentionChoices}
                    onMention={insertMention}
                    onChange={(v) => onComposerChange(v, true)}
                    onSend={(body) => void send(active.id, body, thread.parent.id, threadPending)}
                    onFiles={(files) =>
                      setThreadPending((p) => [...p, ...files].slice(0, CHAT_MAX_FILES))
                    }
                    onRemoveFile={(i) => setThreadPending((p) => p.filter((_, idx) => idx !== i))}
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
                onClose={() => {
                  setDetailsOpen(false);
                  if (isTablet) setTabletPane('conversation');
                }}
                onChanged={loadConversations}
              />
            ) : null}
          </aside>
        ) : null}
      </div>

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

function ChannelStartCard({
  conv,
  onWrite,
}: {
  conv: ChatConversation;
  onWrite: () => void;
}) {
  return (
    <div className="nv-teams-start">
      {conv.type === 'channel' ? (
        <span className="nv-teams-hash-tile nv-teams-hash-tile--lg" aria-hidden>
          #
        </span>
      ) : null}
      <h2>This is the beginning of {conv.name}</h2>
      {conv.topic ? <p className="nv-teams-start__topic">{conv.topic}</p> : null}
      <p>{conv.description || 'This is the start of this conversation.'}</p>
      <button type="button" className="nv-teams-start__cta" onClick={onWrite}>
        Write a message
      </button>
    </div>
  );
}

function ConvRow({
  conv,
  active,
  presence,
  onClick,
  onMute,
}: {
  conv: ChatConversation;
  active: boolean;
  presence: PresenceStatus;
  onClick: () => void;
  onMute: () => void;
}) {
  return (
    <div
      role="option"
      tabIndex={-1}
      aria-selected={active}
      className={`nv-teams-conv${active ? ' is-active' : ''}${conv.unread ? ' is-unread' : ''}${conv.muted ? ' is-muted' : ''}`}
      onClick={onClick}
    >
      <span className="nv-teams-av">
        {conv.type === 'channel' ? (
          <span className="nv-teams-hash-tile" aria-hidden>
            #
          </span>
        ) : conv.type === 'group' ? (
          <Avatar size={36} style={{ background: '#0F766E' }} icon={<TeamOutlined />} />
        ) : (
          <Avatar size={36} style={{ background: avatarColor(conv.otherUserId ?? conv.id) }}>
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
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'mute',
                label: conv.muted ? 'Unmute' : 'Mute',
                onClick: ({ domEvent }) => {
                  domEvent.stopPropagation();
                  onMute();
                },
              },
            ],
          }}
        >
          <button
            type="button"
            className="nv-teams-conv-more"
            aria-label="Conversation menu"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisOutlined />
          </button>
        </Dropdown>
      </span>
    </div>
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
  const overflowItems = [
    mine && onStartEdit
      ? { key: 'edit', label: 'Edit', onClick: () => onStartEdit() }
      : null,
    mine || canModerate
      ? {
          key: 'delete',
          danger: true,
          label: (
            <Popconfirm
              title="Delete this message? This cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => void onDelete?.()}
            >
              <span>Delete</span>
            </Popconfirm>
          ),
        }
      : null,
  ].filter(Boolean) as { key: string; label: ReactNode; danger?: boolean; onClick?: () => void }[];

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
        {grouped ? (
          <span className="nv-teams-msg-time nv-teams-msg-time--cluster">{time}</span>
        ) : (
          <header className="nv-teams-msg-head">
            <span className="nv-teams-msg-author">{mine ? 'You' : msg.author.fullName}</span>
            {msg.editedAt ? <span className="nv-teams-msg-edited">edited</span> : null}
            <time className="nv-teams-msg-time" dateTime={msg.createdAt}>
              {time}
            </time>
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
                <button type="button" className="nv-teams-icon-btn" aria-label="Add reaction">
                  <SmileOutlined />
                </button>
              </Popover>
              {hideThread ? null : (
                <button type="button" className="nv-teams-icon-btn" aria-label="Reply" onClick={onThread}>
                  <CommentOutlined />
                </button>
              )}
              {overflowItems.length ? (
                <Dropdown menu={{ items: overflowItems }} trigger={['click']}>
                  <button type="button" className="nv-teams-icon-btn" aria-label="More actions">
                    <EllipsisOutlined />
                  </button>
                </Dropdown>
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
        {mentionedYou ? <span className="nv-teams-mentioned">Mentioned you</span> : null}
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
          <button type="button" className="nv-teams-replies" onClick={onThread}>
            {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
            {msg.lastReplyAt
              ? ` · ${new Date(msg.lastReplyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </button>
        ) : null}
        {seenBy && seenBy.length > 0 ? (
          <div className="nv-teams-seen">
            {seenBy.length === 1
              ? `Seen by ${seenBy[0].fullName}`
              : `Seen by ${seenBy.map((s) => s.fullName).join(', ')}`}
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
  onSend: (body: string) => void;
  onFiles: (files: File[]) => void;
  onRemoveFile: (i: number) => void;
  onInsert: (s: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  const [formatOpen, setFormatOpen] = useState(false);
  const canSend = Boolean(value.trim() || pending.length);

  const attachRef = (node: HTMLTextAreaElement | null) => {
    localRef.current = node;
    if (textareaRef) textareaRef.current = node;
  };

  const fireSend = () => {
    const body = localRef.current?.value ?? value;
    if (body !== value) onChange(body);
    onSend(body);
  };

  const applyWrap = (left: string, right?: string) => {
    const el = localRef.current;
    if (!el) {
      onChange(`${left}${value}${right ?? left}`);
      return;
    }
    const { next, caret } = wrapSelection(value, el.selectionStart, el.selectionEnd, left, right);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, compact ? 96 : 120)}px`;
  };

  return (
    <fieldset
      className={`nv-teams-composer${compact ? ' is-compact' : ''}${formatOpen ? ' is-format' : ''}`}
      data-testid={compact ? undefined : 'chat-composer'}
      aria-label="Composer"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onFiles(files.slice(0, CHAT_MAX_FILES));
      }}
    >
      {mentionOpen && mentionChoices.length > 0 ? (
        <ul className="nv-chat-mentions" aria-label="Mention someone">
          {mentionChoices.slice(0, 8).map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onMention(s, Boolean(compact))}>
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
      {pending.length > 0 ? (
        <div className="nv-chat-pending">
          {pending.map((f, i) => (
            <button
              key={`${f.name}-${i}`}
              type="button"
              className="nv-chat-pending-chip"
              onClick={() => onRemoveFile(i)}
            >
              {f.name} ×
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        ref={attachRef}
        className="nv-teams-composer-input"
        rows={compact ? 1 : 2}
        value={value}
        aria-label="Message"
        placeholder="Write a message — @ to mention, Ctrl+V to paste a file or screenshot, Enter to send"
        onChange={(e) => {
          onChange(e.target.value);
          resize(e.target);
        }}
        onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)}
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
            fireSend();
          }
        }}
      />
      <div className="nv-teams-composer-bar">
        <div className="nv-teams-composer-tools">
          <button
            type="button"
            className={`nv-teams-icon-btn${formatOpen ? ' is-on' : ''}`}
            aria-label="Format"
            aria-pressed={formatOpen}
            onClick={() => setFormatOpen((v) => !v)}
          >
            <FontSizeOutlined />
          </button>
          {formatOpen ? (
            <>
              <button type="button" className="nv-teams-icon-btn" aria-label="Bold" onClick={() => applyWrap('**')}>
                <BoldOutlined />
              </button>
              <button type="button" className="nv-teams-icon-btn" aria-label="Italic" onClick={() => applyWrap('*')}>
                <ItalicOutlined />
              </button>
              <button
                type="button"
                className="nv-teams-icon-btn"
                aria-label="Strikethrough"
                onClick={() => applyWrap('~~')}
              >
                <StrikethroughOutlined />
              </button>
              <button type="button" className="nv-teams-icon-btn" aria-label="Inline code" onClick={() => applyWrap('`')}>
                <CodeOutlined />
              </button>
              <button
                type="button"
                className="nv-teams-icon-btn"
                aria-label="Bulleted list"
                onClick={() => onInsert('\n- ')}
              >
                <NumberOutlined />
              </button>
            </>
          ) : null}
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
            <button type="button" className="nv-teams-icon-btn" aria-label="Emoji">
              <SmileOutlined />
            </button>
          </Popover>
          <button
            type="button"
            className="nv-teams-icon-btn"
            aria-label="Attach file"
            onClick={() => fileRef.current?.click()}
          >
            <PaperClipOutlined />
          </button>
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
        <button
          type="button"
          className={`nv-teams-send${canSend ? '' : ' is-quiet'}`}
          disabled={sending}
          onClick={fireSend}
          aria-label="Send"
          data-testid={compact ? undefined : 'chat-send'}
        >
          <SendOutlined /> Send
        </button>
      </div>
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
      <header className="nv-teams-thread-head">
        <div className="nv-teams-title">Details</div>
        <button type="button" className="nv-teams-icon-btn" aria-label="Close details" onClick={onClose}>
          ×
        </button>
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
            {m.role === 'owner' ? <span className="nv-teams-sub">owner</span> : null}
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
