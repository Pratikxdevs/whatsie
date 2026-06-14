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

// addLog is imported lazily to avoid circular dep (db/prisma → debug/server → queue/setup → db/prisma)
function getAddLog() {
  try { return require('../debug/server').addLog; } catch { return null; }
}

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

basePrisma.$on('query', (e: any) => {
  logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma Query');
  const addLog = getAddLog();
  const durationMs = parseInt(e.duration, 10);
  const isSlow = durationMs >= 200;
  if (addLog && (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production' || isSlow)) {
    addLog(
      isSlow ? 'warn' : 'info',
      `[DATABASE] ${e.query?.split(' ')[0] || 'QUERY'} — ${durationMs}ms${isSlow ? ' ⚠ SLOW' : ''}`,
      undefined,
      { source: 'database', category: 'db', duration: durationMs, slow: isSlow, params: String(e.params).slice(0, 100) }
    );
  }
});
basePrisma.$on('info', (e: any) => {
  logger.info({ msg: e.message }, 'Prisma Info');
  const addLog = getAddLog();
  if (addLog) addLog('info', `[DATABASE] ${e.message}`, undefined, { source: 'database', category: 'db' });
});
basePrisma.$on('warn', (e: any) => {
  logger.warn({ msg: e.message }, 'Prisma Warn');
  const addLog = getAddLog();
  if (addLog) addLog('warn', `[DATABASE] ${e.message}`, undefined, { source: 'database', category: 'db' });
});
basePrisma.$on('error', (e: any) => {
  logger.error({ msg: e.message }, 'Prisma Error');
  const addLog = getAddLog();
  if (addLog) addLog('error', `[DATABASE] ERROR: ${e.message}`, 'DB_001', { source: 'database', category: 'db' });
});

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
      async $allOperations({ model, operation, args, query }: { model: string; operation: string; args: any; query: (args: any) => Promise<any> }) {
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
