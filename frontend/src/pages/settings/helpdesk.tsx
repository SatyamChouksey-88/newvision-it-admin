import { Button, Card, Form, Input, Popconfirm, Select, Skeleton, Space, Table, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { useToast } from '../../components/Toast';
import type { CannedResponse, TicketCategory, TicketTemplate } from '../../types';

export function HelpdeskSettings() {
  const toast = useToast();
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [ready, setReady] = useState(false);
  const [targets, setTargets] = useState<{ priority: string; targetMinutes: number | null }[]>([]);
  const [inbox, setInbox] = useState<{
    configured: boolean;
    mailbox: string;
    lastCheckedAt?: string | null;
    lastMessageCount?: number;
    lastError?: string | null;
  } | null>(null);
  const [cannedForm] = Form.useForm();
  const [tplForm] = Form.useForm();

  const load = useCallback(async () => {
    try {
      const [c, t, cat, sla, mail] = await Promise.all([
        httpClient.get('/canned-responses'),
        httpClient.get('/ticket-templates'),
        httpClient.get('/ticket-categories'),
        httpClient.get('/ticket-priority-targets').catch(() => ({ data: [] })),
        httpClient.get('/email-in/status').catch(() => ({ data: null })),
      ]);
      setCanned(Array.isArray(c.data) ? c.data : []);
      setTemplates(Array.isArray(t.data) ? t.data : []);
      setCategories(Array.isArray(cat.data) ? cat.data : []);
      setTargets(Array.isArray(sla.data) ? sla.data : []);
      setInbox(mail.data ?? null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready) {
    return (
      <Card size="small">
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={5}>First-response targets</Typography.Title>
        <Typography.Paragraph type="secondary">
          Visual overdue labels only — not a full SLA engine. The clock pauses while a ticket is waiting on the
          employee.
        </Typography.Paragraph>
        <Table
          rowKey="priority"
          size="small"
          pagination={false}
          dataSource={targets}
          columns={[
            { title: 'Priority', dataIndex: 'priority' },
            {
              title: 'Target (minutes)',
              render: (_, r) => (
                <Input
                  defaultValue={r.targetMinutes ?? ''}
                  onBlur={async (e) => {
                    const n = e.target.value.trim() === '' ? null : Number(e.target.value);
                    await httpClient.put('/ticket-priority-targets', {
                      targets: [{ priority: r.priority, targetMinutes: Number.isFinite(n as number) ? n : null }],
                    });
                    void load();
                  }}
                />
              ),
            },
          ]}
        />
      </div>
      {inbox ? (
        <div>
          <Typography.Title level={5}>Email-in mailbox</Typography.Title>
          <Typography.Paragraph type="secondary">
            Shared helpdesk address: <code>{inbox.mailbox}</code>.{' '}
            {inbox.configured ? 'Ingest is configured.' : 'Not configured — the poller is idle (safe for local dev).'}
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary">
            Last checked: {inbox.lastCheckedAt ? new Date(inbox.lastCheckedAt).toLocaleString() : 'never'}
            {inbox.lastMessageCount != null ? ` · ${inbox.lastMessageCount} imported` : ''}
            {inbox.lastError ? ` · ${inbox.lastError}` : ''}
          </Typography.Paragraph>
          <Button
            size="small"
            onClick={async () => {
              try {
                const { data } = await httpClient.post('/email-in/test');
                toast.success(data.message ?? 'Checked');
              } catch (e) {
                toast.error(apiErrorMessage(e, 'Connection check failed'));
              }
            }}
          >
            Test connection
          </Button>
        </div>
      ) : null}
      <div>
        <Typography.Title level={5}>Canned responses</Typography.Title>
        <Typography.Paragraph type="secondary">
          Optional After send sets the ticket to waiting on the employee or resolved when the snippet is used as a
          public reply.
        </Typography.Paragraph>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'No canned responses yet.' }}
          dataSource={canned}
          columns={[
            { title: 'Title', dataIndex: 'title' },
            { title: 'Body', dataIndex: 'body', ellipsis: true },
            {
              title: 'After send',
              dataIndex: 'statusOnSend',
              render: (v: CannedResponse['statusOnSend']) =>
                v === 'waiting_on_employee' ? 'Wait on employee' : v === 'resolved' ? 'Resolve' : '—',
            },
            {
              title: '',
              render: (_, r) => (
                <Popconfirm
                  title="Delete this snippet?"
                  onConfirm={async () => {
                    await httpClient.delete(`/canned-responses/${r.id}`);
                    void load();
                  }}
                >
                  <Button size="small" danger>
                    Delete
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
        <Form
          form={cannedForm}
          layout="inline"
          style={{ marginTop: 12 }}
          onFinish={async (v) => {
            try {
              await httpClient.post('/canned-responses', v);
              cannedForm.resetFields();
              void load();
            } catch (e) {
              toast.error(apiErrorMessage(e, 'Could not save'));
            }
          }}
        >
          <Form.Item name="title" rules={[{ required: true }]}>
            <Input placeholder="Title" />
          </Form.Item>
          <Form.Item name="body" rules={[{ required: true }]}>
            <Input placeholder="Body" style={{ minWidth: 280 }} />
          </Form.Item>
          <Form.Item name="statusOnSend">
            <Select
              allowClear
              placeholder="After send (optional)"
              aria-label="Status after sending this canned reply"
              style={{ minWidth: 200 }}
              options={[
                { label: 'Wait on employee', value: 'waiting_on_employee' },
                { label: 'Resolve', value: 'resolved' },
              ]}
            />
          </Form.Item>
          <Button htmlType="submit" type="primary">
            Add
          </Button>
        </Form>
      </div>
      <div>
        <Typography.Title level={5}>Ticket templates</Typography.Title>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'No templates yet.' }}
          dataSource={templates}
          columns={[
            { title: 'Title', dataIndex: 'title' },
            { title: 'Subject', dataIndex: 'subject' },
            {
              title: '',
              render: (_, r) => (
                <Popconfirm
                  title="Delete this template?"
                  onConfirm={async () => {
                    await httpClient.delete(`/ticket-templates/${r.id}`);
                    void load();
                  }}
                >
                  <Button size="small" danger>
                    Delete
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
        <Form
          form={tplForm}
          layout="vertical"
          style={{ marginTop: 12, maxWidth: 480 }}
          onFinish={async (v) => {
            try {
              await httpClient.post('/ticket-templates', v);
              tplForm.resetFields();
              void load();
            } catch (e) {
              toast.error(apiErrorMessage(e, 'Could not save'));
            }
          }}
        >
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
            <Select options={categories.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Button htmlType="submit" type="primary">
            Add template
          </Button>
        </Form>
      </div>
    </Space>
  );
}
