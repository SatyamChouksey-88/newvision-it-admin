import {
  AuditOutlined,
  BankOutlined,
  BarsOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DesktopOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  GoldOutlined,
  HomeOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useThemedLayoutContext } from '@refinedev/antd';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { Avatar, Button, Drawer, Grid, Modal, Popover, Tooltip } from 'antd';
import { type ReactNode, useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { navForRole, ROLE_CHIP } from '../access';
import type { Identity } from '../providers/authProvider';
import { httpClient } from '../providers/axios';
import { writeSiderPref } from './siderPref';
import { Title } from './Title';

const NAV_ICONS: Record<string, ReactNode> = {
  home: <HomeOutlined />,
  dash: <DashboardOutlined />,
  devices: <DesktopOutlined />,
  assets: <DesktopOutlined />,
  employees: <TeamOutlined />,
  locations: <EnvironmentOutlined />,
  accessories: <GoldOutlined />,
  consumables: <ShoppingOutlined />,
  request: <FileTextOutlined />,
  requests: <FileTextOutlined />,
  maintenance: <ToolOutlined />,
  tickets: <CustomerServiceOutlined />,
  chat: <CommentOutlined />,
  vendors: <BankOutlined />,
  requisitions: <FileTextOutlined />,
  orders: <ShoppingCartOutlined />,
  contracts: <FileProtectOutlined />,
  reports: <FileTextOutlined />,
  audit: <AuditOutlined />,
  settings: <SettingOutlined />,
  help: <QuestionCircleOutlined />,
};

function initials(name?: string) {
  if (!name) return 'NV';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function SiderBody({ collapsed }: { collapsed: boolean }) {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutateAsync: logoutAsync } = useLogout();
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
  const [accountOpen, setAccountOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const items = navForRole(identity?.role);
  const procKeys = new Set(['vendors', 'requisitions', 'orders', 'contracts']);
  const manageItems = items.filter((i) => !procKeys.has(i.key));
  const procItems = items.filter((i) => procKeys.has(i.key));
  const chip = ROLE_CHIP[identity?.role ?? ''] ?? ROLE_CHIP.EMPLOYEE;

  useEffect(() => {
    let cancelled = false;
    const role = identity?.role;
    if (!role) return;
    const loads: Promise<void>[] = [];
    if (role === 'SUPER_ADMIN' || role === 'IT_ADMIN' || role === 'IT_SUPPORT') {
      loads.push(
        httpClient
          .get('/dashboard/metrics')
          .then(({ data }) => {
            if (!cancelled)
              setCounts((c) => ({ ...c, assets: data?.total, maintenance: data?.underRepair }));
          })
          .catch(() => undefined),
      );
      loads.push(
        httpClient
          .get('/dashboard/attention')
          .then(({ data }) => {
            if (!cancelled) setCounts((c) => ({ ...c, requests: data?.pendingRequestCount }));
          })
          .catch(() => undefined),
      );
      loads.push(
        httpClient
          .get('/employees', { params: { _start: 0, _end: 1, isActive: 'true' } })
          .then(({ data }) => {
            if (!cancelled) setCounts((c) => ({ ...c, employees: data?.total }));
          })
          .catch(() => undefined),
      );
    }
    if (role === 'MANAGER') {
      loads.push(
        httpClient
          .get('/dashboard/team-summary')
          .then(({ data }) => {
            if (!cancelled)
              setCounts((c) => ({
                ...c,
                requests: data?.pendingRequestCount,
                tickets: data?.teamOpenTicketCount,
              }));
          })
          .catch(() => undefined),
      );
    }
    loads.push(
      httpClient
        .get('/support-tickets/counts')
        .then(({ data }) => {
          if (!cancelled)
            setCounts((c) => ({ ...c, tickets: c.tickets ?? data?.openUnassigned ?? data?.mine }));
        })
        .catch(() => undefined),
    );
    return () => {
      cancelled = true;
    };
  }, [identity?.role]);

  const renderLink = (item: (typeof items)[number]) => {
    const count = item.badgeKey ? counts[item.badgeKey] : undefined;
    return (
      <Tooltip key={item.key} title={collapsed ? item.label : item.hint} placement="right">
        <NavLink
          to={item.href}
          end={item.href === '/'}
          className={({ isActive }) => `nv-sider-link${isActive ? ' is-active' : ''}`}
        >
          <span className="nv-sider-icon" aria-hidden>
            {NAV_ICONS[item.key] ?? <DashboardOutlined />}
          </span>
          <span className="nv-sider-label">{item.label}</span>
          {count != null ? (
            collapsed ? (
              <span
                className="nv-nav-badge nv-nav-badge--dot"
                role="status"
                aria-label={`${count}`}
              />
            ) : (
              <span className="nv-nav-badge">{count}</span>
            )
          ) : null}
        </NavLink>
      </Tooltip>
    );
  };

  return (
    <>
      <Title collapsed={collapsed} />
      <nav className="nv-sider-nav">
        <span className="nv-sider-section" data-testid="sider-manage-label">
          {identity?.role === 'EMPLOYEE'
            ? 'MY IT'
            : identity?.role === 'MANAGER'
              ? 'TEAM'
              : 'MANAGE'}
        </span>
        {manageItems.map(renderLink)}
        {procItems.length > 0 ? (
          <>
            <span className="nv-sider-section" data-testid="sider-procurement-label">
              PROCUREMENT
            </span>
            {procItems.map(renderLink)}
          </>
        ) : null}
      </nav>
      <div className="nv-sider-user">
        <Popover
          trigger="click"
          placement="topLeft"
          open={accountOpen}
          onOpenChange={setAccountOpen}
          overlayClassName="nv-account-pop"
          content={
            <div className="nv-account-menu" data-testid="account-menu">
              <div className="nv-account-menu-head">
                <Avatar size={32} className="nv-sider-avatar">
                  {initials(identity?.fullName)}
                </Avatar>
                <div>
                  <div className="nv-account-menu-name">{identity?.fullName}</div>
                  <div className="nv-account-menu-role">{chip.label}</div>
                </div>
              </div>
              <nav className="nv-account-menu-links">
                {identity?.employeeId ? (
                  <Link
                    to={`/employees/show/${identity.employeeId}`}
                    className="nv-account-menu-link"
                    onClick={() => setAccountOpen(false)}
                  >
                    <UserOutlined /> Profile
                  </Link>
                ) : null}
                {identity?.role === 'SUPER_ADMIN' ||
                identity?.role === 'IT_ADMIN' ||
                identity?.role === 'IT_SUPPORT' ? (
                  <Link
                    to="/settings"
                    className="nv-account-menu-link"
                    onClick={() => setAccountOpen(false)}
                  >
                    <SettingOutlined /> Settings
                  </Link>
                ) : null}
                <Link
                  to="/help"
                  className="nv-account-menu-link"
                  onClick={() => setAccountOpen(false)}
                >
                  <QuestionCircleOutlined /> Help
                </Link>
              </nav>
              <button
                type="button"
                className="nv-account-menu-signout"
                onClick={() => {
                  setAccountOpen(false);
                  setSignOutOpen(true);
                }}
              >
                <LogoutOutlined /> Sign out
              </button>
            </div>
          }
        >
          <button
            type="button"
            className="nv-sider-user-row"
            data-testid="account-menu-button"
            aria-label="Account menu"
            aria-expanded={accountOpen}
            aria-haspopup="dialog"
          >
            <Avatar size={26} className="nv-sider-avatar">
              {initials(identity?.fullName)}
            </Avatar>
            <div className="nv-sider-user-meta">
              <div className="nv-sider-user-name">{identity?.fullName}</div>
              <span
                className="nv-role-chip"
                style={{ color: chip.color, background: chip.bg }}
                data-testid="role-chip"
              >
                {chip.label}
              </span>
            </div>
          </button>
        </Popover>
      </div>
      <Tooltip title={collapsed ? 'Sign out' : undefined} placement="right">
        <button
          type="button"
          data-testid="logout-button"
          className="nv-sider-signout-item"
          aria-label="Sign out"
          onClick={() => setSignOutOpen(true)}
        >
          {collapsed ? <LogoutOutlined /> : 'Sign out'}
        </button>
      </Tooltip>
      <Modal
        open={signOutOpen}
        title="Sign out?"
        onCancel={() => setSignOutOpen(false)}
        footer={[
          <Button key="stay" onClick={() => setSignOutOpen(false)}>
            Stay signed in
          </Button>,
          <Button
            key="out"
            type="primary"
            danger
            data-testid="logout-confirm"
            onClick={async () => {
              setSignOutOpen(false);
              try {
                await logoutAsync();
              } catch {
                // Session is cleared locally even if the revoke call fails.
              }
              window.location.assign('/login');
            }}
          >
            Sign out
          </Button>,
        ]}
      >
        You will need your email and password to sign back in to NewVisionITIS.
      </Modal>
    </>
  );
}

export function AppSider() {
  const { siderCollapsed, setSiderCollapsed, mobileSiderOpen, setMobileSiderOpen } =
    useThemedLayoutContext();
  const breakpoint = Grid.useBreakpoint();
  const isMobile = typeof breakpoint.lg === 'undefined' ? false : !breakpoint.lg;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key !== '[' && e.code !== 'BracketLeft') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable)
        return;
      e.preventDefault();
      if (isMobile) {
        setMobileSiderOpen(!mobileSiderOpen);
        return;
      }
      const next = !siderCollapsed;
      writeSiderPref(next);
      setSiderCollapsed(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, mobileSiderOpen, setMobileSiderOpen, setSiderCollapsed, siderCollapsed]);

  if (isMobile) {
    return (
      <>
        <Drawer
          open={mobileSiderOpen}
          onClose={() => setMobileSiderOpen(false)}
          placement="left"
          width={216}
          closable={false}
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          <aside className="nv-sider nv-sider--drawer" data-testid="app-sider" aria-label="Primary">
            <SiderBody collapsed={false} />
          </aside>
        </Drawer>
        <Button
          className="nv-sider-hamburger"
          size="large"
          icon={<BarsOutlined />}
          aria-label="Open navigation"
          onClick={() => setMobileSiderOpen(true)}
        />
      </>
    );
  }

  return (
    <aside
      className={`nv-sider${siderCollapsed ? ' nv-sider--collapsed ant-layout-sider-collapsed' : ''}`}
      data-testid="app-sider"
      aria-label="Primary"
    >
      <SiderBody collapsed={siderCollapsed} />
    </aside>
  );
}
