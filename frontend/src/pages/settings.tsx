import { useGetIdentity } from '@refinedev/core';
import { Card, Descriptions, Space, Tabs, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { Identity } from '../providers/authProvider';
import { httpClient } from '../providers/axios';
import { ImportJobsPanel } from './settings/import-jobs';
import { ReconciliationPanel } from './settings/reconciliation';
import { WebhooksPanel } from './settings/webhooks';

const GOVERNANCE_ROLES = ['SUPER_ADMIN', 'IT_ADMIN'];

export function SettingsPage() {
  const { data: identity } = useGetIdentity<Identity>();
  const [permissions, setPermissions] = useState<string[]>([]);
  const canGovern = GOVERNANCE_ROLES.includes(identity?.role ?? '');

  useEffect(() => {
    httpClient
      .get('/auth/me')
      .then(({ data }) => setPermissions(data.permissions ?? []))
      .catch(() => setPermissions([]));
  }, []);

  const items = [
    {
      key: 'account',
      label: 'Account',
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card size="small" title="Your account">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">{identity?.fullName}</Descriptions.Item>
              <Descriptions.Item label="Email">{identity?.email}</Descriptions.Item>
              <Descriptions.Item label="Role">
                <Tag color="blue">{identity?.role}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <Card size="small" title="Your permissions">
            <Space wrap>
              {permissions.length === 0 ? (
                <Typography.Text type="secondary">
                  No explicit permissions listed for this role.
                </Typography.Text>
              ) : (
                permissions.map((p) => <Tag key={p}>{p}</Tag>)
              )}
            </Space>
          </Card>
        </Space>
      ),
    },
    ...(canGovern
      ? [
          { key: 'imports', label: 'Import jobs', children: <ImportJobsPanel /> },
          { key: 'reconcile', label: 'Reconciliation', children: <ReconciliationPanel /> },
          { key: 'webhooks', label: 'Webhooks', children: <WebhooksPanel /> },
        ]
      : []),
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Settings
      </Typography.Title>
      <Tabs items={items} />
    </Space>
  );
}
