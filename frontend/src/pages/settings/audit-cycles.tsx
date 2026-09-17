import { Button, Card, Form, Input, Space, Table, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { useToast } from '../../components/Toast';

type Cycle = {
  id: number;
  name: string;
  status: string;
  scopeNote?: string | null;
  _count?: { findings: number };
};

export function AuditCyclesPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.get('/audit-cycles', { params: { _start: 0, _end: 50 } });
      setRows(data.data ?? data);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load audit cycles'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (values: { name: string; scopeNote?: string }) => {
    try {
      await httpClient.post('/audit-cycles', values);
      form.resetFields();
      toast.success('Audit cycle created');
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not create cycle'));
    }
  };

  const transition = async (id: number, action: 'start' | 'close') => {
    try {
      await httpClient.post(`/audit-cycles/${id}/${action}`);
      toast.success(action === 'start' ? 'Cycle started' : 'Cycle closed');
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, `Could not ${action} cycle`));
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary">
        Formal audit cycles complement QR scans and reconciliation — track findings and sign-off.
      </Typography.Paragraph>
      <Card size="small" title="New cycle">
        <Form form={form} layout="vertical" onFinish={(v) => void create(v)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Q3 2026 — Pune laptops" />
          </Form.Item>
          <Form.Item name="scopeNote" label="Scope note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit">Create draft</Button>
        </Form>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s: string) => <Tag>{s}</Tag>,
          },
          {
            title: 'Findings',
            render: (_, r) => r._count?.findings ?? 0,
          },
          {
            title: 'Actions',
            render: (_, r) => (
              <Space>
                {r.status === 'draft' ? (
                  <Button size="small" onClick={() => void transition(r.id, 'start')}>Start</Button>
                ) : null}
                {r.status !== 'closed' ? (
                  <Button size="small" onClick={() => void transition(r.id, 'close')}>Close</Button>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );
}
