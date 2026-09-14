import { afterEach, describe, expect, it } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import { LoginRateLimitService } from './login-rate-limit';

describe('LoginRateLimitService', () => {
  const prev = process.env.FORCE_LOGIN_RATE_LIMIT;

  afterEach(() => {
    if (prev === undefined) delete process.env.FORCE_LOGIN_RATE_LIMIT;
    else process.env.FORCE_LOGIN_RATE_LIMIT = prev;
  });

  it('locks an IP after 8 failures', () => {
    process.env.FORCE_LOGIN_RATE_LIMIT = 'true';
    const svc = new LoginRateLimitService();
    for (let i = 0; i < 8; i++) svc.recordFailure('203.0.113.9', 'a@b.c');
    expect(() => svc.assertAllowed('203.0.113.9', 'a@b.c')).toThrow(HttpException);
    svc.recordSuccess('203.0.113.9', 'a@b.c');
    expect(() => svc.assertAllowed('203.0.113.9', 'a@b.c')).not.toThrow();
  });
});
