import { useThemedLayoutContext } from '@refinedev/antd';
import { useEffect } from 'react';

const TABLET_MQ = '(max-width: 1023px)';

/**
 * Floor-audit / tablet:
 * - Below Ant Design `lg` (992px) Refine already swaps the sider for a hamburger drawer.
 * - From 992–1023px the full sider still renders; collapse it to icons so content has room.
 * Does not auto-expand on desktop (respects a user who collapsed it themselves).
 */
export function TabletCollapse() {
  const { setSiderCollapsed } = useThemedLayoutContext();

  useEffect(() => {
    const mq = window.matchMedia(TABLET_MQ);
    const apply = () => {
      if (mq.matches) setSiderCollapsed(true);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [setSiderCollapsed]);

  return null;
}
