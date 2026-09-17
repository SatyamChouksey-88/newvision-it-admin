import * as crypto from 'node:crypto';
import { BadRequestException, Controller, Get, HttpCode, Post, Query, Res, Body } from '@nestjs/common';
import type { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { Public } from '../../common/decorators/public.decorator';
import { publicApiUrl } from '../entra/entra-config';
import { mockIdpJwks, mockIdpKeyId, mockIdpPrivateKeyPem } from './mock-idp.keys';
import { findMockIdpUser, MOCK_TENANT_ID } from './mock-idp-users';

interface PendingAuth {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce?: string;
  codeChallenge?: string;
  user: { oid: string; email: string; name: string; department?: string; groups?: string[] };
  createdAt: number;
}

const CODE_TTL_MS = 5 * 60 * 1000;

/**
 * A minimal, spec-shaped OpenID Connect provider standing in for a real Microsoft Entra ID
 * tenant during local development and CI (Phase 2). It implements just enough of the
 * authorization-code + PKCE flow — discovery, authorize, token, JWKS — for the real
 * `EntraService` (entra/entra.service.ts) to authenticate against it using the exact same code
 * path it would use against the real login.microsoftonline.com. Registered only when
 * `mockIdpEnabled()` is true (never in production — see mock-idp.module.ts).
 *
 * This is a stand-in, not a security boundary: it accepts any client_secret and does not rate
 * limit. It must never be reachable outside local/CI use.
 */
@Controller('mock-idp')
export class MockIdpController {
  private readonly pending = new Map<string, PendingAuth>();

  private prune() {
    const now = Date.now();
    for (const [code, entry] of this.pending) {
      if (now - entry.createdAt > CODE_TTL_MS) this.pending.delete(code);
    }
  }

  @Public()
  @Get('.well-known/openid-configuration')
  discovery() {
    const base = `${publicApiUrl()}/mock-idp`;
    return {
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      jwks_uri: `${base}/jwks`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    };
  }

  @Public()
  @Get('jwks')
  jwks() {
    return mockIdpJwks();
  }

  /**
   * Stands in for the real sign-in page. A real Entra tenant would show a Microsoft login UI
   * here; this just resolves `login_hint` (or defaults to the IT Admin demo account) straight
   * to a mock identity and redirects back with an authorization code — there is no password
   * prompt because there is no real credential to check.
   */
  @Public()
  @Get('authorize')
  authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('state') state: string,
    @Query('nonce') nonce: string | undefined,
    @Query('code_challenge') codeChallenge: string | undefined,
    @Query('code_challenge_method') codeChallengeMethod: string | undefined,
    @Query('login_hint') loginHint: string | undefined,
    @Res() res: Response,
  ) {
    this.prune();
    if (responseType !== 'code') {
      throw new BadRequestException('mock-idp only supports response_type=code');
    }
    if (!redirectUri || !state) {
      throw new BadRequestException('redirect_uri and state are required');
    }
    if (codeChallenge && codeChallengeMethod !== 'S256') {
      throw new BadRequestException('mock-idp only supports code_challenge_method=S256');
    }
    const user = findMockIdpUser(loginHint || 'itadmin@newvision.local');
    if (!user) {
      throw new BadRequestException(`No mock identity for login_hint=${loginHint}`);
    }
    const code = crypto.randomBytes(24).toString('hex');
    this.pending.set(code, {
      clientId,
      redirectUri,
      state,
      nonce,
      codeChallenge,
      user,
      createdAt: Date.now(),
    });
    const url = new URL(redirectUri);
    url.searchParams.set('code', code);
    url.searchParams.set('state', state);
    return res.redirect(url.toString());
  }

  @Public()
  @Post('token')
  @HttpCode(200)
  token(
    @Body('grant_type') grantType: string,
    @Body('code') code: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('code_verifier') codeVerifier: string | undefined,
  ) {
    this.prune();
    if (grantType !== 'authorization_code') {
      throw new BadRequestException('mock-idp only supports grant_type=authorization_code');
    }
    const entry = code ? this.pending.get(code) : undefined;
    if (!entry) throw new BadRequestException('Unknown or expired code');
    this.pending.delete(code); // authorization codes are single-use
    if (entry.redirectUri !== redirectUri) {
      throw new BadRequestException('redirect_uri mismatch');
    }
    if (entry.codeChallenge) {
      const computed = crypto
        .createHash('sha256')
        .update(codeVerifier || '')
        .digest('base64url');
      if (computed !== entry.codeChallenge) {
        throw new BadRequestException('PKCE verification failed');
      }
    }
    const now = Math.floor(Date.now() / 1000);
    const base = `${publicApiUrl()}/mock-idp`;
    const idTokenClaims: Record<string, unknown> = {
      iss: base,
      aud: entry.clientId,
      sub: entry.user.oid,
      oid: entry.user.oid,
      tid: MOCK_TENANT_ID,
      email: entry.user.email,
      preferred_username: entry.user.email,
      name: entry.user.name,
      iat: now,
      exp: now + 300,
    };
    if (entry.user.department) idTokenClaims.department = entry.user.department;
    if (entry.user.groups?.length) idTokenClaims.groups = entry.user.groups;
    if (entry.nonce) idTokenClaims.nonce = entry.nonce;
    const id_token = jwt.sign(idTokenClaims, mockIdpPrivateKeyPem(), {
      algorithm: 'RS256',
      keyid: mockIdpKeyId(),
    });
    return {
      token_type: 'Bearer',
      access_token: crypto.randomBytes(16).toString('hex'),
      id_token,
      expires_in: 300,
      scope: 'openid profile email',
    };
  }
}
