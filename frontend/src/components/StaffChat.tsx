import { CommentOutlined, SendOutlined } from '@ant-design/icons';
import { Avatar, Badge, Button, Drawer, Input, List, Space, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useGetIdentity } from '@refinedev/core';
import type { Identity } from '../providers/authProvider';
import { httpClient } from '../providers/axios';

const STAFF = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT'];

interface Channel {
  id: number;
  type: 'dm' | 'group';
  name: string;
  unread: number;
  lastMessage: { body: string; at: string; author: string } | null;
}

interface ChatMsg {
  id: number;
  body: string;
  createdAt: string;
  author: { id: number; fullName: string };
  links: { kind: string; href: string; code: string; title?: string; status?: string }[];
}

export function StaffChatLauncher() {
  const { data: identity } = useGetIdentity<Identity>();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const allowed = STAFF.includes(identity?.role ?? '');
  useEffect(() => {
    if (!allowed) return;
    const tick = () => {
      httpClient
        .get('/chat/unread')
        .then(({ data }) => setUnread(data.unread ?? 0))
        .catch(() => undefined);
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [allowed]);

  if (!allowed) return null;

  return (
    <>
      <Badge count={unread} size="small">
        <Button
          size="small"
          icon={<CommentOutlined />}
          aria-label="IT staff chat"
          title="IT staff chat"
          onClick={() => setOpen(true)}
        >
          <span className="nv-header-action-text">Chat</span>
        </Button>
      </Badge>
      <StaffChatDrawer open={open} onClose={() => setOpen(false)} onUnread={setUnread} />
    </>
  );
}

function StaffChatDrawer({
  open,
  onClose,
  onUnread,
}: {
  open: boolean;
  onClose: () => void;
  onUnread: (n: number) => void;
}) {
  const { data: identity } = useGetIdentity<Identity>();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [staff, setStaff] = useState<{ id: number; fullName: string }[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const lastId = useRef(0);

  const loadChannels = useCallback(() => {
    httpClient
      .get('/chat/channels')
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : [];
        setChannels(rows);
        onUnread(rows.reduce((n: number, c: Channel) => n + (c.unread ?? 0), 0));
        setActive((cur) => cur ?? rows[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, [onUnread]);

  useEffect(() => {
    if (!open) return;
    loadChannels();
    httpClient
      .get('/chat/staff')
      .then(({ data }) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => undefined);
  }, [open, loadChannels]);

  useEffect(() => {
    if (!open || !active) return;
    lastId.current = 0;
    const pull = () => {
      httpClient
        .get(`/chat/channels/${active}/messages`, {
          params: lastId.current ? { after: lastId.current } : {},
        })
        .then(({ data }) => {
          const rows: ChatMsg[] = Array.isArray(data) ? data : [];
          if (!lastId.current) setMessages(rows);
          else if (rows.length) setMessages((prev) => [...prev, ...rows]);
          if (rows.length) lastId.current = rows[rows.length - 1].id;
        })
        .catch(() => undefined);
      void httpClient.post(`/chat/channels/${active}/read`);
    };
    pull();
    const id = window.setInterval(pull, 4000);
    return () => window.clearInterval(id);
  }, [open, active]);

  const send = async () => {
    if (!active || !draft.trim()) return;
    const { data } = await httpClient.post(`/chat/channels/${active}/messages`, { body: draft.trim() });
    setMessages((prev) => [...prev, data]);
    lastId.current = data.id;
    setDraft('');
    loadChannels();
  };

  const startDm = async (userId: number) => {
    const { data } = await httpClient.post('/chat/dm', { userId });
    setActive(data.id);
    loadChannels();
  };

  return (
    <Drawer title="IT staff chat" open={open} onClose={onClose} width={720} destroyOnClose>
      <div className="nv-chat-layout">
        <aside className="nv-chat-list">
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Channels
          </Typography.Text>
          <List
            size="small"
            dataSource={channels}
            renderItem={(c) => (
              <List.Item
                className={c.id === active ? 'nv-chat-item is-active' : 'nv-chat-item'}
                onClick={() => setActive(c.id)}
              >
                <Space>
                  <span>{c.name}</span>
                  {c.unread > 0 ? <Badge count={c.unread} size="small" /> : null}
                </Space>
              </List.Item>
            )}
          />
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Direct message
          </Typography.Text>
          {staff
            .filter((s) => s.id !== identity?.id)
            .map((s) => (
              <Button key={s.id} type="link" size="small" onClick={() => void startDm(s.id)}>
                {s.fullName}
              </Button>
            ))}
        </aside>
        <section className="nv-chat-thread">
          <div className="nv-chat-messages">
            {messages.map((m) => (
              <div key={m.id} className="nv-chat-msg">
                <Avatar size={24}>{m.author.fullName.slice(0, 1)}</Avatar>
                <div>
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    {m.author.fullName}
                  </Typography.Text>{' '}
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </Typography.Text>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  {m.links?.map((l) => (
                    <Link key={`${l.kind}-${l.code}`} to={l.href} className="nv-chat-unfurl">
                      <strong>{l.code}</strong>
                      {l.title ? <span>{l.title}</span> : null}
                      {l.status ? <em>{l.status.replaceAll('_', ' ')}</em> : null}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Input.TextArea
            rows={2}
            value={draft}
            placeholder="Message — Enter to send, Shift+Enter for a new line"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={() => void send()} style={{ marginTop: 8 }}>
            Send
          </Button>
        </section>
      </div>
    </Drawer>
  );
}
