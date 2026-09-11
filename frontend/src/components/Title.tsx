import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useThemedLayoutContext } from '@refinedev/antd';
import { Tooltip } from 'antd';
import { Link } from 'react-router';
import { writeSiderPref } from './siderPref';

function isMobileNav() {
  return window.matchMedia('(max-width: 991px)').matches;
}

/** Brand mark from `frontend/public/brand/` — expanded uses the header logo, collapsed the favicon. */
export function Title({ collapsed }: { collapsed: boolean }) {
  const { siderCollapsed, setSiderCollapsed, mobileSiderOpen, setMobileSiderOpen } =
    useThemedLayoutContext();

  const mobile = typeof window !== 'undefined' && isMobileNav();
  const label = mobile
    ? mobileSiderOpen
      ? 'Close navigation'
      : 'Open navigation'
    : collapsed
      ? 'Open sidebar'
      : 'Collapse sidebar';

  const onToggle = () => {
    if (isMobileNav()) {
      setMobileSiderOpen(!mobileSiderOpen);
      return;
    }
    const next = !siderCollapsed;
    writeSiderPref(next);
    setSiderCollapsed(next);
  };

  return (
    <div className="nv-sider-brand">
      <Link to="/" aria-label="NewVision home">
        <img
          src={collapsed ? '/brand/favicon.png' : '/brand/header-logo.png'}
          alt=""
          className={collapsed ? 'nv-brand-img nv-brand-img--collapsed' : 'nv-brand-img'}
        />
      </Link>
      <Tooltip title={`${label} (Ctrl+[)`}>
        <button
          type="button"
          className="nv-sider-toggle"
          aria-label={label}
          aria-expanded={!collapsed}
          data-testid="sider-toggle"
          onClick={onToggle}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>
      </Tooltip>
    </div>
  );
}
