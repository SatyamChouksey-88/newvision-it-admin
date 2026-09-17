import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

interface PendingLogin {
  nonce: string;
  codeVerifier: string;
  createdAt: number;
}

interface Handoff {
  /** Either a completed login ({access_token, user, refresh_token}) or an MFA challenge
   * ({mfaRequired/mfaSetupRequired, mfa_token, ...}) — same two shapes AuthService already
   * returns from login(), so the frontend's existing MFA UI works unmodified for Entra too. */
  payload: Record<string, unknown>;
  createdAt: number;
}

const LOGIN_TTL_MS = 10 * 60 * 1000; // matches typical IdP authorization-code lifetimes
const HANDOFF_TTL_MS = 60 * 1000; // the browser redirect + one fetch should take well under this

/**
 * In-memory, single-process stores for the two short-lived secrets the Entra login flow needs
 * server-side state for (Phase 2):
 *  - the `state` param, so /auth/entra/callback can recover the PKCE verifier + nonce it needs
 *    to complete the token exchange and validate the ID token;
 *  - a one-time "handoff" code, so the browser redirect back to the frontend never carries the
 *    real access token in a URL/history entry — only an opaque, single-use code that the
 *    frontend immediately exchanges over POST.
 * Same "fine on a single API process" caveat as LoginRateLimitService — acceptable for this
 * phase; would need a shared store (Redis) before running multiple API instances.
 */
@Injectable()
export class EntraStateStore {
  private readonly logins = new Map<string, PendingLogin>();
  private readonly handoffs = new Map<string, Handoff>();

  savePendingLogin(state: string, entry: Omit<PendingLogin, 'createdAt'>): void {
    this.prune();
    this.logins.set(state, { ...entry, createdAt: Date.now() });
  }

  /** Single-use — the state is consumed whether or not it's found. */
  takePendingLogin(state: string): PendingLogin | undefined {
    const entry = this.logins.get(state);
    this.logins.delete(state);
    if (!entry || Date.now() - entry.createdAt > LOGIN_TTL_MS) return undefined;
    return entry;
  }

  createHandoff(payload: Record<string, unknown>): string {
    this.prune();
    const code = crypto.randomBytes(32).toString('hex');
    this.handoffs.set(code, { payload, createdAt: Date.now() });
    return code;
  }

  /** Single-use — the handoff is consumed whether or not it's found. */
  takeHandoff(code: string): Handoff | undefined {
    const entry = this.handoffs.get(code);
    this.handoffs.delete(code);
    if (!entry || Date.now() - entry.createdAt > HANDOFF_TTL_MS) return undefined;
    return entry;
  }

  private prune(): void {
    const now = Date.now();
    for (const [k, v] of this.logins) if (now - v.createdAt > LOGIN_TTL_MS) this.logins.delete(k);
    for (const [k, v] of this.handoffs) if (now - v.createdAt > HANDOFF_TTL_MS) this.handoffs.delete(k);
  }
}
