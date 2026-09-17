import { Button, Card, Form, Input, Space, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { useToast } from '../../components/Toast';

type ClientRow = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  _count?: { vdiEnvironments: number; tickets: number };
};

export function ClientsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.get('/clients', { params: { _start: 0, _end: 100 } });
      setRows(data.data ?? data);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load clients'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (values: { code: string; name: string }) => {
    try {
      await httpClient.post('/clients', values);
      form.resetFields();
      toast.success('Client created');
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not create client'));
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3}>Client accounts</Typography.Title>
      <Typography.Paragraph type="secondary">
        MSP-style client codes for VDI tickets and reporting. Assign employees from the employee profile API.
      </Typography.Paragraph>
      <Card size="small" title="Add client">
        <Form form={form} layout="inline" onFinish={(v) => void create(v)}>
          <Form.Item name="code" rules={[{ required: true, message: 'Code' }]}>
            <Input placeholder="Code" aria-label="Client code" />
          </Form.Item>
          <Form.Item name="name" rules={[{ required: true, message: 'Name' }]}>
            <Input placeholder="Display name" aria-label="Client name" />
          </Form.Item>
          <Button type="primary" htmlType="submit">Create</Button>
        </Form>
      </Card>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          { title: 'Code', dataIndex: 'code' },
          { title: 'Name', dataIndex: 'name' },
          {
            title: 'VDI pools',
            render: (_, r) => r._count?.vdiEnvironments ?? 0,
          },
          {
            title: 'Tickets',
            render: (_, r) => r._count?.tickets ?? 0,
          },
        ]}
      />
    </Space>
  );
}
