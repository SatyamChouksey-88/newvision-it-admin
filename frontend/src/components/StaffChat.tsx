import { CommentOutlined } from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';
import { Badge, Button } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useChatSocket } from '../hooks/useChatSocket';
import type { Identity } from '../providers/authProvider';
import { httpClient } from '../providers/axios';

const STAFF = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT'];

/** Header launcher — opens the full-page Teams-style chat at /chat. */
export function StaffChatLauncher() {
  const { data: identity } = useGetIdentity<Identity>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const allowed = STAFF.includes(identity?.role ?? '');

  const refresh = useCallback(() => {
    httpClient
      .get('/chat/unread')
      .then(({ data }) => setUnread(data.unread ?? 0))
      .catch(() => undefined);
  }, []);

  useChatSocket(allowed, {
    onUnread: () => refresh(),
    onMessageNew: () => refresh(),
  });

  useEffect(() => {
    if (!allowed) return;
    refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [allowed, refresh]);

  if (!allowed) return null;

  return (
    <Badge count={unread} size="small">
      <Button
        size="small"
        type={pathname.startsWith('/chat') ? 'primary' : 'default'}
        icon={<CommentOutlined aria-hidden />}
        aria-label={unread ? `Team chat, ${unread} unread` : 'Team chat'}
        title="Team chat"
        onClick={() => navigate('/chat')}
      >
        <span className="nv-header-action-text">Chat</span>
      </Button>
    </Badge>
  );
}
