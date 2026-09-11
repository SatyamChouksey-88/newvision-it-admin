import { useThemedLayoutContext } from '@refinedev/antd';
import { useEffect, useRef } from 'react';
import { readSiderPref } from './siderPref';

const DESKTOP_MQ = '(min-width: 1024px)';

/**
 * Viewport policy (do not persist auto-collapse — that would wipe a desktop expand):
 * - Desktop ≥1024: restore `nv.siderCollapsed`.
 * - Crossing down through 1024, or first paint below 1024: collapse to the icon rail.
 * - A user who expands on a 992–1023 tablet keeps that until they collapse or leave the band.
 */
export function TabletCollapse() {
  const { setSiderCollapsed } = useThemedLayoutContext();
  const setRef = useRef(setSiderCollapsed);
  setRef.current = setSiderCollapsed;

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_MQ);

    const apply = (reason: 'init' | 'enter-desktop' | 'leave-desktop') => {
      if (reason === 'enter-desktop' || (reason === 'init' && desktop.matches)) {
        setRef.current(readSiderPref() === true);
        return;
      }
      if (reason === 'leave-desktop' || (reason === 'init' && !desktop.matches)) {
        setRef.current(true);
      }
    };

    apply('init');
    const onChange = (e: MediaQueryListEvent) => {
      apply(e.matches ? 'enter-desktop' : 'leave-desktop');
    };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, []);

  return null;
}
