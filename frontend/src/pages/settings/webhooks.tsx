import {
  App as AntdApp,
  Button,
  Checkbox,
  Form,
  Input,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../../providers/axios';

const EVENT_OPTIONS = [
  { label: 'asset.created', value: 'asset.created' },
  { label: 'asset.status_changed', value: 'asset.status_changed' },
];

interface Hook {
  id: number;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  lastStatus?: number | null;
  lastError?: string | null;
}

export function WebhooksPanel() {
  const { message } = AntdApp.useApp();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.get('/webhooks', { params: { _start: 0, _end: 50 } });
      setHooks(data.data ?? []);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not load webhooks'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async () => {
    let v: { url: string; events: string[] };
    try {
      v = await form.validateFields();
    } catch {
      return; // antd already shows field errors
    }
    setSaving(true);
    try {
      const { data } = await httpClient.post('/webhooks', v);
      setRevealedSecret(data.secret);
      message.success('Webhook created — copy the signing secret now');
      form.resetFields();
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not create webhook'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: Hook, isActive: boolean) => {
    // Optimistic flip; revert on failure.
    setHooks((prev) => prev.map((h) => (h.id === row.id ? { ...h, isActive } : h)));
    try {
      await httpClient.put(`/webhooks/${row.id}`, { isActive });
    } catch (e) {
      setHooks((prev) => prev.map((h) => (h.id === row.id ? { ...h, isActive: !isActive } : h)));
      message.error(apiErrorMessage(e, 'Could not update webhook'));
    }
  };

  const remove = async (id: number) => {
    try {
      await httpClient.delete(`/webhooks/${id}`);
      message.success('Webhook removed');
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not remove webhook'));
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        POSTs JSON to your URL on <code>asset.created</code> and <code>asset.status_changed</code>.
        Verify with header <code>X-NewVision-Signature</code> (HMAC-SHA256 of the raw body).
      </Typography.Paragraph>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ events: ['asset.created', 'asset.status_changed'] }}
      >
        <Form.Item name="url" label="Endpoint URL" rules={[{ required: true, type: 'url' }]}>
          <Input placeholder="https://example.com/hooks/newvision" />
        </Form.Item>
        <Form.Item name="events" label="Events" rules={[{ required: true }]}>
          <Checkbox.Group options={EVENT_OPTIONS} />
        </Form.Item>
        <Button type="primary" onClick={create} loading={saving}>
          Add webhook
        </Button>
      </Form>

      {revealedSecret && (
        <Typography.Paragraph>
          Signing secret (shown once):{' '}
          <Typography.Text code copyable>
            {revealedSecret}
          </Typography.Text>
        </Typography.Paragraph>
      )}

      <Table<Hook>
        size="small"
        rowKey="id"
        dataSource={hooks}
        loading={loading}
        locale={{ emptyText: 'No webhooks configured' }}
        columns={[
          { title: 'URL', dataIndex: 'url', ellipsis: true },
          {
            title: 'Events',
            dataIndex: 'events',
            render: (ev: string[]) => ev.map((e) => <Tag key={e}>{e}</Tag>),
          },
          {
            title: 'Active',
            dataIndex: 'isActive',
            render: (v, r) => <Switch size="small" checked={v} onChange={(c) => toggle(r, c)} />,
          },
          {
            title: 'Last',
            render: (_, r) =>
              r.lastError ? (
                <Typography.Text type="danger">{r.lastError}</Typography.Text>
              ) : r.lastStatus ? (
                r.lastStatus
              ) : (
                '—'
              ),
          },
          {
            title: '',
            render: (_, r) => (
              <Popconfirm
                title="Remove this webhook?"
                description="Deliveries to this URL stop immediately."
                okText="Remove"
                okButtonProps={{ danger: true }}
                onConfirm={() => remove(r.id)}
              >
                <Button size="small" danger>
                  Remove
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
    </Space>
  );
}
