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

import { logger } from '../config/logger';

const basePrisma: any =
  globalThis.__prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  });

basePrisma.$on('query', (e: any) => logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma Query'));
basePrisma.$on('info', (e: any) => logger.info({ msg: e.message }, 'Prisma Info'));
basePrisma.$on('warn', (e: any) => logger.warn({ msg: e.message }, 'Prisma Warn'));
basePrisma.$on('error', (e: any) => logger.error({ msg: e.message }, 'Prisma Error'));

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = basePrisma;
}

const TENANT_MODELS = [
  'User', 'Bot', 'Lead', 'Conversation', 'Message', 
  'Workflow', 'WorkflowExecution', 'ApiKey', 'Event', 
  'BillingUsage', 'AiLog'
];

/**
 * Extended PrismaClient that enforces Zero-Trust Tenant Isolation.
 * Every query to a tenant-scoped model MUST have an active tenantId in the AsyncLocalStorage context.
 * It automatically injects `{ where: { tenantId } }` into the query arguments.
 * It also sets the PostgreSQL config for RLS as a secondary defense-in-depth layer.
 */
export const prismaUnfiltered = basePrisma;
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const store = tenantContext.getStore();
        
        // If the model belongs to a tenant but no tenant context exists, FAIL CLOSED.
        if (TENANT_MODELS.includes(model) && !store?.tenantId) {
           // Allow webhook/system operations to bypass if they explicitly use a system-level override
           // For now, strict fail-closed per security directive.
           throw new Error(`CRITICAL SECURITY ALERT: Attempted to execute ${operation} on ${model} without an active tenant context. Request aborted.`);
        }

        if (store?.tenantId) {
          // Defense Layer 1: PostgreSQL Row-Level Security
          await basePrisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${store.tenantId}, true)`;

          // Defense Layer 2: ORM Query Injection
          if (TENANT_MODELS.includes(model)) {
            const safeArgs = (args as any) || {};
            // For reads, updates, and deletes
            if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
              safeArgs.where = { ...safeArgs.where, tenantId: store.tenantId };
            }
            // For creates
            if (['create', 'createMany'].includes(operation)) {
              if (safeArgs.data) {
                if (Array.isArray(safeArgs.data)) {
                  safeArgs.data = safeArgs.data.map((d: any) => ({ ...d, tenantId: store.tenantId }));
                } else {
                  safeArgs.data.tenantId = store.tenantId;
                }
              }
            }
            // For upserts
            if (operation === 'upsert') {
              safeArgs.where = { ...safeArgs.where, tenantId: store.tenantId };
              safeArgs.create.tenantId = store.tenantId;
            }
            args = safeArgs;
          }
        }
        
        return query(args);
      },
    },
  },
});
