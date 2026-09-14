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
