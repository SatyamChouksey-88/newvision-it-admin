import type { AuthProvider } from '@refinedev/core';
import { httpClient } from './axios';
import { clearSession, hasSession, readSession, TOKEN_KEY, USER_KEY, writeSession } from './session';

export interface Identity {
  id: number;
  email: string;
  fullName: string;
  role: string;
  employeeId: number | null;
  permissions?: string[];
}

export const authProvider: AuthProvider = {
  login: async ({ email, password, remember }) => {
    try {
      const { data } = await httpClient.post('/auth/login', { email, password });
      const persist = remember !== false;
      writeSession(TOKEN_KEY, data.access_token, persist);
      writeSession(USER_KEY, JSON.stringify(data.user), persist);
      // Return the user to the page they were on when their session expired (same-origin paths only).
      const to = new URLSearchParams(window.location.search).get('to');
      const redirectTo = to?.startsWith('/') && !to.startsWith('//') ? to : '/';
      return { success: true, redirectTo };
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const message =
        status === 401 || status === 400
          ? 'Invalid email or password'
          : 'Could not reach the server. Check your connection and try again.';
      return {
        success: false,
        error: { name: 'LoginError', message },
      };
    }
  },

  logout: async () => {
    clearSession();
    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    if (hasSession()) {
      return { authenticated: true };
    }
    return { authenticated: false, redirectTo: '/login' };
  },

  onError: async (error) => {
    if (error?.response?.status === 401) {
      return { logout: true, redirectTo: '/login', error };
    }
    return {};
  },

  getIdentity: async (): Promise<Identity | null> => {
    const raw = readSession(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as Identity;
    } catch {
      return null;
    }
  },

  getPermissions: async (): Promise<string | null> => {
    const raw = readSession(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return (JSON.parse(raw) as Identity).role;
    } catch {
      return null;
    }
  },
};
