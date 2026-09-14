import { NavLink } from 'react-router';
import { useGetIdentity } from '@refinedev/core';
import { isItConsole } from '../access';
import type { Identity } from '../providers/authProvider';

const TABS = [
  { href: '/assets', label: 'Serialized' },
  { href: '/accessories', label: 'Accessories' },
  { href: '/consumables', label: 'Consumables' },
];

/** Shared Hardware house: three URLs, one visible split. */
export function HardwareTabs() {
  const { data: identity } = useGetIdentity<Identity>();
  if (!isItConsole(identity?.role)) return null;
  return (
    <nav className="nv-hardware-tabs" aria-label="Hardware" data-testid="hardware-tabs">
      {TABS.map((t) => (
        <NavLink
          key={t.href}
          to={t.href}
          className={({ isActive }) => `nv-hardware-tabs__item${isActive ? ' is-active' : ''}`}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
