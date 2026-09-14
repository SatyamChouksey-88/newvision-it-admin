import axios from 'axios';
import { clearSession, readSession, TOKEN_KEY, USER_KEY, writeSession } from './session';

function resolveApiUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!raw) return 'http://localhost:3000/api';
  const noSlash = raw.replace(/\/$/, '');
  return noSlash.endsWith('/api') ? noSlash : `${noSlash}/api`;
}

export const API_URL = resolveApiUrl();
export { TOKEN_KEY, USER_KEY } from './session';

export const httpClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let refreshInFlight: Promise<string | null> | null = null;

/** Exchanges the httpOnly refresh cookie for a new access token. Never throws. */
async function tryRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        if (!data?.access_token) return null;
        writeSession(TOKEN_KEY, data.access_token);
        if (data.user) writeSession(USER_KEY, JSON.stringify(data.user));
        return data.access_token as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** On boot: if this tab has no access token, try the refresh cookie ("Keep me signed in"). */
export async function restoreSession(): Promise<boolean> {
  if (readSession(TOKEN_KEY)) return true;
  const token = await tryRefresh();
  return Boolean(token);
}

httpClient.interceptors.request.use((config) => {
  const token = readSession(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config ?? {};
    const url: string = config.url ?? '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && !isAuthRoute && !config.__retried) {
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
