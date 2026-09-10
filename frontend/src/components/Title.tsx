import { Link } from 'react-router';

/** Brand mark in the sider — 24px “N” square + wordmark, matching the approved mockup. */
export function Title({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/" className="nv-sider-brand" aria-label="NewVision home">
      <span className="nv-logo-mark nv-logo-mark--sm" aria-hidden>
        N
      </span>
      {!collapsed && <span className="nv-sider-wordmark">NewVision</span>}
    </Link>
  );
}
