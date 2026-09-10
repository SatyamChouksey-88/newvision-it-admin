import { BookOutlined, LogoutOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { AutoComplete, Avatar, Button, Input, Layout, Space, Tag, Typography } from 'antd';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import type { Identity } from '../providers/authProvider';
import { httpClient } from '../providers/axios';
import { COLOR_BORDER, COLOR_TEXT_MUTED } from '../theme';
import { NotificationBell } from './NotificationBell';

interface Option {
  value: string;
  label: React.ReactNode;
  onSelect: () => void;
}

interface SearchAsset {
  id: number;
  assetCode: string;
  brand?: string | null;
  model?: string | null;
}
interface SearchEmployee {
  id: number;
  firstName: string;
  lastName: string;
  employeeCode: string;
}
interface SearchTicket {
  id: number;
  issue: string;
  status: string;
  asset?: { id: number; assetCode: string } | null;
}
interface SearchLocation {
  id: number;
  code: string;
  name: string;
}

export function Header() {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const [options, setOptions] = useState<Option[]>([]);
  const [value, setValue] = useState('');
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  const fetchResults = async (q: string) => {
    const mine = ++seq.current;
    setSearching(true);
    try {
      const { data } = await httpClient.get('/search', { params: { q } });
      if (mine !== seq.current) return; // stale response — a newer query is in flight
      const assetOpts: Option[] = (data.assets ?? []).slice(0, 6).map((a: SearchAsset) => ({
        value: `asset-${a.id}`,
        label: (
          <span>
            <Tag color="blue">Asset</Tag> {a.assetCode} — {a.brand ?? ''} {a.model ?? ''}
          </span>
        ),
        onSelect: () => navigate(`/assets/show/${a.id}`),
      }));
      const empOpts: Option[] = (data.employees ?? []).slice(0, 6).map((e: SearchEmployee) => ({
        value: `emp-${e.id}`,
        label: (
          <span>
            <Tag color="green">Employee</Tag> {e.firstName} {e.lastName} ({e.employeeCode})
          </span>
        ),
        onSelect: () => navigate(`/employees/show/${e.id}`),
      }));
      const ticketOpts: Option[] = (data.tickets ?? []).slice(0, 4).map((t: SearchTicket) => ({
        value: `ticket-${t.id}`,
        label: (
          <span>
            <Tag color="orange">Ticket</Tag> #{t.id} {t.asset?.assetCode ?? ''} — {t.issue}
          </span>
        ),
        onSelect: () =>
          navigate(
            `/maintenance?filters[0][field]=q&filters[0][operator]=contains&filters[0][value]=${t.id}`,
          ),
      }));
      const locOpts: Option[] = (data.locations ?? []).slice(0, 3).map((l: SearchLocation) => ({
        value: `loc-${l.id}`,
        label: (
          <span>
            <Tag>Location</Tag> {l.name} ({l.code})
          </span>
        ),
        onSelect: () =>
          navigate(
            `/assets?filters[0][field]=locationId&filters[0][operator]=eq&filters[0][value]=${l.id}`,
          ),
      }));
      const all = [...assetOpts, ...empOpts, ...ticketOpts, ...locOpts];
      setOptions(
        all.length
          ? all
          : [
              {
                value: '__none',
                label: <Typography.Text type="secondary">No matches for “{q}”</Typography.Text>,
                onSelect: () => undefined,
              },
            ],
      );
    } catch {
      if (mine === seq.current) setOptions([]);
    } finally {
      if (mine === seq.current) setSearching(false);
    }
  };
  const debouncedFetch = useDebouncedCallback((q: string) => void fetchResults(q), 250);

  const runSearch = (q: string) => {
    setValue(q);
    if (q.trim().length < 2) {
      debouncedFetch.cancel();
      seq.current++;
      setOptions([]);
      setSearching(false);
      return;
    }
    debouncedFetch(q.trim());
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
        gap: 12,
        padding: '0 20px',
        background: '#fff',
        borderBottom: `1px solid ${COLOR_BORDER}`,
        height: 56,
      }}
    >
      <AutoComplete
        className="nv-header-search"
        style={{ flex: '1 1 420px', maxWidth: 480 }}
        options={options}
        value={value}
        onSearch={runSearch}
        onSelect={(_v, option) => {
          const opt = option as unknown as Option;
          if (opt.value === '__none') return;
          opt.onSelect();
          setValue('');
          setOptions([]);
        }}
      >
        <Input
          id="global-search-input"
          size="middle"
          prefix={<SearchOutlined style={{ color: COLOR_TEXT_MUTED }} />}
          placeholder="Search assets, employees, tickets…"
          aria-label="Global search"
          aria-busy={searching}
          allowClear
          suffix={
            <Typography.Text type="secondary" style={{ fontSize: 11, userSelect: 'none' }}>
              /
            </Typography.Text>
          }
        />
      </AutoComplete>

      <Space size="middle" wrap={false} style={{ flexShrink: 0 }}>
        <Button
          size="middle"
          icon={<BookOutlined />}
          onClick={() => navigate('/help')}
          aria-label="Help and documentation"
          className="nv-header-action-text"
        >
          Help
        </Button>
        <NotificationBell />
        <Space size={8}>
          <Avatar size="small" icon={<UserOutlined />} style={{ background: '#0958d9' }} />
          <div style={{ lineHeight: 1.25 }} className="nv-header-profile">
            <Typography.Text style={{ fontSize: 13, fontWeight: 500 }}>
              {identity?.fullName}
            </Typography.Text>
            <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>{identity?.role}</div>
          </div>
        </Space>
        <Button
          size="middle"
          icon={<LogoutOutlined />}
          onClick={() => logout()}
          data-testid="logout-button"
          style={{ flexShrink: 0 }}
        >
          <span className="nv-header-action-text">Logout</span>
        </Button>
      </Space>
    </Layout.Header>
  );
}
