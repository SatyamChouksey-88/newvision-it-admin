import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Form, Input, Popconfirm, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { DataGrid } from '../../components/DataGrid/DataGrid';
import { apiErrorMessage, httpClient } from '../../providers/axios';

interface DepartmentRow {
  id: number;
  name: string;
  description?: string | null;
  employeeCount: number;
}

/** Settings → Departments (B8) — full CRUD already existed on the backend; this was the missing UI. */
export function DepartmentsPanel() {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.get('/departments', { params: { _start: 0, _end: 200 } });
      setRows(data.data ?? []);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not load departments'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = async () => {
    let v: { name: string; description?: string };
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const payload = { name: v.name.trim(), description: v.description?.trim() || undefined };
      if (editingId) {
        await httpClient.put(`/departments/${editingId}`, payload);
        message.success('Department updated');
      } else {
        await httpClient.post('/departments', payload);
        message.success('Department created');
      }
      form.resetFields();
      setEditingId(null);
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not save department'));
    } finally {
      setSaving(false);
    }
  };

  const edit = (row: DepartmentRow) => {
    setEditingId(row.id);
    form.setFieldsValue({ name: row.name, description: row.description ?? '' });
  };

  const remove = async (row: DepartmentRow) => {
    try {
      await httpClient.delete(`/departments/${row.id}`);
      message.success('Department deleted');
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not delete department'));
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Departments group employees for reporting and asset assignment. Deleting one is blocked
        while employees or assets still reference it.
      </Typography.Paragraph>

      <Form form={form} layout="inline" style={{ rowGap: 8 }}>
        <Form.Item name="name" rules={[{ required: true, min: 2 }]} style={{ marginBottom: 8 }}>
          <Input placeholder="Name (Engineering)" aria-label="Department name" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="description" style={{ marginBottom: 8 }}>
          <Input placeholder="Description (optional)" aria-label="Department description" style={{ width: 260 }} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 8 }}>
          <Space>
            <Button type="primary" onClick={() => void submit()} loading={saving}>
              {editingId ? 'Save changes' : 'Add department'}
            </Button>
            {editingId ? (
              <Button
                onClick={() => {
                  setEditingId(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            ) : null}
          </Space>
        </Form.Item>
      </Form>

      <DataGrid<DepartmentRow>
        tableKey="departments"
        rowKey="id"
        dataSource={rows}
        loading={loading}
        density="Compact"
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Description', dataIndex: 'description', render: (v) => v || '—' },
          { title: 'Employees', dataIndex: 'employeeCount', width: 110 },
          {
            title: '',
            gridKey: 'actions',
            width: 90,
            render: (_, row) => (
              <Space size={4}>
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  aria-label={`Edit ${row.name}`}
                  onClick={() => edit(row)}
                />
                <Popconfirm
                  title="Delete this department?"
                  onConfirm={() => void remove(row)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Delete ${row.name}`} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );
}
