/** Phase 2 — "Sign in with Microsoft" helpers shared between the login page and the handoff page. */
import { API_URL } from './axios';

/** sessionStorage key EntraCompletePage uses to hand an MFA challenge back to the login page. */
export const ENTRA_MFA_HANDOFF_KEY = 'newvision:entraMfaChallenge';

export function entraLoginUrl(): string {
  return `${API_URL}/auth/entra/login`;
}

const ENTRA_ERROR_COPY: Record<string, string> = {
  no_linked_account:
    'This Microsoft account is not yet linked to a NewVision login. Sign in with your email and password, or ask your Super Admin to link your account.',
  verification_failed: 'Microsoft sign-in could not be verified. Please try again.',
  expired_or_replayed: 'That sign-in link expired or was already used. Please try again.',
  missing_state: 'Microsoft sign-in did not complete correctly. Please try again.',
};

export function entraErrorMessage(code: string): string {
  return ENTRA_ERROR_COPY[code] ?? 'Microsoft sign-in failed. Please try again.';
}
