import {
  CustomerServiceOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  FormOutlined,
  InboxOutlined,
  LaptopOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Input, Modal, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { httpClient } from '../providers/axios';

interface PaletteItem {
  key: string;
  section: string;
  icon: React.ReactNode;
  label: React.ReactNode;
  hint?: string;
  run: () => void;
}

const NAV_ITEMS: Omit<PaletteItem, 'section'>[] = [
  { key: 'nav-dashboard', icon: <DashboardOutlined />, label: 'Dashboard', run: () => {} },
  { key: 'nav-assets', icon: <LaptopOutlined />, label: 'Assets', run: () => {} },
  { key: 'nav-employees', icon: <TeamOutlined />, label: 'Employees', run: () => {} },
  { key: 'nav-locations', icon: <EnvironmentOutlined />, label: 'Locations', run: () => {} },
  { key: 'nav-accessories', icon: <ShoppingOutlined />, label: 'Accessories', run: () => {} },
  { key: 'nav-consumables', icon: <InboxOutlined />, label: 'Consumables', run: () => {} },
  { key: 'nav-requests', icon: <FormOutlined />, label: 'Requests', run: () => {} },
  { key: 'nav-maintenance', icon: <ToolOutlined />, label: 'Maintenance', run: () => {} },
  { key: 'nav-tickets', icon: <CustomerServiceOutlined />, label: 'Support Tickets', run: () => {} },
  { key: 'nav-settings', icon: <SettingOutlined />, label: 'Settings', run: () => {} },
];
const NAV_ROUTES: Record<string, string> = {
  'nav-dashboard': '/',
  'nav-assets': '/assets',
  'nav-employees': '/employees',
  'nav-locations': '/locations',
  'nav-accessories': '/accessories',
  'nav-consumables': '/consumables',
  'nav-requests': '/requests',
  'nav-maintenance': '/maintenance',
  'nav-tickets': '/tickets',
  'nav-settings': '/settings',
};

/** AntD preset Tag colors (`color="green"` etc.) fail WCAG AA contrast — explicit safe pairs instead. */
const TAG_BLUE: React.CSSProperties = { color: '#1D4ED8', background: '#EFF6FF', borderColor: '#BFDBFE' };
const TAG_GREEN: React.CSSProperties = { color: '#15803D', background: '#F0FDF4', borderColor: '#BBF7D0' };
const TAG_PURPLE: React.CSSProperties = { color: '#6D28D9', background: '#F5F3FF', borderColor: '#DDD6FE' };
const TAG_ORANGE: React.CSSProperties = { color: '#B45309', background: '#FFFBEB', borderColor: '#FDE68A' };

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * ⌘K / Ctrl+K command palette — the single global-jump entry point (supersedes the old
 * header AutoComplete). Reuses the existing /search endpoint for record jumps.
 */
export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PaletteItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const seq = useRef(0);
  const inputRef = useRef<React.ComponentRef<typeof Input> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const go = useCallback(
    (path: string) => {
      onClose();
      navigate(path);
    },
    [navigate, onClose],
  );

  const staticItems: PaletteItem[] = useMemo(
    () => [
      {
        key: 'action-new-asset',
        section: 'Actions',
        icon: <PlusOutlined />,
        label: 'New asset',
        run: () => go('/assets/create'),
      },
      {
        key: 'action-new-ticket',
        section: 'Actions',
        icon: <PlusOutlined />,
        label: 'Raise a ticket',
        run: () => go('/tickets/create'),
      },
      {
        key: 'action-new-employee',
        section: 'Actions',
        icon: <PlusOutlined />,
        label: 'New employee',
        run: () => go('/employees?action=new'),
      },
      ...NAV_ITEMS.map((n) => ({
        ...n,
        section: 'Navigate',
        run: () => go(NAV_ROUTES[n.key]),
      })),
    ],
    [go],
  );

  const fetchResults = async (q: string) => {
    const mine = ++seq.current;
    try {
      const { data } = await httpClient.get('/search', { params: { q } });
      if (mine !== seq.current) return;
      const items: PaletteItem[] = [];
      for (const a of (data.assets ?? []).slice(0, 5)) {
        items.push({
          key: `asset-${a.id}`,
          section: 'Assets',
          icon: <Tag style={TAG_BLUE}>Asset</Tag>,
          label: `${a.assetCode} — ${a.brand ?? ''} ${a.model ?? ''}`.trim(),
          run: () => go(`/assets/show/${a.id}`),
        });
      }
      for (const e of (data.employees ?? []).slice(0, 5)) {
        items.push({
          key: `emp-${e.id}`,
          section: 'Employees',
          icon: <Tag style={TAG_GREEN}>Employee</Tag>,
          label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
          run: () => go(`/employees/show/${e.id}`),
        });
      }
      for (const t of (data.helpdesk ?? []).slice(0, 5)) {
        items.push({
          key: `helpdesk-${t.id}`,
          section: 'Support tickets',
          icon: <Tag style={TAG_PURPLE}>Ticket</Tag>,
          label: `${t.ticketNumber} — ${t.subject}`,
          run: () => go(`/tickets/show/${t.id}`),
        });
      }
      for (const t of (data.tickets ?? []).slice(0, 4)) {
        items.push({
          key: `maint-${t.id}`,
          section: 'Maintenance',
          icon: <Tag style={TAG_ORANGE}>Repair</Tag>,
          label: `#${t.id} ${t.asset?.assetCode ?? ''} — ${t.issue}`,
          run: () =>
            go(
              `/maintenance?filters[0][field]=q&filters[0][operator]=contains&filters[0][value]=${t.id}`,
            ),
        });
      }
      for (const l of (data.locations ?? []).slice(0, 3)) {
        items.push({
          key: `loc-${l.id}`,
          section: 'Locations',
          icon: <Tag>Location</Tag>,
          label: `${l.name} (${l.code})`,
          run: () =>
            go(
              `/assets?filters[0][field]=locationId&filters[0][operator]=eq&filters[0][value]=${l.id}`,
            ),
        });
      }
      setResults(items);
      setActiveIndex(0);
    } catch {
      if (mine === seq.current) setResults([]);
    }
  };
  const debouncedFetch = useDebouncedCallback((q: string) => void fetchResults(q), 200);

  const onChange = (v: string) => {
    setQuery(v);
    if (v.trim().length < 2 && !/^\d+$/.test(v.trim())) {
      debouncedFetch.cancel();
      seq.current++;
      setResults([]);
      return;
    }
    debouncedFetch(v.trim());
  };

  const list: PaletteItem[] = query.trim().length >= 2 ? results : staticItems;
  const sections = useMemo(() => {
    const bySection = new Map<string, PaletteItem[]>();
    for (const item of list) {
      const arr = bySection.get(item.section) ?? [];
      arr.push(item);
      bySection.set(item.section, arr);
    }
    return bySection;
  }, [list]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      list[activeIndex]?.run();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let runningIndex = -1;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={620}
      centered
      destroyOnHidden
      className="nv-palette"
      styles={{
        content: {
          padding: 0,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 6px 20px rgba(16,24,40,0.10), 0 1px 2px rgba(16,24,40,0.06)',
        },
        body: { padding: 0 },
      }}
      aria-label="Command palette"
    >
      <div style={{ borderBottom: '1px solid #F1F4F8', padding: '0 14px' }}>
        <Input
          ref={inputRef}
          className="nv-palette-input"
          variant="borderless"
          size="large"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          prefix={<SearchOutlined style={{ color: '#64748b', marginRight: 4 }} />}
          placeholder="Search assets, employees, tickets… or jump to a screen"
          aria-label="Global search"
        />
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 6px 10px' }} role="listbox">
        {list.length === 0 && (
          <Typography.Text
            type="secondary"
            style={{ display: 'block', padding: '24px 14px', fontSize: 13 }}
          >
            No matches for “{query}”.
          </Typography.Text>
        )}
        {[...sections.entries()].map(([section, items]) => (
          <div key={section}>
            <div className="nv-palette-section">{section}</div>
            {items.map((item) => {
              runningIndex += 1;
              const idx = runningIndex;
              return (
                <div
                  key={item.key}
                  role="option"
                  tabIndex={-1}
                  aria-selected={idx === activeIndex}
                  data-active={idx === activeIndex}
                  className="nv-palette-result"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => item.run()}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div
        style={{
          borderTop: '1px solid #F1F4F8',
          background: '#FAFBFC',
          padding: '8px 14px',
          fontSize: 11,
          color: '#64748b',
          display: 'flex',
          gap: 14,
        }}
      >
        <span>↑↓ navigate</span>
        <span>↵ open</span>
        <span>esc close</span>
      </div>
    </Modal>
  );
}
