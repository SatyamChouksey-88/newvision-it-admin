import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

interface Bucket {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

/** In-memory brute-force throttle for login / forgot-password. Fine on a single API process. */
@Injectable()
export class LoginRateLimitService {
  private readonly byKey = new Map<string, Bucket>();

  private skipThrottle(): boolean {
    if (process.env.FORCE_LOGIN_RATE_LIMIT === 'true') return false;
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') return true;
    return false;
  }

  assertAllowed(ip: string, email?: string): void {
    if (this.skipThrottle()) return;
    this.prune();
    for (const key of this.keys(ip, email)) {
      const bucket = this.byKey.get(key);
      if (bucket && bucket.lockedUntil > Date.now()) {
        throw new HttpException(
          'Too many attempts. Try again in 15 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  recordFailure(ip: string, email?: string): void {
    if (this.skipThrottle()) return;
    const now = Date.now();
    for (const key of this.keys(ip, email)) {
      const existing = this.byKey.get(key);
      if (!existing || now - existing.windowStart > WINDOW_MS) {
        this.byKey.set(key, { failures: 1, windowStart: now, lockedUntil: 0 });
        continue;
      }
      existing.failures += 1;
      if (existing.failures >= MAX_FAILURES) {
        existing.lockedUntil = now + WINDOW_MS;
      }
    }
  }

  recordSuccess(ip: string, email?: string): void {
    for (const key of this.keys(ip, email)) {
      this.byKey.delete(key);
    }
  }

  private keys(ip: string, email?: string): string[] {
    const keys = [`ip:${ip || 'unknown'}`];
    if (email) keys.push(`email:${email.trim().toLowerCase()}`);
    return keys;
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, bucket] of this.byKey) {
      if (bucket.lockedUntil && bucket.lockedUntil < now && now - bucket.windowStart > WINDOW_MS) {
        this.byKey.delete(key);
      }
    }
  }
}
