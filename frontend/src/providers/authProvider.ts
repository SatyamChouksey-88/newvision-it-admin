import type { AuthProvider } from '@refinedev/core';
import { httpClient } from './axios';
import { clearSession, hasSession, readSession, TOKEN_KEY, USER_KEY, writeSession } from './session';

export interface Identity {
  id: number;
  email: string;
  fullName: string;
  role: string;
  employeeId: number | null;
  locationId?: number | null;
  permissions?: string[];
  emailNotifyPref?: 'immediate' | 'daily_digest';
  totpEnabled?: boolean;
  tenantId?: number;
  tenantSlug?: string;
  tenant?: {
    id: number;
    slug: string;
    name: string;
    logoUrl?: string | null;
    plan: 'starter' | 'team';
    status: 'trial' | 'active' | 'expired' | 'cancelled';
    trialDaysRemaining?: number | null;
    modules: { procurement: boolean; chat: boolean; maintenance: boolean };
    onboardingComplete?: boolean;
    onboarding?: Record<string, boolean> | null;
  };
}

export const authProvider: AuthProvider = {
  login: async ({ email, password, remember }) => {
    try {
      const { data } = await httpClient.post('/auth/login', {
        email,
        password,
        remember: remember !== false,
      });
      if (!data?.access_token || !data?.user) {
        return {
          success: false,
          error: { name: 'LoginError', message: 'Invalid email or password' },
        };
      }
      writeSession(TOKEN_KEY, data.access_token);
      writeSession(USER_KEY, JSON.stringify(data.user));
      const to = new URLSearchParams(window.location.search).get('to');
      const redirectTo = to?.startsWith('/') && !to.startsWith('//') ? to : '/';
      return { success: true, redirectTo };
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const message =
        status === 429
          ? 'Too many attempts. Try again in 15 minutes.'
          : status === 401 || status === 400
            ? 'Invalid email or password'
            : 'Could not reach the server. Check your connection and try again.';
      return {
        success: false,
        error: { name: 'LoginError', message },
      };
    }
  },

  logout: async () => {
    try {
      await httpClient.post('/auth/logout');
    } catch {
      // Best-effort server-side refresh-token revocation; local session is cleared regardless.
    }
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
