import { Button, Card, Checkbox, Form, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { httpClient, apiErrorMessage } from '../../providers/axios';
import { useToast } from '../../components/Toast';

type CustomRoleRow = {
  id: number;
  key: string;
  label: string;
  description: string | null;
  isActive: boolean;
  permissions: string[];
};

export function CustomRolesPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<CustomRoleRow[]>([]);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CustomRoleRow | null>(null);
  const [form] = Form.useForm<{ key: string; label: string; description?: string; permissions: string[] }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, catRes] = await Promise.all([
        httpClient.get<CustomRoleRow[]>('/custom-roles'),
        httpClient.get<{ permissions: string[] }>('/custom-roles/permission-catalog'),
      ]);
      setRows(listRes.data);
      setCatalog(catRes.data.permissions);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load custom roles'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ permissions: [] });
    setEditorOpen(true);
  };

  const openEdit = (row: CustomRoleRow) => {
    setEditing(row);
    form.setFieldsValue({
      key: row.key,
      label: row.label,
      description: row.description ?? '',
      permissions: row.permissions,
    });
    setEditorOpen(true);
  };

  const save = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await httpClient.put(`/custom-roles/${editing.id}`, {
          label: values.label,
          description: values.description,
          permissions: values.permissions,
        });
        toast.success('Custom role updated');
      } else {
        await httpClient.post('/custom-roles', values);
        toast.success('Custom role created');
      }
      setEditorOpen(false);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save custom role'));
    }
  };

  const columns = useMemo(
    () => [
      { title: 'Label', dataIndex: 'label', key: 'label' },
      { title: 'Key', dataIndex: 'key', key: 'key', render: (k: string) => <Tag>{k}</Tag> },
      {
        title: 'Permissions',
        key: 'permissions',
        render: (_: unknown, r: CustomRoleRow) => r.permissions.length,
      },
      {
        title: '',
        key: 'actions',
        render: (_: unknown, r: CustomRoleRow) => (
          <Button type="link" onClick={() => openEdit(r)}>Edit</Button>
        ),
      },
    ],
    [],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary">
        Custom roles define the permission checklist for assigned users in the UI and on API routes.
        Users keep their system role for display and reporting; access is enforced by effective
        permissions.
      </Typography.Paragraph>
      <Card
        size="small"
        title="Custom roles"
        extra={
          <Button type="primary" onClick={openCreate}>
            New custom role
          </Button>
        }
      >
        <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={false} />
      </Card>
      <Modal
        open={editorOpen}
        title={editing ? 'Edit custom role' : 'New custom role'}
        onCancel={() => setEditorOpen(false)}
        onOk={() => void save()}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editing ? (
            <Form.Item
              name="key"
              label="Key"
              rules={[
                { required: true },
                {
                  pattern: /^[a-z0-9][a-z0-9_-]*$/,
                  message: 'Lowercase letters, numbers, hyphens, underscores',
                },
              ]}
            >
              <Input placeholder="helpdesk-lead" />
            </Form.Item>
          ) : null}
          <Form.Item name="label" label="Display name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="permissions" label="Permissions" rules={[{ required: true }]}>
            <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflow: 'auto' }}>
              {catalog.map((p) => (
                <Checkbox key={p} value={p}>{p}</Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
