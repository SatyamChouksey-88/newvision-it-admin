import { App as AntdApp, Button, Form, Input, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid } from '../../components/DataGrid/DataGrid';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { AssetCategory } from '../../types';

/** IT Admin: create LAP/MON/… codes needed before the first asset. */
export function CategoriesPanel() {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<AssetCategory[]>([]);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.get('/asset-categories', { params: { _start: 0, _end: 200 } });
      setRows(data.data ?? []);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not load categories'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async () => {
    let v: { code: string; name: string; description?: string };
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await httpClient.post('/asset-categories', {
        code: v.code.trim().toUpperCase(),
        name: v.name.trim(),
        description: v.description?.trim() || undefined,
      });
      message.success('Category created');
      form.resetFields();
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not create category'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Asset codes like <code>LAP</code> and <code>MON</code> are required when creating a serialized
        asset. Seeded demos already have these; a migrate-only install starts empty.
      </Typography.Paragraph>

      <Form form={form} layout="inline" style={{ rowGap: 8 }}>
        <Form.Item name="code" rules={[{ required: true, min: 2, max: 6 }]} style={{ marginBottom: 8 }}>
          <Input placeholder="Code (LAP)" maxLength={6} aria-label="Category code" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="name" rules={[{ required: true, min: 2 }]} style={{ marginBottom: 8 }}>
          <Input placeholder="Name (Laptop)" aria-label="Category name" style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="description" style={{ marginBottom: 8 }}>
          <Input placeholder="Description (optional)" aria-label="Category description" style={{ width: 240 }} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 8 }}>
          <Button type="primary" onClick={() => void create()} loading={saving}>
            Add category
          </Button>
        </Form.Item>
      </Form>

      <DataGrid<AssetCategory>
        tableKey="asset-categories"
        rowKey="id"
        dataSource={rows}
        loading={loading}
        density="Compact"
        columns={[
          {
            title: 'Code',
            dataIndex: 'code',
            width: 100,
            render: (v: string) => (
              <Space size={4}>
                {v}
                <CopyButton value={v} label="category code" />
              </Space>
            ),
          },
          { title: 'Name', dataIndex: 'name' },
          {
            title: 'Description',
            dataIndex: 'description',
            render: (v: string | undefined) => v || '—',
          },
        ]}
      />
    </Space>
  );
}
