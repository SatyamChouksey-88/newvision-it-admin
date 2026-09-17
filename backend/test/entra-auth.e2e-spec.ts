import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, seedCore, TestContext } from './helpers';

/**
 * Phase 2 — exercises the real "Sign in with Microsoft" flow end-to-end against the built-in
 * mock IdP: redirect → mock authorize → authorization-code + PKCE exchange → real RS256 ID
 * token signed by the mock IdP and verified via its JWKS → account-linking lookup → app JWT
 * issuance. This is the exact code path a real Entra tenant would exercise — only
 * entraIssuerUrl() differs (see entra-config.ts) — so this is a genuine integration test of
 * the OIDC mechanics, not a stub.
 *
 * The app under test must actually be network-reachable: openid-client's discovery/token-
 * exchange calls are real outbound HTTP requests made by the backend to itself, which bypass
 * Supertest's in-process request handling. So this file listens on a real (ephemeral) port and
 * points PUBLIC_API_URL at it, rather than reusing the shared in-process-only app helper as-is.
 */
describe('Microsoft Entra ID sign-in (e2e, via the built-in mock IdP)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let baseUrl: string;
  const prevPublicApiUrl = process.env.PUBLIC_API_URL;

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0);
    const port = (app.getHttpServer().address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
    process.env.PUBLIC_API_URL = `${baseUrl}/api`;
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma, app);
  });

  afterAll(async () => {
    if (prevPublicApiUrl === undefined) delete process.env.PUBLIC_API_URL;
    else process.env.PUBLIC_API_URL = prevPublicApiUrl;
    await app.close();
  });

  /** Drives the full browser-redirect chain a real login_hint would take, entirely over HTTP. */
  async function runEntraLogin(loginHint: string) {
    const step1 = await request(baseUrl).get(`/api/auth/entra/login?login_hint=${encodeURIComponent(loginHint)}`);
    expect(step1.status).toBe(302);
    const authorizeUrl = new URL(step1.headers.location);

    const step2 = await request(baseUrl).get(authorizeUrl.pathname + authorizeUrl.search);
    expect(step2.status).toBe(302);
    const callbackUrl = new URL(step2.headers.location);

    const step3 = await request(baseUrl).get(callbackUrl.pathname + callbackUrl.search);
    expect(step3.status).toBe(302);
    return new URL(step3.headers.location);
  }

  it('discovery, JWKS, and status endpoints are reachable', async () => {
    const discovery = await request(baseUrl).get('/api/mock-idp/.well-known/openid-configuration').expect(200);
    expect(discovery.body.issuer).toBe(`${baseUrl}/api/mock-idp`);
    expect(discovery.body.jwks_uri).toBe(`${baseUrl}/api/mock-idp/jwks`);

    const jwks = await request(baseUrl).get('/api/mock-idp/jwks').expect(200);
    expect(jwks.body.keys).toHaveLength(1);
    expect(jwks.body.keys[0].kid).toBe('mock-idp-key-1');

    const status = await request(baseUrl).get('/api/auth/entra/status').expect(200);
    expect(status.body).toEqual({ available: true, configured: false });
  });

  it('links Microsoft sign-in to an existing local account by email when entraObjectId was not set yet', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'itadmin@newvision.local' } });
    await prisma.user.update({ where: { id: user.id }, data: { entraObjectId: null } });

    const redirect = await runEntraLogin('itadmin@newvision.local');
    expect(redirect.pathname).toBe('/auth/entra/complete');
    const handoff = redirect.searchParams.get('handoff');
    const exchanged = await request(baseUrl).post('/api/auth/entra/exchange').send({ handoff }).expect(200);
    expect(exchanged.body.user.email).toBe('itadmin@newvision.local');

    const linked = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(linked.entraObjectId).toBe('mock-oid-itadmin');
  });

  it('JIT-provisions a new Employee on first Microsoft sign-in', async () => {
    await prisma.user.deleteMany({ where: { email: 'jit.newhire@newvision.local' } });

    const redirect = await runEntraLogin('jit.newhire@newvision.local');
    expect(redirect.pathname).toBe('/auth/entra/complete');
    const handoff = redirect.searchParams.get('handoff');
    const exchanged = await request(baseUrl).post('/api/auth/entra/exchange').send({ handoff }).expect(200);
    expect(exchanged.body.user.email).toBe('jit.newhire@newvision.local');
    expect(exchanged.body.user.role).toBe('EMPLOYEE');

    const row = await prisma.user.findUniqueOrThrow({ where: { email: 'jit.newhire@newvision.local' } });
    expect(row.entraObjectId).toBe('mock-oid-jit-newhire');
    expect(row.entraDepartment).toBe('Engineering');
  });

  it('completes sign-in end-to-end for a linked, active, non-Super-Admin account', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'itadmin@newvision.local' } });
    await prisma.user.update({ where: { id: user.id }, data: { entraObjectId: 'mock-oid-itadmin' } });

    const redirect = await runEntraLogin('itadmin@newvision.local');
    expect(redirect.pathname).toBe('/auth/entra/complete');
    const handoff = redirect.searchParams.get('handoff');
    expect(handoff).toBeTruthy();

    const exchanged = await request(baseUrl)
      .post('/api/auth/entra/exchange')
      .send({ handoff })
      .expect(200);
    expect(exchanged.body.access_token).toBeTruthy();
    expect(exchanged.body.user.email).toBe('itadmin@newvision.local');

    // The issued token is a real, working app JWT — not a placeholder.
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(auth(exchanged.body.access_token))
      .expect(200);
    expect(me.body.role).toBe('IT_ADMIN');

    // A handoff code is single-use.
    await request(baseUrl).post('/api/auth/entra/exchange').send({ handoff }).expect(400);
  });

  it('sends an unenrolled Super Admin through the same MFA-setup handoff the password flow uses', async () => {
    const superAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'superadmin@newvision.local' } });
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { entraObjectId: 'mock-oid-superadmin' },
    });

    // test-env.ts sets REQUIRE_SUPERADMIN_MFA=false for the whole suite so unrelated tests
    // don't need to enroll TOTP; this test is specifically about the enforced-MFA path, so it
    // overrides that locally, matching the pattern in prompt32-security.e2e-spec.ts.
    const prevRequireMfa = process.env.REQUIRE_SUPERADMIN_MFA;
    delete process.env.REQUIRE_SUPERADMIN_MFA;
    let exchanged: request.Response;
    try {
      const redirect = await runEntraLogin('superadmin@newvision.local');
      const handoff = redirect.searchParams.get('handoff');
      exchanged = await request(baseUrl).post('/api/auth/entra/exchange').send({ handoff }).expect(200);
    } finally {
      if (prevRequireMfa === undefined) delete process.env.REQUIRE_SUPERADMIN_MFA;
      else process.env.REQUIRE_SUPERADMIN_MFA = prevRequireMfa;
    }
    expect(exchanged.body.mfaSetupRequired).toBe(true);
    expect(exchanged.body.mfa_token).toBeTruthy();
    expect(exchanged.body.access_token).toBeUndefined();

    // The mfa_token this handoff produced is a real, working token against the *existing*
    // MFA endpoints (auth.controller.ts) — Entra sign-in reuses that flow unmodified.
    const { generateTotpSecret, totpCode } = await import('../src/auth/totp');
    const { encryptString } = await import('../src/common/crypto-secret');
    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { totpSecretEnc: encryptString(secret), totpEnabled: false },
    });
    const verified = await request(baseUrl)
      .post('/api/auth/mfa/verify')
      .send({ mfa_token: exchanged.body.mfa_token, code: totpCode(secret) })
      .expect(200);
    expect(verified.body.access_token).toBeTruthy();

    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { totpEnabled: false, totpSecretEnc: null },
    });
  });

  it('rejects sign-in for a deactivated linked account', async () => {
    const employee = await prisma.user.findUniqueOrThrow({ where: { email: 'employee@newvision.local' } });
    await prisma.user.update({
      where: { id: employee.id },
      data: { entraObjectId: 'mock-oid-employee', isActive: false },
    });

    const redirect = await runEntraLogin('employee@newvision.local');
    expect(redirect.pathname).toBe('/login');
    expect(redirect.searchParams.get('entraError')).toBe('verification_failed');

    await prisma.user.update({ where: { id: employee.id }, data: { isActive: true } });
  });

  it('refuses a replayed/reused state parameter (each authorization attempt is single-use)', async () => {
    const manager = await prisma.user.findUniqueOrThrow({ where: { email: 'manager@newvision.local' } });
    await prisma.user.update({ where: { id: manager.id }, data: { entraObjectId: 'mock-oid-manager' } });

    const step1 = await request(baseUrl).get('/api/auth/entra/login?login_hint=manager@newvision.local');
    const authorizeUrl = new URL(step1.headers.location);
    const step2 = await request(baseUrl).get(authorizeUrl.pathname + authorizeUrl.search);
    const callbackUrl = new URL(step2.headers.location);

    const first = await request(baseUrl).get(callbackUrl.pathname + callbackUrl.search);
    expect(first.status).toBe(302);
    expect(new URL(first.headers.location).pathname).not.toBe('/login');

    // Replaying the exact same callback (same code+state) a second time must not succeed —
    // the code was already consumed by the mock IdP's /token endpoint, and the state was
    // already consumed by our own callback handler.
    const replay = await request(baseUrl).get(callbackUrl.pathname + callbackUrl.search);
    expect(replay.status).toBe(302);
    expect(new URL(replay.headers.location).searchParams.get('entraError')).toBeTruthy();
  });

  it('rejects an unknown login_hint at the mock IdP with a clear error, not a silent fallback', async () => {
    const step1 = await request(baseUrl).get(
      '/api/auth/entra/login?login_hint=' + encodeURIComponent('nobody@nowhere.example'),
    );
    const authorizeUrl = new URL(step1.headers.location);
    const step2 = await request(baseUrl).get(authorizeUrl.pathname + authorizeUrl.search);
    expect(step2.status).toBe(400);
  });

  it('ids fixture stays usable (sanity check the shared seed still ran)', () => {
    expect(ids.locationPune).toBeGreaterThan(0);
  });
});
