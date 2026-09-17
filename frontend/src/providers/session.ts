export const TOKEN_KEY = 'newvision:token';
export const USER_KEY = 'newvision:user';
/** @deprecated Refresh lives in an httpOnly cookie; kept so old localStorage values are wiped. */
export const REFRESH_TOKEN_KEY = 'newvision:refresh';

export function readSession(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

/** Access token + identity stay in sessionStorage (JS-readable, tab-scoped). Refresh is a cookie. */
export function writeSession(key: string, value: string) {
  sessionStorage.setItem(key, value);
  localStorage.removeItem(key);
}

export function clearSession() {
  durableRemove(TOKEN_KEY);
  durableRemove(USER_KEY);
  durableRemove(REFRESH_TOKEN_KEY);
}

function durableRemove(key: string) {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

export function hasSession(): boolean {
  return Boolean(readSession(TOKEN_KEY));
}

export function redirectAfterLogin(): string {
  const to = new URLSearchParams(window.location.search).get('to');
  return to?.startsWith('/') && !to.startsWith('//') ? to : '/';
}

/** Shared by password login and Entra sign-in (Phase 2) — both end up with the same shape. */
export function finishSession(data: { access_token?: string; user?: unknown }) {
  if (!data.access_token || !data.user) throw new Error('Login did not return a session');
  writeSession(TOKEN_KEY, data.access_token);
  writeSession(USER_KEY, JSON.stringify(data.user));
  window.location.assign(redirectAfterLogin());
}
