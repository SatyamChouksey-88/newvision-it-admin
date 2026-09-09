import type { AuthProvider } from '@refinedev/core';
import { httpClient, TOKEN_KEY, USER_KEY } from './axios';

export interface Identity {
  id: number;
  email: string;
  fullName: string;
  role: string;
  employeeId: number | null;
  permissions?: string[];
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const { data } = await httpClient.post('/auth/login', { email, password });
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return { success: true, redirectTo: '/' };
    } catch {
      return {
        success: false,
        error: { name: 'LoginError', message: 'Invalid email or password' },
      };
    }
  },

  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
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
    const raw = localStorage.getItem(USER_KEY);
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
    const raw = localStorage.getItem(USER_KEY);
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
