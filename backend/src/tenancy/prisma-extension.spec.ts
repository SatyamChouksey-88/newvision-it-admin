import { describe, expect, it } from '@jest/globals';
import { runUnscoped, runWithTenant } from './context';
import { tenantExtension } from './prisma-extension';

/**
 * `Prisma.defineExtension(config)` returns `(client) => client.$extends(config)`, not the
 * config object itself — so to get the raw `{ query: { $allModels: { $allOperations } } }`
 * config back out for direct unit testing, hand it a fake client whose `$extends` just returns
 * whatever it was given, matching how Prisma's own `defineExtension` unwraps a plain config.
 */
function getHook() {
  const fakeClient = { $extends: (config: unknown) => config };
  const config = (tenantExtension as unknown as (client: typeof fakeClient) => unknown)(
    fakeClient,
  ) as { query: { $allModels: { $allOperations: (input: unknown) => unknown } } };
  return config.query.$allModels.$allOperations;
}

describe('tenantExtension — Phase 1 fail-closed unscoped writes', () => {
  const hook = getHook();
  const passthroughQuery = (args: unknown) => Promise.resolve({ args });

  it('throws on an unscoped Asset.create with no explicit tenantId', async () => {
    await expect(
      runUnscoped(() =>
        hook({
          model: 'Asset',
          operation: 'create',
          args: { data: { assetCode: 'A-1' } },
          query: passthroughQuery,
        }),
      ),
    ).rejects.toThrow(/Refusing unscoped Asset\.create/);
  });

  it('allows an unscoped Asset.create when tenantId is explicit', async () => {
    const result = await runUnscoped(() =>
      hook({
        model: 'Asset',
        operation: 'create',
        args: { data: { assetCode: 'A-1', tenantId: 7 } },
        query: passthroughQuery,
      }),
    );
    expect(result).toEqual({ args: { data: { assetCode: 'A-1', tenantId: 7 } } });
  });

  it('throws on an unscoped createMany when any row is missing tenantId', async () => {
    await expect(
      runUnscoped(() =>
        hook({
          model: 'Notification',
          operation: 'createMany',
          args: { data: [{ tenantId: 1, title: 'a' }, { title: 'b' }] },
          query: passthroughQuery,
        }),
      ),
    ).rejects.toThrow(/Refusing unscoped Notification\.createMany/);
  });

  it('allows an unscoped createMany when every row has an explicit tenantId', async () => {
    await expect(
      runUnscoped(() =>
        hook({
          model: 'Notification',
          operation: 'createMany',
          args: { data: [{ tenantId: 1, title: 'a' }, { tenantId: 1, title: 'b' }] },
          query: passthroughQuery,
        }),
      ),
    ).resolves.toBeDefined();
  });

  it('throws on an unscoped upsert with no explicit tenantId in the create branch', async () => {
    await expect(
      runUnscoped(() =>
        hook({
          model: 'EmailIngestState',
          operation: 'upsert',
          args: { where: { tenantId: 1 }, create: {}, update: {} },
          query: passthroughQuery,
        }),
      ),
    ).rejects.toThrow(/Refusing unscoped EmailIngestState\.upsert/);
  });

  it('never applies to GLOBAL models even when unscoped', async () => {
    await expect(
      runUnscoped(() =>
        hook({
          model: 'Role',
          operation: 'create',
          args: { data: { name: 'CUSTOM' } },
          query: passthroughQuery,
        }),
      ),
    ).resolves.toBeDefined();
  });

  it('does not affect scoped (runWithTenant) creates — tenantId is still auto-injected', async () => {
    const result = (await runWithTenant(9, () =>
      hook({
        model: 'Asset',
        operation: 'create',
        args: { data: { assetCode: 'A-2' } },
        query: passthroughQuery,
      }),
    )) as { args: { data: { tenantId?: number } } };
    expect(result.args.data.tenantId).toBe(9);
  });

  it('reads (findMany) are unaffected by the unscoped write guard', async () => {
    await expect(
      runUnscoped(() =>
        hook({
          model: 'Asset',
          operation: 'findMany',
          args: {},
          query: passthroughQuery,
        }),
      ),
    ).resolves.toBeDefined();
  });
});
