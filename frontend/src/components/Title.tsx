import { Link } from 'react-router';

/** Brand title in the sider using official NewVision logo. */
export function Title({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      to="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        height: 48,
        textDecoration: 'none',
      }}
    >
      <img
        src={collapsed ? '/brand/footer-logo.png' : '/brand/header-logo.png'}
        alt="NewVision"
        style={{
          height: collapsed ? 28 : 32,
          maxWidth: collapsed ? 28 : 160,
          objectFit: 'contain',
        }}
      />
    </Link>
  );
}
