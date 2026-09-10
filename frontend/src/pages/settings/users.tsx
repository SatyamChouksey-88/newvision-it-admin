import { KeyOutlined, PlusOutlined } from '@ant-design/icons';
import {
  App as AntdApp,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { DataGrid } from '../../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { apiErrorMessage, httpClient } from '../../providers/axios';

interface UserRow {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  employee: { id: number; firstName: string; lastName: string; employeeCode: string } | null;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'IT Admin', value: 'IT_ADMIN' },
  { label: 'IT Support', value: 'IT_SUPPORT' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Employee', value: 'EMPLOYEE' },
];

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: 'purple',
  IT_ADMIN: 'blue',
  IT_SUPPORT: 'cyan',
  MANAGER: 'gold',
  EMPLOYEE: 'default',
};

/** Settings → Users (Super Admin only). Only Super Admin can create IT Admins and other roles. */
export function UsersPanel() {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string>('EMPLOYEE');
  const [employeeId, setEmployeeId] = useState<number | undefined>();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.get('/users', { params: { _start: 0, _end: 200 } });
      setRows(data.data ?? []);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not load users'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async () => {
    if (!email || !fullName) {
      message.error('Email and name are required');
      return;
    }
    setSaving(true);
    try {
      await httpClient.post('/users', { email, fullName, role, employeeId });
      message.success('Login created — they will get an email to set their password.');
      setCreateOpen(false);
      setEmail('');
      setFullName('');
      setRole('EMPLOYEE');
      setEmployeeId(undefined);
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not create the login'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: UserRow) => {
    try {
      await httpClient.put(`/users/${row.id}`, { isActive: !row.isActive });
      message.success(row.isActive ? 'Login deactivated' : 'Login activated');
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not update the login'));
    }
  };

  const changeRole = async (row: UserRow, next: string) => {
    try {
      await httpClient.put(`/users/${row.id}`, { role: next });
      message.success('Role changed');
      void reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not change role'));
    }
  };

  const resetPassword = async (row: UserRow) => {
    try {
      await httpClient.post(`/users/${row.id}/reset-password`, {});
      message.success(`Reset link emailed to ${row.email}`);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not send reset link'));
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Role hierarchy (only Super Admin can create or promote logins): Super Admin → IT Admin →
        IT Support → Manager → Employee. IT Admin cannot create Super Admin. New logins get an
        email to set their own password.
      </Typography.Paragraph>
      <div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Create a login
        </Button>
      </div>

      <DataGrid<UserRow>
        tableKey="users"
        rowKey="id"
        dataSource={rows}
        loading={loading}
        density="Compact"
        columns={[
          { title: 'Email', dataIndex: 'email' },
          { title: 'Name', dataIndex: 'fullName' },
          {
            title: 'Employee',
            gridKey: 'employee',
            render: (_, r) => (r.employee ? `${r.employee.firstName} ${r.employee.lastName} (${r.employee.employeeCode})` : '—'),
          },
          {
            title: 'Role',
            dataIndex: 'role',
            render: (_, r) => (
              <Select
                size="small"
                value={r.role}
                style={{ width: 130 }}
                options={ROLE_OPTIONS}
                onChange={(v) => void changeRole(r, v)}
                aria-label={`Role for ${r.email}`}
                labelRender={() => <Tag color={ROLE_COLOR[r.role]}>{r.role.replaceAll('_', ' ')}</Tag>}
              />
            ),
          },
          {
            title: 'Active',
            dataIndex: 'isActive',
            width: 90,
            render: (_, r) => (
              <Switch checked={r.isActive} onChange={() => void toggleActive(r)} aria-label={`Active status for ${r.email}`} />
            ),
          },
          {
            title: '',
            gridKey: 'actions',
            width: 80,
            render: (_, r) => (
              <Button
                size="small"
                type="text"
                icon={<KeyOutlined />}
                aria-label={`Reset password for ${r.email}`}
                onClick={() => void resetPassword(r)}
              />
            ),
          },
        ]}
      />

      <Modal
        title="Create a login"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void create()}
        confirmLoading={saving}
        okText="Create login"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong style={{ fontSize: 12 }}>Work email</Typography.Text>
            <Input
              style={{ width: '100%', marginTop: 4 }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@newvision.local"
              aria-label="Work email"
            />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 12 }}>Full name</Typography.Text>
            <Input
              style={{ width: '100%', marginTop: 4 }}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-label="Full name"
            />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 12 }}>Role</Typography.Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={role} options={ROLE_OPTIONS} onChange={setRole} />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 12 }}>Link to employee (optional)</Typography.Text>
            <div style={{ marginTop: 4 }}>
              <EmployeeSelect value={employeeId} onChange={setEmployeeId} placeholder="Search employees" />
            </div>
          </div>
        </Space>
      </Modal>
    </Space>
  );
}
