/**
 * Phase 2 — Microsoft Entra ID configuration. Every value comes from an env var; nothing is
 * ever hardcoded, and none of these have real values checked into this repo (see
 * backend/.env.example).
 */

/**
 * This backend's own public base URL (including the /api prefix), needed so it can build a
 * callback/redirect URI pointing back at itself and, in dev, serve the mock IdP's endpoints
 * under its own origin. Distinct from PUBLIC_APP_URL, which is the *frontend's* URL.
 */
export function publicApiUrl(): string {
  return (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}/api`).replace(
    /\/$/,
    '',
  );
}

/** True once a real Entra app registration's values are present. */
export function entraConfigured(): boolean {
  return Boolean(
    process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET,
  );
}

/**
 * Dev/test-only stand-in for a real Entra tenant (see mock-idp/). Defaults on outside
 * production so this phase is testable without a real Entra app registration; sourced from
 * env so it can be disabled explicitly (MOCK_ENTRA_IDP_ENABLED=false) even in dev, and it is
 * hard-disabled in production regardless of the env var.
 */
export function mockIdpEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.MOCK_ENTRA_IDP_ENABLED !== 'false';
}

/**
 * The OIDC issuer to authenticate against. A real Entra v2.0 tenant issuer
 * (`https://login.microsoftonline.com/<tenant>/v2.0`) once MS_TENANT_ID is set and Entra is
 * genuinely configured; otherwise this process's own mock IdP, so the exact same client code
 * (discovery, PKCE, token exchange, signature verification) runs against both.
 */
export function entraIssuerUrl(): string {
  if (entraConfigured()) {
    return `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/v2.0`;
  }
  return `${publicApiUrl()}/mock-idp`;
}

export function entraClientId(): string {
  return entraConfigured() ? (process.env.MS_CLIENT_ID as string) : 'mock-client-id';
}

export function entraClientSecret(): string {
  return entraConfigured() ? (process.env.MS_CLIENT_SECRET as string) : 'mock-client-secret';
}

export function entraExpectedTenantId(): string | undefined {
  return entraConfigured() ? process.env.MS_TENANT_ID : undefined;
}

/** Where Entra (or the mock IdP) redirects back to after the user authenticates. */
export function entraRedirectUri(): string {
  return process.env.MS_REDIRECT_URI || `${publicApiUrl()}/auth/entra/callback`;
}

/** Slug of the single internal workspace (NewVision) used when JIT-provisioning users. */
export function entraJitTenantSlug(): string {
  return process.env.ENTRA_JIT_TENANT_SLUG || 'newvision';
}

/**
 * When set, the ID token must include this group object id in its `groups` claim (or
 * `hasgroups` + overage flow is out of scope until a real tenant is wired). Satyam must
 * create the group in Entra first — see docs/TECHNICAL_REFERENCE.md#entra-jit-eligibility-microsoft-side-setup.
 */
export function entraApprovedSecurityGroupId(): string | undefined {
  const v = process.env.MS_APPROVED_SECURITY_GROUP_ID?.trim();
  return v || undefined;
}

/**
 * Phase 4 — once Entra Conditional Access is confirmed to require MFA for this app, set
 * ENTRA_SATISFIES_MFA=true so Microsoft sign-in skips the local Super Admin TOTP gate.
 * Password logins still use hand-rolled TOTP. Never enable until CA is verified in Entra.
 */
export function entraSatisfiesMfa(): boolean {
  return process.env.ENTRA_SATISFIES_MFA === 'true';
}

/** Comma-separated allowlist for first Entra JIT/link bootstrap to Super Admin (Phase 13). */
export function initialSuperAdminEmails(): Set<string> {
  const raw = process.env.INITIAL_SUPER_ADMIN_EMAILS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isInitialSuperAdminEmail(email: string): boolean {
  return initialSuperAdminEmails().has(email.trim().toLowerCase());
}
