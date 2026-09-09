import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown, List, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { httpClient } from '../providers/axios';
import type { AppNotification } from '../types';

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await httpClient.get('/notifications', {
      params: { _start: 0, _end: 20, isRead: 'false' },
    });
    setItems(data.data ?? []);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (id: number) => {
    await httpClient.patch(`/notifications/${id}/read`);
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const menu = {
    items: [
      {
        key: 'list',
        label: (
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
                          <Link to={`/assets/show/${n.asset.id}`}>{n.asset.assetCode}</Link>
                        </>
                      ) : null}
                    </Typography.Text>
                  }
                />
              </List.Item>
            )}
            style={{ width: 320, maxHeight: 360, overflow: 'auto' }}
          />
        ),
      },
    ],
  };

  return (
    <Dropdown menu={menu} trigger={['click']} open={open} onOpenChange={setOpen}>
      <Badge count={items.length} size="small" offset={[-2, 2]}>
        <Button type="text" icon={<BellOutlined />} aria-label="Notifications" />
      </Badge>
    </Dropdown>
  );
}
