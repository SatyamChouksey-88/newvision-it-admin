import { FileTextOutlined, HomeOutlined, LaptopOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';
import { NavLink } from 'react-router';
import { isEmployee } from '../access';
import { useNvPhone } from '../hooks/useNvPhone';
import type { Identity } from '../providers/authProvider';

const ITEMS = [
  { href: '/', label: 'Home', icon: <HomeOutlined />, end: true },
  { href: '/assets', label: 'Kit', icon: <LaptopOutlined /> },
  { href: '/tickets', label: 'Tickets', icon: <CustomerServiceOutlined /> },
  { href: '/requests', label: 'Request', icon: <FileTextOutlined /> },
];

/** Employee-only 4-item bar. IT Admin keeps the hamburger. */
export function EmployeeBottomNav() {
  const phone = useNvPhone();
  const { data: identity } = useGetIdentity<Identity>();
  if (!phone || !isEmployee(identity?.role)) return null;
  return (
    <nav className="nv-employee-bottom-nav" aria-label="Employee">
      {ITEMS.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.end}
          className={({ isActive }) => `nv-employee-bottom-nav__item${isActive ? ' is-active' : ''}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
