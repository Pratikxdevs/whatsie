import { PrismaClient } from '@prisma/client';
import { tenantContext } from '../middleware/tenant';

/**
 * Global Prisma singleton.
 * In development tsx watch re-evaluates modules on every file save.
 * Without this guard every reload creates a new connection pool,
 * which quickly exhausts the database's max_connections.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const basePrisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = basePrisma;
}

/**
 * Extended PrismaClient that sets PostgreSQL Row-Level Security context.
 * Before every query, it sets app.current_tenant_id from AsyncLocalStorage,
 * so RLS policies automatically filter rows by tenant.
 *
 * Uses set_config with true (local to transaction) to avoid connection pool issues.
 */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const store = tenantContext.getStore();
        if (store?.tenantId) {
          await basePrisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${store.tenantId}, true)`;
        }
        return query(args);
      },
    },
  },
});
