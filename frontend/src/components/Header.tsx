import { BookOutlined, LogoutOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { AutoComplete, Avatar, Button, Input, Layout, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Identity } from '../providers/authProvider';
import { httpClient } from '../providers/axios';
import { NotificationBell } from './NotificationBell';

interface Option {
  value: string;
  label: React.ReactNode;
  onSelect: () => void;
}

export function Header() {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const [options, setOptions] = useState<Option[]>([]);
  const [value, setValue] = useState('');

  const runSearch = async (q: string) => {
    setValue(q);
    if (q.trim().length < 2) {
      setOptions([]);
      return;
    }
    const { data } = await httpClient.get('/search', { params: { q } });
    const assetOpts: Option[] = (data.assets ?? []).slice(0, 6).map((a: any) => ({
      value: `asset-${a.id}`,
      label: (
        <span>
          <Tag color="blue">Asset</Tag> {a.assetCode} — {a.brand ?? ''} {a.model ?? ''}
        </span>
      ),
      onSelect: () => navigate(`/assets/show/${a.id}`),
    }));
    const empOpts: Option[] = (data.employees ?? []).slice(0, 6).map((e: any) => ({
      value: `emp-${e.id}`,
      label: (
        <span>
          <Tag color="green">Employee</Tag> {e.firstName} {e.lastName} ({e.employeeCode})
        </span>
      ),
      onSelect: () => navigate(`/employees/show/${e.id}`),
    }));
    setOptions([...assetOpts, ...empOpts]);
  };

  return (
    <Layout.Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        height: 56,
      }}
    >
      <AutoComplete
        style={{ width: 420, maxWidth: '50vw' }}
        options={options}
        value={value}
        onSearch={runSearch}
        onSelect={(_v, option) => {
          (option as unknown as Option).onSelect();
          setValue('');
          setOptions([]);
        }}
      >
        <Input
          id="global-search-input"
          size="middle"
          prefix={<SearchOutlined />}
          placeholder="Search asset code, serial, employee, model, location… (press /)"
          aria-label="Global search"
          allowClear
        />
      </AutoComplete>

      <Space size="middle">
        <Button
          size="small"
          icon={<BookOutlined />}
          onClick={() => navigate('/help')}
          aria-label="Help and documentation"
        >
          Help
        </Button>
        <NotificationBell />
        <Space size={8}>
          <Avatar size="small" icon={<UserOutlined />} />
          <div style={{ lineHeight: 1.2 }}>
            <Typography.Text style={{ fontSize: 13 }}>{identity?.fullName}</Typography.Text>
            <div style={{ fontSize: 11, color: '#595959' }}>{identity?.role}</div>
          </div>
        </Space>
        <Button
          size="small"
          icon={<LogoutOutlined />}
          onClick={() => logout()}
          data-testid="logout-button"
        >
          Logout
        </Button>
      </Space>
    </Layout.Header>
  );
}
