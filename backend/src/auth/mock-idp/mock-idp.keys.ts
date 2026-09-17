import * as crypto from 'node:crypto';

/**
 * A fresh, ephemeral RSA keypair generated once per process, used only to sign mock ID tokens
 * for local/CI testing of the Entra ID sign-in flow (Phase 2). Never used against anything
 * other than this process's own /mock-idp endpoints, and never runs in production — see the
 * `mockIdpEnabled()` gate in mock-idp.module.ts.
 */
const KEY_ID = 'mock-idp-key-1';

let cached: { privateKeyPem: string; publicKey: crypto.KeyObject } | null = null;

function keys() {
  if (!cached) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    cached = {
      privateKeyPem: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
      publicKey,
    };
  }
  return cached;
}

export function mockIdpKeyId(): string {
  return KEY_ID;
}

export function mockIdpPrivateKeyPem(): string {
  return keys().privateKeyPem;
}

/** JWKS document (RFC 7517) exposing the public half so a real OIDC client can verify signatures. */
export function mockIdpJwks(): { keys: Record<string, unknown>[] } {
  const jwk = keys().publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  return {
    keys: [{ ...jwk, kid: KEY_ID, use: 'sig', alg: 'RS256' }],
  };
}
