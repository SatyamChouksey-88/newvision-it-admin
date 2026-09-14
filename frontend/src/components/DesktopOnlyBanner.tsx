import { Alert } from 'antd';
import { useNvPhone } from '../hooks/useNvPhone';

export function DesktopOnlyBanner({ noun }: { noun: string }) {
  const phone = useNvPhone();
  if (!phone) return null;
  return (
    <Alert
      type="info"
      showIcon
      className="nv-desktop-banner"
      message={`Open ${noun} on a desktop`}
      description="This screen is built for a wide console. Search and one-tap lookup still work; the full grid is on a larger display."
      style={{ marginBottom: 12 }}
    />
  );
}
