import {
  AuditOutlined,
  BankOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DesktopOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  GoldOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useThemedLayoutContext } from '@refinedev/antd';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { Avatar, Tooltip } from 'antd';
import { type ReactNode, useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { navForRole, ROLE_CHIP } from '../access';
import type { Identity } from '../providers/authProvider';
import { httpClient } from '../providers/axios';
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

export function AppSider() {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();
  const { siderCollapsed } = useThemedLayoutContext();
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
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

  return (
    <aside
      className={`nv-sider${siderCollapsed ? ' nv-sider--collapsed' : ''}`}
      data-testid="app-sider"
      aria-label="Primary"
    >
      <Title collapsed={siderCollapsed} />
      <nav className="nv-sider-nav">
        {!siderCollapsed && (
          <span className="nv-sider-section" data-testid="sider-manage-label">
            {identity?.role === 'EMPLOYEE'
              ? 'MY IT'
              : identity?.role === 'MANAGER'
                ? 'TEAM'
                : 'MANAGE'}
          </span>
        )}
        {manageItems.map((item) => (
          <Tooltip key={item.key} title={siderCollapsed ? item.label : item.hint} placement="right">
            <NavLink
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) => `nv-sider-link${isActive ? ' is-active' : ''}`}
            >
              <span className="nv-sider-icon" aria-hidden>
                {NAV_ICONS[item.key] ?? <DashboardOutlined />}
              </span>
              {!siderCollapsed ? (
                <span
                  style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {item.label}
                </span>
              ) : null}
              {!siderCollapsed && item.badgeKey && counts[item.badgeKey] != null ? (
                <span className="nv-nav-badge">{counts[item.badgeKey]}</span>
              ) : null}
            </NavLink>
          </Tooltip>
        ))}
        {procItems.length > 0 ? (
          <>
            {!siderCollapsed && (
              <span className="nv-sider-section" data-testid="sider-procurement-label">
                PROCUREMENT
              </span>
            )}
            {procItems.map((item) => (
              <Tooltip
                key={item.key}
                title={siderCollapsed ? item.label : item.hint}
                placement="right"
              >
                <NavLink
                  to={item.href}
                  className={({ isActive }) => `nv-sider-link${isActive ? ' is-active' : ''}`}
                >
                  <span className="nv-sider-icon" aria-hidden>
                    {NAV_ICONS[item.key] ?? <DashboardOutlined />}
                  </span>
                  {!siderCollapsed ? (
                    <span
                      style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {item.label}
                    </span>
                  ) : null}
                </NavLink>
              </Tooltip>
            ))}
          </>
        ) : null}
      </nav>
      <div className="nv-sider-user">
        <div className="nv-sider-user-row">
          <Avatar size={26} className="nv-sider-avatar">
            {initials(identity?.fullName)}
          </Avatar>
          {!siderCollapsed && (
            <div className="nv-sider-user-meta" style={{ minWidth: 0 }}>
              <div className="nv-sider-user-name">{identity?.fullName}</div>
              <span
                className="nv-role-chip"
                style={{ color: chip.color, background: chip.bg }}
                data-testid="role-chip"
              >
                {chip.label}
              </span>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        data-testid="logout-button"
        className="nv-sider-signout-item"
        onClick={() => logout()}
      >
        {siderCollapsed ? 'Out' : 'Sign out'}
      </button>
    </aside>
  );
}
