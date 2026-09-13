import { Navigate, useLocation } from 'react-router';
import { useGetIdentity } from '@refinedev/core';
import { navForRole } from '../access';
import type { Identity } from '../providers/authProvider';

/** Block URLs that aren't in this role's nav (API still enforces; this stops a confusing 403 page). */
export function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const { data: identity } = useGetIdentity<Identity>();
  const { pathname } = useLocation();
  if (!identity?.role) return children;
  const allowed = navForRole(identity.role);
  const ok = allowed.some((i) => pathname === i.href || (i.href !== '/' && pathname.startsWith(i.href)));
  // Own/team profiles are not in the Employee/Manager sidebar, but the account-menu
  // Profile link and contact cards must still open. The API enforces who can see whom.
  const employeeProfile = pathname.startsWith('/employees/show/');
  if (!ok && !employeeProfile && pathname !== '/help' && !pathname.startsWith('/help')) {
    return <Navigate to="/" replace />;
  }
  return children;
}
