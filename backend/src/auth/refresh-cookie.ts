import type { CookieOptions, Request, Response } from 'express';

export const REFRESH_COOKIE = 'nv_refresh';

export function refreshCookieOptions(remember: boolean): CookieOptions {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : undefined,
  };
}

export function setRefreshCookie(res: Response, token: string, remember: boolean): void {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions(remember));
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(true), maxAge: 0 });
}

export function readRefreshCookie(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const value = cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function includeRefreshInBody(): boolean {
  return process.env.NODE_ENV !== 'production';
}
