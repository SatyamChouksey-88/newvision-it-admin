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
import { useGetIdentity } from '@refinedev/core';
import { can, navForRole } from '../access';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import type { Identity } from '../providers/authProvider';
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
  {
    key: 'nav-tickets',
    icon: <CustomerServiceOutlined />,
    label: 'Support Tickets',
    run: () => {},
  },
  { key: 'nav-vendors', icon: <SearchOutlined />, label: 'Vendors', run: () => {} },
  { key: 'nav-requisitions', icon: <FormOutlined />, label: 'Requisitions', run: () => {} },
  { key: 'nav-orders', icon: <FormOutlined />, label: 'Purchase Orders', run: () => {} },
  { key: 'nav-contracts', icon: <FormOutlined />, label: 'Contracts', run: () => {} },
  { key: 'nav-reports', icon: <DashboardOutlined />, label: 'Reports', run: () => {} },
  { key: 'nav-audit', icon: <SearchOutlined />, label: 'Audit Log', run: () => {} },
  { key: 'nav-settings', icon: <SettingOutlined />, label: 'Settings', run: () => {} },
  { key: 'nav-help', icon: <SearchOutlined />, label: 'Help', run: () => {} },
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
  'nav-vendors': '/procurement/vendors',
  'nav-requisitions': '/procurement/requisitions',
  'nav-orders': '/procurement/orders',
  'nav-contracts': '/procurement/contracts',
  'nav-reports': '/reports',
  'nav-audit': '/audit-logs',
  'nav-settings': '/settings',
  'nav-help': '/help',
};

/** AntD preset Tag colors (`color="green"` etc.) fail WCAG AA contrast — explicit safe pairs instead. */
const TAG_BLUE: React.CSSProperties = {
  color: '#1D4ED8',
  background: '#EFF6FF',
  borderColor: '#BFDBFE',
};
const TAG_GREEN: React.CSSProperties = {
  color: '#15803D',
  background: '#F0FDF4',
  borderColor: '#BBF7D0',
};
const TAG_PURPLE: React.CSSProperties = {
  color: '#6D28D9',
  background: '#F5F3FF',
  borderColor: '#DDD6FE',
};
const TAG_TEAL: React.CSSProperties = {
  color: '#0F766E',
  background: '#F0FDFA',
  borderColor: '#99F6E4',
};
const TAG_SLATE: React.CSSProperties = {
  color: '#334155',
  background: '#F8FAFC',
  borderColor: '#CBD5E1',
};
const TAG_ORANGE: React.CSSProperties = {
  color: '#C2410C',
  background: '#FFF7ED',
  borderColor: '#FED7AA',
};

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
  const { data: identity } = useGetIdentity<Identity>();
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

  const staticItems: PaletteItem[] = useMemo(() => {
    const role = identity?.role;
    const allowedHrefs = new Set(navForRole(role).map((n) => n.href));
    allowedHrefs.add('/help');
    const actions: PaletteItem[] = [];
    if (can(role, 'asset:create')) {
      actions.push({
        key: 'action-new-asset',
        section: 'Actions',
        icon: <PlusOutlined />,
        label: 'New asset',
        run: () => go('/assets/create'),
      });
    }
    actions.push({
      key: 'action-new-ticket',
      section: 'Actions',
      icon: <PlusOutlined />,
      label: 'Raise a ticket',
      run: () => go('/tickets/create'),
    });
    if (can(role, 'employee:manage')) {
      actions.push({
        key: 'action-new-employee',
        section: 'Actions',
        icon: <PlusOutlined />,
        label: 'New employee',
        run: () => go('/employees?action=new'),
      });
    }
    const nav = NAV_ITEMS.filter((n) => allowedHrefs.has(NAV_ROUTES[n.key])).map((n) => ({
      ...n,
      section: 'Navigate',
      run: () => go(NAV_ROUTES[n.key]),
    }));
    return [...actions, ...nav];
  }, [go, identity?.role]);

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
      for (const acc of (data.accessories ?? []).slice(0, 3)) {
        items.push({
          key: `acc-${acc.id}`,
          section: 'Accessories',
          icon: <Tag style={TAG_TEAL}>Accessory</Tag>,
          label: acc.name,
          run: () => go('/accessories'),
        });
      }
      for (const c of (data.consumables ?? []).slice(0, 3)) {
        items.push({
          key: `con-${c.id}`,
          section: 'Consumables',
          icon: <Tag style={TAG_SLATE}>Consumable</Tag>,
          label: c.name,
          run: () => go('/consumables'),
        });
      }
      for (const l of (data.locations ?? []).slice(0, 3)) {
        items.push({
          key: `loc-${l.id}`,
          section: 'Locations',
          icon: <Tag style={TAG_BLUE}>Location</Tag>,
          label: `${l.name} (${l.code})`,
          run: () =>
            go(
              `/assets?filters[0][field]=locationId&filters[0][operator]=eq&filters[0][value]=${l.id}`,
            ),
        });
      }
      for (const v of (data.vendors ?? []).slice(0, 4)) {
        items.push({
          key: `vendor-${v.id}`,
          section: 'Vendors',
          icon: <Tag style={TAG_TEAL}>Vendor</Tag>,
          label: `${v.vendorCode} — ${v.legalName}`,
          run: () => go(`/procurement/vendors/show/${v.id}`),
        });
      }
      for (const r of (data.requisitions ?? []).slice(0, 4)) {
        items.push({
          key: `pr-${r.id}`,
          section: 'Requisitions',
          icon: <Tag style={TAG_PURPLE}>PR</Tag>,
          label: `${r.requisitionNumber} — ${r.title}`,
          run: () => go(`/procurement/requisitions/show/${r.id}`),
        });
      }
      for (const p of (data.purchaseOrders ?? []).slice(0, 4)) {
        items.push({
          key: `po-${p.id}`,
          section: 'Purchase orders',
          icon: <Tag style={TAG_SLATE}>PO</Tag>,
          label: `${p.poNumber}`,
          run: () => go(`/procurement/orders/show/${p.id}`),
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
    const q = v.trim();
    const ticket = q.match(/^(TCK-\d{6,})$/i);
    const asset = q.match(/^(AST-[A-Z0-9-]+)$/i);
    if (ticket || asset) {
      debouncedFetch.cancel();
      seq.current++;
      setResults([
        {
          key: 'deep-link',
          section: 'Jump',
          icon: <SearchOutlined />,
          label: ticket ? `Open ${ticket[1].toUpperCase()}` : `Open ${asset![1].toUpperCase()}`,
          run: () => {
            httpClient
              .get('/search', { params: { q } })
              .then(({ data }) => {
                if (ticket && data.helpdesk?.[0]) go(`/tickets/show/${data.helpdesk[0].id}`);
                else if (asset && data.assets?.[0]) go(`/assets/show/${data.assets[0].id}`);
                else void fetchResults(q);
              })
              .catch(() => undefined);
          },
        },
      ]);
      void fetchResults(q);
      return;
    }
    if (q.length < 2 && !/^\d+$/.test(q)) {
      debouncedFetch.cancel();
      seq.current++;
      setResults([]);
      return;
    }
    debouncedFetch(q);
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
        <span className="nv-palette-footer-key">
          <span className="nv-kbd">↑↓</span> navigate
        </span>
        <span className="nv-palette-footer-key">
          <span className="nv-kbd">↵</span> open
        </span>
        <span className="nv-palette-footer-key">
          <span className="nv-kbd">esc</span> close
        </span>
      </div>
    </Modal>
  );
}
