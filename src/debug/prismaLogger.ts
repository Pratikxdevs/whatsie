/**
 * Prisma Logger Extension
 *
 * Captures every DB operation and routes it to the 9222 debug ring buffer.
 * Dev: logs all queries. Prod: logs only errors + slow queries (>200ms).
 *
 * Usage:
 *   const prisma = new PrismaClient().$extends(prismaLoggerExtension);
 */

import { Prisma } from '@prisma/client';
import { addLog } from './server';
import { logger } from '../config/logger';

const SLOW_QUERY_MS = 200;
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Prisma client extension for comprehensive query logging.
 * Wrap every model operation to capture timing and errors.
 */
export const prismaLoggerExtension = Prisma.defineExtension({
  name: 'logger',
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }: any) {
        const start = Date.now();
        try {
          const result = await query(args);
          const duration = Date.now() - start;

          const isSlow = duration >= SLOW_QUERY_MS;

          if (!IS_PROD || isSlow) {
            const level = isSlow ? 'warn' : 'info';
            const msg = `[DATABASE] ${model}.${operation} (${duration}ms)${isSlow ? ' ⚠ SLOW' : ''}`;

            addLog(level, msg, undefined, {
              source: 'database',
              category: 'db',
              model,
              operation,
              duration,
              slow: isSlow,
            });

            if (isSlow) {
              logger.warn({ model, operation, duration }, `Slow Prisma query: ${model}.${operation}`);
            }
          }

          return result;
        } catch (err: any) {
          const duration = Date.now() - start;
          const errorCode = err.code || 'UNKNOWN';

          const msg = `[DATABASE] ${model}.${operation} FAILED (${duration}ms) — ${errorCode}: ${err.message?.slice(0, 200)}`;

          addLog('error', msg, errorCode, {
            source: 'database',
            category: 'db',
            model,
            operation,
            duration,
            prismaCode: errorCode,
            meta: err.meta,
          });

          logger.error({ model, operation, err: err.message, prismaCode: errorCode }, 'Prisma operation failed');
          throw err;
        }
      },
    },
  },
});
