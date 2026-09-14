import { Prisma, TenantPlan, TenantStatus } from '@prisma/client';

export type TenantModules = {
  procurement: boolean;
  chat: boolean;
  maintenance: boolean;
};

export const TEAM_MODULES: TenantModules = {
  procurement: true,
  chat: true,
  maintenance: true,
};

export const STARTER_MODULES: TenantModules = {
  procurement: false,
  chat: false,
  maintenance: false,
};

export const TRIAL_DAYS = 14;

export type TenantRecord = {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  mailFromName: string | null;
  mailFromAddress: string | null;
  plan: TenantPlan;
  status: TenantStatus;
  trialEndsAt: Date | null;
  modules: TenantModules;
  seatCap: number;
  onboarding: unknown;
  activatedAt: Date | null;
  closedAt: Date | null;
};

export function parseModules(raw: unknown): TenantModules {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    procurement: obj.procurement === true,
    chat: obj.chat === true,
    maintenance: obj.maintenance === true,
  };
}

export function trialExpired(tenant: { status: TenantStatus; trialEndsAt: Date | null }): boolean {
  if (tenant.status !== 'trial') return false;
  if (!tenant.trialEndsAt) return false;
  return tenant.trialEndsAt.getTime() < Date.now();
}

/** Trial = Team features. After expiry without payment, fall back to Starter modules. */
export function effectiveModules(tenant: {
  plan: TenantPlan;
  status: TenantStatus;
  trialEndsAt: Date | null;
  modules: Prisma.JsonValue | TenantModules;
}): TenantModules {
  if (tenant.status === 'cancelled') return STARTER_MODULES;
  if (tenant.status === 'trial' && !trialExpired(tenant)) return TEAM_MODULES;
  if (tenant.plan === 'team' && tenant.status === 'active') {
    const parsed = parseModules(tenant.modules);
    return {
      procurement: parsed.procurement,
      chat: parsed.chat,
      maintenance: parsed.maintenance,
    };
  }
  return STARTER_MODULES;
}

export function trialDaysRemaining(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function emptyOnboarding() {
  return {
    importEmployees: false,
    importAssets: false,
    assignedAsset: false,
    scannedQr: false,
    resolvedTicket: false,
    skipped: false,
  };
}

export type OnboardingState = ReturnType<typeof emptyOnboarding>;

export function onboardingComplete(raw: unknown): boolean {
  // Legacy workspaces (tenant 1 / pre-SaaS) have null onboarding — do not lock their modules.
  if (raw == null) return true;
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<OnboardingState>;
  if (o.skipped) return true;
  return Boolean(
    o.importEmployees && o.importAssets && o.assignedAsset && o.scannedQr && o.resolvedTicket,
  );
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'company';
}
