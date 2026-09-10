import { Descriptions, Popover, Typography } from 'antd';
import { Link } from 'react-router';
import type { Employee } from '../types';

export function ContactCard({
  name,
  employee,
  email,
  children,
}: {
  name: string;
  employee?: Pick<Employee, 'id' | 'email' | 'department' | 'location' | 'employeeCode'> | null;
  email?: string | null;
  children?: React.ReactNode;
}) {
  const content = (
    <Descriptions size="small" column={1} style={{ maxWidth: 280 }} data-testid="contact-card">
      <Descriptions.Item label="Email">{employee?.email ?? email ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="Department">{employee?.department?.name ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="Location">{employee?.location?.name ?? '—'}</Descriptions.Item>
      {employee?.id ? (
        <Descriptions.Item label="Profile">
          <Link to={`/employees/show/${employee.id}`}>Open employee profile</Link>
        </Descriptions.Item>
      ) : null}
    </Descriptions>
  );
  return (
    <Popover content={content} trigger="click" title={name}>
      <Typography.Link data-testid="contact-trigger">{children ?? name}</Typography.Link>
    </Popover>
  );
}
