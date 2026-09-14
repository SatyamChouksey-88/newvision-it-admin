import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { tenantExtension } from '../tenancy/prisma-extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString, max: 10 });
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
    const extended = this.$extends(tenantExtension);
    // biome-ignore lint/correctness/noConstructorReturn: Prisma $extends proxy must replace the injected instance.
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop === 'onModuleInit' || prop === 'onModuleDestroy' || prop === 'pool') {
          return Reflect.get(target, prop, receiver);
        }
        const fromExtended = Reflect.get(extended as object, prop);
        if (fromExtended !== undefined) {
          return typeof fromExtended === 'function' ? fromExtended.bind(extended) : fromExtended;
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as unknown as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
