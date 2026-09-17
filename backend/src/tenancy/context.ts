import { AsyncLocalStorage } from 'node:async_hooks';

type Store =
  | { tenantId: number; unscoped?: false }
  | { unscoped: true; tenantId?: undefined };

const als = new AsyncLocalStorage<Store>();

let testFallbackTenantId: number | undefined;

export function setTestTenant(id: number | undefined): void {
  testFallbackTenantId = id;
}

export function getTenantStore(): Store | undefined {
  return als.getStore();
}

export function isUnscoped(): boolean {
  return als.getStore()?.unscoped === true;
}

/** Tenant id for this request/task, or undefined when running unscoped. */
export function resolveTenantId(): number | undefined {
  const store = als.getStore();
  if (store?.unscoped) return undefined;
  if (store?.tenantId) return store.tenantId;
  if (process.env.NODE_ENV === 'test' && testFallbackTenantId) return testFallbackTenantId;
  return undefined;
}

export function requireTenantId(): number {
  const id = resolveTenantId();
  if (id == null) {
    throw new Error('Missing tenant context');
  }
  return id;
}

/**
 * Always enter via an async callback so Prisma's `$allOperations` (a microtask)
 * still sees the store. A sync `als.run(() => prisma.findUnique())` exits before
 * the extension hook runs, which made live login throw "Missing tenant context".
 */
/** Async-only ALS wrapper — keeps tenant context across `await` (Node 18+). */
export async function runWithTenant<T>(tenantId: number, fn: () => Promise<T> | T): Promise<T> {
  return als.run({ tenantId }, () => Promise.resolve(fn()));
}

export async function runUnscoped<T>(fn: () => Promise<T> | T): Promise<T> {
  return als.run({ unscoped: true }, () => Promise.resolve(fn()));
}

/** Run a cron/job once per tenant so Prisma never executes without a tenant id. */
export async function forEachTenant(
  prisma: { tenant: { findMany: (args: { select: { id: true } }) => Promise<{ id: number }[]> } },
  fn: (tenantId: number) => Promise<void>,
): Promise<void> {
  const tenants = await runUnscoped(() =>
    prisma.tenant.findMany({ select: { id: true } }),
  );
  for (const tenant of tenants) {
    await runWithTenant(tenant.id, () => fn(tenant.id));
  }
}
