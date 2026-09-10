import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown, List, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { httpClient } from '../providers/axios';
import type { AppNotification } from '../types';

const POLL_MS = 60_000;

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await httpClient.get('/notifications', {
        params: { _start: 0, _end: 20, isRead: 'false' },
      });
      setItems(data.data ?? []);
      setTotal(data.total ?? (data.data ?? []).length);
    } catch {
      // Network blip or expired session: keep whatever we last showed; the 401 interceptor
      // handles redirecting. Never surface a toast every poll interval.
    }
  }, []);

  useEffect(() => {
    void load();
    // Pause polling while the tab is hidden — no point hammering the API in the background.
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const markRead = async (id: number) => {
    try {
      await httpClient.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      /* leave the item in place; user can retry */
    }
  };

  const markAllRead = async () => {
    try {
      await httpClient.patch('/notifications/read-all');
      setItems([]);
      setTotal(0);
    } catch {
      /* ignore */
    }
  };

  // Rendered as a plain panel (not a Menu) so "Mark read" on one row keeps the panel open
  // instead of antd closing the dropdown on every menu-item click.
  const panel = (
    <section className="ant-dropdown-menu" style={{ width: 340, padding: 4 }} aria-label="Notifications">
      {items.length > 0 && (
        <Space style={{ width: '100%', justifyContent: 'space-between', padding: '4px 8px' }}>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {total} unread
          </Typography.Text>
          <Button type="link" size="small" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        </Space>
      )}
      <List
        size="small"
        dataSource={items}
        locale={{ emptyText: 'No unread notifications' }}
        renderItem={(n) => (
          <List.Item
            actions={[
              <Button key="read" type="link" size="small" onClick={() => void markRead(n.id)}>
                Mark read
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={<Typography.Text style={{ fontSize: 12 }}>{n.title}</Typography.Text>}
              description={
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {n.message}
                  {n.asset ? (
                    <>
                      {' '}
                      <Link to={`/assets/show/${n.asset.id}`} onClick={() => setOpen(false)}>
                        {n.asset.assetCode}
                      </Link>
                    </>
                  ) : null}
                  {n.supportTicket ? (
                    <>
                      {' '}
                      <Link to={`/tickets/show/${n.supportTicket.id}`} onClick={() => setOpen(false)}>
                        {n.supportTicket.ticketNumber}
                      </Link>
                    </>
                  ) : null}
                </Typography.Text>
              }
            />
          </List.Item>
        )}
        style={{ maxHeight: 360, overflow: 'auto' }}
      />
    </section>
  );

  return (
    <Dropdown popupRender={() => panel} trigger={['click']} open={open} onOpenChange={setOpen}>
      <Badge count={total} size="small" offset={[-2, 2]} overflowCount={99}>
        <Button
          type="text"
          icon={<BellOutlined />}
          aria-label={total ? `Notifications, ${total} unread` : 'Notifications'}
        />
      </Badge>
    </Dropdown>
  );
}
