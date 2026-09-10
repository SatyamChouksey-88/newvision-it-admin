import { BookOutlined, SearchOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Input, Layout, Space, Tag, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { httpClient } from '../providers/axios';
import { COLOR_BORDER, COLOR_TEXT_MUTED, FONT_MONO } from '../theme';
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

const CRUMBS: Record<string, string> = {
  '/': 'Dashboard',
  '/assets': 'Assets',
  '/employees': 'Employees',
  '/locations': 'Locations',
  '/accessories': 'Accessories',
  '/consumables': 'Consumables',
  '/requests': 'Requests',
  '/maintenance': 'Maintenance',
  '/tickets': 'Support Tickets',
  '/reports': 'Reports',
  '/audit-logs': 'Audit Log',
  '/settings': 'Settings',
  '/help': 'Help',
};

function crumbFor(pathname: string) {
  const hit = Object.keys(CRUMBS)
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)));
  return CRUMBS[hit ?? '/'] ?? 'NewVision';
}

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [options, setOptions] = useState<Option[]>([]);
  const [value, setValue] = useState('');
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('#global-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const fetchResults = async (q: string) => {
    const mine = ++seq.current;
    setSearching(true);
    try {
      const { data } = await httpClient.get('/search', { params: { q } });
      if (mine !== seq.current) return;
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
            <Tag color="orange">Repair</Tag> #{t.id} {t.asset?.assetCode ?? ''} — {t.issue}
          </span>
        ),
        onSelect: () =>
          navigate(
            `/maintenance?filters[0][field]=q&filters[0][operator]=contains&filters[0][value]=${t.id}`,
          ),
      }));
      const helpdeskOpts: Option[] = (data.helpdesk ?? []).slice(0, 4).map(
        (t: { id: number; ticketNumber: string; subject: string }) => ({
          value: `helpdesk-${t.id}`,
          label: (
            <span>
              <Tag color="purple">Ticket</Tag> {t.ticketNumber} — {t.subject}
            </span>
          ),
          onSelect: () => navigate(`/tickets/show/${t.id}`),
        }),
      );
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
      const all = [...assetOpts, ...empOpts, ...helpdeskOpts, ...ticketOpts, ...locOpts];
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
        gap: 12,
        padding: '0 20px',
        background: 'rgba(255,255,255,0.92)',
        borderBottom: `1px solid ${COLOR_BORDER}`,
        height: 52,
        lineHeight: '52px',
      }}
    >
      <nav className="nv-breadcrumb" aria-label="Breadcrumb">
        <span>NewVision</span>
        <span className="nv-breadcrumb-sep">/</span>
        <span className="nv-breadcrumb-current">{crumbFor(pathname)}</span>
      </nav>

      <div style={{ flex: 1 }} />

      <AutoComplete
        className="nv-header-search"
        style={{ width: 260, maxWidth: '32vw' }}
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
          size="small"
          prefix={<SearchOutlined style={{ color: COLOR_TEXT_MUTED }} />}
          placeholder="Search assets, employees, tickets"
          aria-label="Global search"
          aria-busy={searching}
          allowClear
          suffix={
            <span className="nv-kbd" style={{ fontFamily: FONT_MONO }}>
              ⌘K
            </span>
          }
        />
      </AutoComplete>

      <Space size={8} wrap={false} style={{ flexShrink: 0 }}>
        <NotificationBell />
        <Button
          size="small"
          icon={<BookOutlined />}
          onClick={() => navigate('/help')}
          aria-label="Help and documentation"
        >
          <span className="nv-header-action-text">Help</span>
        </Button>
      </Space>
    </Layout.Header>
  );
}
