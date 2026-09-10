import { Button, Form, Input, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { useToast } from '../../components/Toast';
import type { CannedResponse, TicketCategory, TicketTemplate } from '../../types';

export function HelpdeskSettings() {
  const toast = useToast();
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [cannedForm] = Form.useForm();
  const [tplForm] = Form.useForm();

  const load = useCallback(async () => {
    const [c, t, cat] = await Promise.all([
      httpClient.get('/canned-responses'),
      httpClient.get('/ticket-templates'),
      httpClient.get('/ticket-categories'),
    ]);
    setCanned(Array.isArray(c.data) ? c.data : []);
    setTemplates(Array.isArray(t.data) ? t.data : []);
    setCategories(Array.isArray(cat.data) ? cat.data : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={5}>Canned responses</Typography.Title>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={canned}
          columns={[
            { title: 'Title', dataIndex: 'title' },
            { title: 'Body', dataIndex: 'body', ellipsis: true },
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
