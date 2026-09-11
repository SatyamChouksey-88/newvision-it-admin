import { Button, Card, Form, Input, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { useToast } from '../../components/Toast';

interface Kit {
  id: number;
  name: string;
  categoryId: number;
  locationId?: number | null;
  notes?: string | null;
  category?: { name: string };
  location?: { name: string } | null;
  accessories?: { accessoryId: number; accessory?: { name: string } }[];
}

export function IssueKitsPanel() {
  const toast = useToast();
  const [kits, setKits] = useState<Kit[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string; code: string }[]>([]);
  const [accessories, setAccessories] = useState<{ id: number; name: string }[]>([]);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    const [k, c, l, a] = await Promise.all([
      httpClient.get('/issue-kits'),
      httpClient.get('/asset-categories', { params: { _start: 0, _end: 100 } }),
      httpClient.get('/locations', { params: { _start: 0, _end: 50 } }),
      httpClient.get('/accessories', { params: { _start: 0, _end: 100 } }),
    ]);
    setKits(Array.isArray(k.data) ? k.data : []);
    setCategories(c.data.data ?? c.data ?? []);
    setLocations(l.data.data ?? l.data ?? []);
    setAccessories(a.data.data ?? a.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary">
        A kit picks the next available asset in a category (and optional site) and checks out the
        listed accessories in one step. Issue from the employee profile runbook.
      </Typography.Paragraph>
      <Card size="small" title="New kit">
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            try {
              await httpClient.post('/issue-kits', v);
              toast.success('Kit saved');
              form.resetFields();
              void load();
            } catch (e) {
              toast.error(apiErrorMessage(e, 'Could not save kit'));
            }
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Pune laptop standard" />
          </Form.Item>
          <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
            <Select options={categories.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="locationId" label="Location (optional)">
            <Select
              allowClear
              options={locations.map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
            />
          </Form.Item>
          <Form.Item name="accessoryIds" label="Default accessories">
            <Select
              mode="multiple"
              options={accessories.map((a) => ({ label: a.name, value: a.id }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Save kit
          </Button>
        </Form>
      </Card>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={kits}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Category', render: (_, r) => r.category?.name },
          { title: 'Location', render: (_, r) => r.location?.name ?? 'Any' },
          {
            title: 'Accessories',
            render: (_, r) => r.accessories?.map((a) => a.accessory?.name).filter(Boolean).join(', ') || '—',
          },
          {
            title: '',
            render: (_, r) => (
              <Popconfirm
                title="Delete this kit?"
                onConfirm={async () => {
                  await httpClient.delete(`/issue-kits/${r.id}`);
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
    </Space>
  );
}
