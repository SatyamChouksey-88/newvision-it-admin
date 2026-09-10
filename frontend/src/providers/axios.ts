import axios from 'axios';
import { clearSession, readSession, TOKEN_KEY } from './session';

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

/**
 * Expired/invalid session: most screens call the API directly (not through Refine's data
 * provider), so Refine's `onError` never sees the 401. Clear the session here and send the
 * user to the login page once, instead of leaving every widget silently empty.
 */
httpClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    if (status === 401 && !url.includes('/auth/login') && readSession(TOKEN_KEY)) {
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
