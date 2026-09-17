import { Prisma } from '@prisma/client';
import { isUnscoped, resolveTenantId } from './context';

const GLOBAL = new Set(['Role', 'Permission', 'Tenant']);

const WRITE_WITH_DATA = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert']);

/** Operations that can create a brand-new row and would otherwise fall back to the schema's
 * `tenantId @default(1)` if none is supplied. Scoped calls never hit this — resolveTenantId()
 * already injects tenantId for them. This only guards the genuinely-unscoped path. */
const ROW_CREATING = new Set(['create', 'createMany', 'upsert']);

/**
 * Refuses an unscoped create/createMany/upsert on a tenant-owned model unless the caller
 * explicitly supplied `tenantId` in the row data. Without this, a forgotten tenantId on a
 * future `runUnscoped(...)` code path would silently fall back to the schema default
 * (`tenantId @default(1)`) and land the row in tenant 1 instead of erroring.
 */
function assertExplicitTenantId(model: string, operation: string, args: Record<string, unknown>) {
  if (operation === 'create') {
    const data = args.data as Record<string, unknown> | undefined;
    if (!data || data.tenantId == null) {
      throw new Error(
        `Refusing unscoped ${model}.create without an explicit tenantId (no implicit tenant-1 fallback).`,
      );
    }
  } else if (operation === 'createMany') {
    const raw = (args as { data?: unknown }).data;
    const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (
      rows.length === 0 ||
      rows.some((row) => !row || (row as Record<string, unknown>).tenantId == null)
    ) {
      throw new Error(
        `Refusing unscoped ${model}.createMany without an explicit tenantId on every row (no implicit tenant-1 fallback).`,
      );
    }
  } else if (operation === 'upsert') {
    const create = args.create as Record<string, unknown> | undefined;
    if (!create || create.tenantId == null) {
      throw new Error(
        `Refusing unscoped ${model}.upsert without an explicit tenantId in the create branch (no implicit tenant-1 fallback).`,
      );
    }
  }
}

function mergeWhere(where: Record<string, unknown> | undefined, tenantId: number) {
  if (!where || Object.keys(where).length === 0) return { tenantId };
  if ('tenantId' in where) return where;
  // Spread so findUnique/update({ id }) stay unique selectors (Prisma extendedWhereUnique).
  return { ...where, tenantId };
}

function injectCreateData(data: unknown, tenantId: number): unknown {
  if (Array.isArray(data)) return data.map((row) => injectCreateData(row, tenantId));
  if (data && typeof data === 'object') {
    const row = { ...(data as Record<string, unknown>) };
    const isRelationOp = 'connect' in row || 'connectOrCreate' in row || 'disconnect' in row;
    if (!isRelationOp && row.tenantId == null) {
      row.tenantId = tenantId;
    }
    for (const key of Object.keys(row)) {
      const value = row[key];
      if (!value || typeof value !== 'object') continue;
      const nested = value as Record<string, unknown>;
      if ('create' in nested) {
        row[key] = { ...nested, create: injectCreateData(nested.create, tenantId) };
      }
      if ('createMany' in nested && nested.createMany && typeof nested.createMany === 'object') {
        const createMany = nested.createMany as { data?: unknown };
        row[key] = {
          ...nested,
          createMany: { ...createMany, data: injectCreateData(createMany.data, tenantId) },
        };
      }
    }
    return row;
  }
  return data;
}

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (GLOBAL.has(model)) return query(args);
        if (isUnscoped()) {
          if (ROW_CREATING.has(operation)) {
            assertExplicitTenantId(model, operation, args as Record<string, unknown>);
          }
          return query(args);
        }
        const tenantId = resolveTenantId();
        if (tenantId == null) {
          // Login / JWT lookup can race the ALS microtask; unique reads stay globally unique.
          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            return query(args);
          }
          throw new Error(`Missing tenant context for ${model}.${operation}`);
        }
        const next = { ...(args as Record<string, unknown>) };
        if (operation === 'create' || operation === 'createMany') {
          next.data = injectCreateData(next.data, tenantId);
        } else if (operation === 'upsert') {
          next.where = mergeWhere(next.where as Record<string, unknown>, tenantId);
          next.create = injectCreateData(next.create, tenantId);
        } else if (operation !== 'createManyAndReturn') {
          next.where = mergeWhere(next.where as Record<string, unknown> | undefined, tenantId);
        }
        if (WRITE_WITH_DATA.has(operation) && operation === 'updateMany' && next.data) {
          const data = next.data as Record<string, unknown>;
          if ('tenantId' in data) delete data.tenantId;
        }
        return query(next);
      },
    },
  },
});
