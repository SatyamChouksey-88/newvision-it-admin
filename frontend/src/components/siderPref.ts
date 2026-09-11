export const SIDER_PREF_KEY = 'nv.siderCollapsed';

export function readSiderPref(): boolean | null {
  try {
    const v = localStorage.getItem(SIDER_PREF_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
    return null;
  } catch {
    return null;
  }
}

/** Persist only explicit user toggles — never tablet auto-collapse. */
export function writeSiderPref(collapsed: boolean) {
  try {
    localStorage.setItem(SIDER_PREF_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
}
