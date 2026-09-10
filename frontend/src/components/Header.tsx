import { BookOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Layout, Space } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CommandPalette } from './CommandPalette';
import { COLOR_BORDER, COLOR_TEXT_MUTED, FONT_MONO } from '../theme';
import { NotificationBell } from './NotificationBell';

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
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        navigate('/help');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

      <button
        type="button"
        id="global-search-input"
        className="nv-header-search"
        onClick={() => setPaletteOpen(true)}
        aria-label="Open command palette (search or jump to a screen)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: 260,
          maxWidth: '32vw',
          height: 30,
          padding: '0 10px',
          background: '#fafbfc',
          border: `1px solid #e4e9f0`,
          borderRadius: 6,
          color: COLOR_TEXT_MUTED,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        <SearchOutlined />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Search or jump to…
        </span>
        <span className="nv-kbd" style={{ fontFamily: FONT_MONO }}>
          ⌘K
        </span>
      </button>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

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
