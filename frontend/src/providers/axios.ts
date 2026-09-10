import axios from 'axios';
import { clearSession, readSession, REFRESH_TOKEN_KEY, TOKEN_KEY, writeSession } from './session';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export { TOKEN_KEY, USER_KEY } from './session';

export const httpClient = axios.create({ baseURL: API_URL });

httpClient.interceptors.request.use((config) => {
  const token = readSession(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Persisted the same way the access token was (localStorage vs sessionStorage). */
function persistedDurably(): boolean {
  return localStorage.getItem(TOKEN_KEY) !== null;
}

let refreshInFlight: Promise<string | null> | null = null;

/** Exchanges the stored refresh token for a new access/refresh pair. Never throws. */
async function tryRefresh(): Promise<string | null> {
  const refreshToken = readSession(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
      .then(({ data }) => {
        const persist = persistedDurably();
        writeSession(TOKEN_KEY, data.access_token, persist);
        writeSession(REFRESH_TOKEN_KEY, data.refresh_token, persist);
        return data.access_token as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Expired/invalid session: most screens call the API directly (not through Refine's data
 * provider), so Refine's `onError` never sees the 401. On a 401, try one silent refresh before
 * giving up — access tokens are short-lived (30m) by design, so this is the common case, not
 * the exception. Only clear the session and bounce to /login if the refresh itself fails.
 */
httpClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config ?? {};
    const url: string = config.url ?? '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && !isAuthRoute && readSession(TOKEN_KEY) && !config.__retried) {
      const newToken = await tryRefresh();
      if (newToken) {
        config.__retried = true;
        config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${newToken}` };
        return httpClient.request(config);
      }
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        const next = window.location.pathname + window.location.search;
        window.location.assign(`/login?to=${encodeURIComponent(next)}`);
      }
    }
    return Promise.reject(error);
  },
);

/** Human-readable message from an API error (NestJS `{ message }` or validation arrays). */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const data = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}
