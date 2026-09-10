import { ThemedSider, type RefineThemedLayoutSiderProps } from '@refinedev/antd';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { Avatar } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { httpClient } from '../providers/axios';
import type { Identity } from '../providers/authProvider';
import { Title } from './Title';

function initials(name?: string) {
  if (!name) return 'NV';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function decorateNav(_items: ReactNode[], counts: Record<string, number | undefined>) {
  if (typeof document === 'undefined') return;
  requestAnimationFrame(() => {
    const map: Record<string, number | undefined> = {
      '/assets': counts.assets,
      '/employees': counts.employees,
      '/maintenance': counts.maintenance,
      '/requests': counts.requests,
    };
    for (const [href, n] of Object.entries(map)) {
      if (n == null) continue;
      const links = document.querySelectorAll<HTMLElement>(`.ant-layout-sider a[href="${href}"]`);
      links.forEach((link) => {
        let badge = link.querySelector<HTMLElement>('.nv-nav-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'nv-nav-badge';
          link.appendChild(badge);
        }
        badge.textContent = String(n);
      });
    }
  });
}

export function AppSider(props: RefineThemedLayoutSiderProps) {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      httpClient.get('/dashboard/metrics').catch(() => null),
      httpClient.get('/dashboard/attention').catch(() => null),
      httpClient.get('/employees', { params: { _start: 0, _end: 1, isActive: 'true' } }).catch(() => null),
    ]).then(([metrics, attention, employees]) => {
      if (cancelled) return;
      setCounts({
        assets: metrics?.data?.total,
        maintenance: metrics?.data?.underRepair,
        requests: attention?.data?.pendingRequestCount,
        employees: employees?.data?.total,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemedSider
      {...props}
      Title={Title}
      render={({ items, collapsed }) => {
        decorateNav(items, counts);
        return (
          <>
            {!collapsed && (
              <div className="nv-sider-section">MANAGE</div>
            )}
            {items}
            <div className="nv-sider-user">
              <div className="nv-sider-user-row">
                <Avatar size={26} className="nv-sider-avatar">
                  {initials(identity?.fullName)}
                </Avatar>
                {!collapsed && (
                  <div className="nv-sider-user-meta">
                    <div className="nv-sider-user-name">{identity?.fullName}</div>
                    <div className="nv-sider-user-role">{identity?.role?.replaceAll('_', ' ')}</div>
                  </div>
                )}
              </div>
            </div>
            <div
              role="menuitem"
              tabIndex={0}
              data-testid="logout-button"
              className="nv-sider-signout-item"
              onClick={() => logout()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  logout();
                }
              }}
            >
              {collapsed ? 'Out' : 'Sign out'}
            </div>
          </>
        );
      }}
    />
  );
}
