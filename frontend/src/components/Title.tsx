import { Link } from 'react-router';

/** Brand mark from `frontend/public/brand/` — expanded uses the header logo, collapsed the favicon. */
export function Title({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/" className="nv-sider-brand" aria-label="NewVision home">
      <img
        src={collapsed ? '/brand/favicon.png' : '/brand/header-logo.png'}
        alt=""
        className={collapsed ? 'nv-brand-img nv-brand-img--collapsed' : 'nv-brand-img'}
      />
    </Link>
  );
}
