import { useGetIdentity } from '@refinedev/core';
import { Card, Descriptions, Radio, Space, Tabs, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Identity } from '../providers/authProvider';
import { httpClient } from '../providers/axios';
import { useToast } from '../components/Toast';
import { CategoriesPanel } from './settings/categories';
import { ChangePasswordCard } from './settings/change-password';
import { DepartmentsPanel } from './settings/departments';
import { HelpdeskSettings } from './settings/helpdesk';
import { ImportJobsPanel } from './settings/import-jobs';
import { ReconciliationPanel } from './settings/reconciliation';
import { UsersPanel } from './settings/users';
import { WebhooksPanel } from './settings/webhooks';

const GOVERNANCE_ROLES = ['SUPER_ADMIN', 'IT_ADMIN'];
const TICKET_STAFF = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT'];

export function SettingsPage() {
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [params, setParams] = useSearchParams();
  const [pref, setPref] = useState<'immediate' | 'daily_digest'>('immediate');
  const canGovern = GOVERNANCE_ROLES.includes(identity?.role ?? '');
  const isTicketStaff = TICKET_STAFF.includes(identity?.role ?? '');
  const isSuperAdmin = identity?.role === 'SUPER_ADMIN';

  useEffect(() => {
    httpClient
      .get('/auth/me')
      .then(({ data }) => {
        setPermissions(data.permissions ?? []);
        if (data.emailNotifyPref) setPref(data.emailNotifyPref);
      })
      .catch(() => setPermissions([]));
  }, []);

  const savePref = useCallback(async (next: 'immediate' | 'daily_digest') => {
    try {
      await httpClient.patch('/support-tickets/notify-pref', { pref: next });
      setPref(next);
      toast.success(next === 'daily_digest' ? 'Daily digest enabled' : 'Immediate email enabled');
    } catch {
      toast.error('Could not save preference');
    }
  }, [toast]);

  const items = useMemo(
    () => [
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
            {isTicketStaff ? (
              <Card size="small" title="Ticket email notifications">
                <Typography.Paragraph type="secondary">
                  In-app notifications always arrive immediately. This only changes how often you get email.
                </Typography.Paragraph>
                <Radio.Group
                  value={pref}
                  onChange={(e) => void savePref(e.target.value as 'immediate' | 'daily_digest')}
                >
                  <Radio value="immediate">Immediate</Radio>
                  <Radio value="daily_digest">Daily digest</Radio>
                </Radio.Group>
              </Card>
            ) : null}
            <ChangePasswordCard />
          </Space>
        ),
      },
      ...(isTicketStaff ? [{ key: 'helpdesk', label: 'Helpdesk', children: <HelpdeskSettings /> }] : []),
      ...(canGovern
        ? [
            { key: 'categories', label: 'Categories', children: <CategoriesPanel /> },
            { key: 'departments', label: 'Departments', children: <DepartmentsPanel /> },
            { key: 'imports', label: 'Import jobs', children: <ImportJobsPanel /> },
            { key: 'reconcile', label: 'Reconciliation', children: <ReconciliationPanel /> },
            { key: 'webhooks', label: 'Webhooks', children: <WebhooksPanel /> },
          ]
        : []),
      ...(isSuperAdmin ? [{ key: 'users', label: 'Users', children: <UsersPanel /> }] : []),
    ],
    [canGovern, isTicketStaff, isSuperAdmin, identity, permissions, pref, savePref],
  );

  const allowed = useMemo(() => new Set(items.map((i) => i.key)), [items]);
  const requested = params.get('tab') ?? 'account';
  const tab = allowed.has(requested) ? requested : 'account';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Settings
      </Typography.Title>
      <Tabs
        activeKey={tab}
        onChange={(key) => {
          const next = new URLSearchParams(params);
          if (key === 'account') next.delete('tab');
          else next.set('tab', key);
          setParams(next, { replace: true });
        }}
        items={items}
      />
    </Space>
  );
}
