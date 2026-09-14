import { Prisma } from '@prisma/client';
import { isUnscoped, resolveTenantId } from './context';

const GLOBAL = new Set(['Role', 'Permission', 'Tenant']);

const WRITE_WITH_DATA = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert']);

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
        if (isUnscoped()) return query(args);
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
