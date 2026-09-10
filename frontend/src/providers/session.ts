export const TOKEN_KEY = 'newvision:token';
export const USER_KEY = 'newvision:user';
export const REFRESH_TOKEN_KEY = 'newvision:refresh';

/** Persist across browser restarts (Keep me signed in). */
const durable = () => localStorage;
/** Cleared when the tab/window closes. */
const ephemeral = () => sessionStorage;

export function readSession(key: string): string | null {
  return durable().getItem(key) ?? ephemeral().getItem(key);
}

export function writeSession(key: string, value: string, persist: boolean) {
  const keep = persist ? durable() : ephemeral();
  const drop = persist ? ephemeral() : durable();
  keep.setItem(key, value);
  drop.removeItem(key);
}

export function clearSession() {
  durable().removeItem(TOKEN_KEY);
  durable().removeItem(USER_KEY);
  durable().removeItem(REFRESH_TOKEN_KEY);
  ephemeral().removeItem(TOKEN_KEY);
  ephemeral().removeItem(USER_KEY);
  ephemeral().removeItem(REFRESH_TOKEN_KEY);
}

export function hasSession(): boolean {
  return Boolean(readSession(TOKEN_KEY));
}
