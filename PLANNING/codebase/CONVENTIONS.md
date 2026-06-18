# CONVENTIONS.md — Code Style & Conventions

**Project:** CrmV2 — Multi-Platform AI CRM Bot SaaS  
**Date:** 2026-06-15  
**Root:** `/home/clutch/Desktop/Whatsie`

---

## Language & TypeScript Config

| Setting | Value | Rationale |
|---------|-------|-----------|
| `strict` | `true` | Full strict mode enabled |
| `target` | `ES2022` | Modern async/await, class fields |
| `module` | `CommonJS` | Node.js compatibility |
| `skipLibCheck` | `true` | Faster compilation |
| `resolveJsonModule` | `true` | Import `.json` files |

---

## Import Style

```typescript
// External dependencies first
import express from 'express';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

// Internal module imports
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import gatewayRouter from './routes/gateway';
import { authenticateToken } from '../middleware/auth';

// Type imports with type keyword
import type { Request, Response, NextFunction } from 'express';
```

- No blank lines between import groups in practice (mixed in codebase)
- No default exports for modules (named exports preferred)
- Default exports used for routers: `export default router;`

---

## Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Variables | camelCase | `tenantId`, `sessionName` |
| Functions | camelCase | `getConnectionState()`, `generateAiResponse()` |
| Classes/Services | PascalCase | `IntentClassifier`, `SessionManager` |
| Interfaces | PascalCase | `AuthenticatedRequest`, `SendTextOptions` |
| Types | PascalCase | `NormalizedMessage` |
| Constants | UPPER_SNAKE_CASE | `EVO_URL`, `JWT_SECRET` |
| Files | camelCase | `sessionManager.ts`, `crmService.ts` |
| Route files | kebab-case (mixed) | `whatsapp-chat.ts` |
| DB Models | PascalCase | `Tenant`, `BillingUsage` |
| DB Fields | camelCase | `tenantId`, `createdAt` |
| Env vars | UPPER_SNAKE_CASE | `DATABASE_URL`, `CLERK_SECRET_KEY` |

---

## Error Handling

### Pattern: `enrichError()`

```typescript
import { enrichError } from '../errors/recovery';

// Usage in middleware
return res.status(401).json(enrichError('AUTH_005', 'API key is invalid or revoked'));

// enrichError format
{ code: 'AUTH_005', message: 'API key is invalid or revoked' }
```

### Error Codes

| Prefix | Module | Example |
|--------|--------|---------|
| `AUTH_*` | Auth middleware | `AUTH_001`, `AUTH_005` |
| `C-*` | Security conventions | `C-001` (pepper), `C-002` (metrics), `C-003` (removed routes) |
| `H-*` | Worker hardening | `H-007` (dedup) |

### Worker Error Handling

```typescript
// Jobs throw on error — BullMQ retries with exponential backoff (5 attempts)
try {
  // pipeline logic
} catch (error) {
  log.error({ err: error, jobId: job.id }, 'Fatal error processing job');
  throw error; // BullMQ will retry
}

// Permanent failures handled via worker.on('failed') event
whatsappWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'BullMQ job permanently failed');
});
```

### Fatal Startup Errors

```typescript
// Missing env vars — refuse to start
if (missingEnvs.length > 0) {
  logger.fatal({ missingEnvs }, `Missing required environment variables`);
  process.exit(1);
}

// Prisma migration failure — refuse to start with stale tables
try { execSync('npx prisma migrate deploy', ...); } catch {
  logger.fatal({ err }, 'Prisma migrate deploy failed — refusing to start');
  process.exit(1);
}
```

---

## Logging Conventions

### Logger Setup

```typescript
import { logger, getContextLogger } from '../config/logger';

// Global logger
logger.info({ port }, `Server started on port ${port}`);
logger.error({ err }, 'Fatal error');
logger.fatal({ missingEnvs }, 'Missing required environment variables');

// Context-scoped logger (preferred in services/workers)
const log = getContextLogger(tenantId, 'Worker.Pipeline');
log.info({ jobId, userId }, 'Picked up job');
```

### Log Levels

- `fatal` — Startup failure, process will exit
- `error` — Runtime errors needing investigation
- `warn` — Non-critical issues (rate limit, duplicate webhook)
- `info` — Normal operations (connection, message processed)
- `debug` — Detailed flow tracking (disabled in production)

### PII Redaction

```typescript
// Automatic PII redaction in logger.ts:
//   Phone numbers: +1 (555) 123-4567 → +1 (555) 123-****
//   Emails:         user@example.com → u***@example.com
//   API keys:       sk-proj-xxxx... → sk-p****
//   Key/secret/token fields:         first 4 chars + ****
```

---

## Middleware Patterns

### Authentication Middleware

```typescript
export const authenticateToken = async (
  req: AuthenticatedRequest, res: Response, next: NextFunction
) => {
  // Strategy 1: API Key (X-API-KEY header)
  // Strategy 2: Clerk JWT (req.auth.userId)
  // Default: Fail-closed 401
};
```

### Validation Middleware

```typescript
// Zod schema validation (src/middleware/validate.ts)
// Picks up params/body/query from the request
// Returns 400 with Zod error details on failure
```

### Rate Limiting

```typescript
// Two tiers:
// authRateLimiter — for authentication endpoints
// apiRateLimiter — for general API endpoints
// Uses rate-limit-redis store for distributed rate limiting
```

---

## Database Conventions

### Prisma Client Access

```typescript
// Two clients:
import { prisma, prismaUnfiltered } from '../db/prisma';

// prismaUnfiltered — for auth/tenant resolution (no tenant filter)
// prisma — for all other queries (tenant-filtered via middleware)
```

### Query Pattern

```typescript
// Read
const user = await prisma.user.findUnique({ where: { clerkId } });
const bots = await prisma.bot.findMany({ where: { tenantId } });

// Write
await prisma.bot.upsert({
  where: { sessionName: instanceName },
  update: { status: 'connected', updatedAt: new Date() },
  create: { tenantId, displayName, platform, sessionName, status: 'pending_qr' },
});

// Transaction
user = await prismaUnfiltered.$transaction(async (tx) => {
  const tenant = await tx.tenant.create({ data: { name, status, plan } });
  return tx.user.create({ data: { clerkId, email, tenantId: tenant.id } });
});
```

---

## Async / Concurrency Patterns

```typescript
// Startup parallel sync with allSettled (no fail-stop)
await Promise.allSettled(
  bots.map(bot => getConnectionState(bot.sessionName!))
);

// Worker concurrency limit
export const whatsappWorker = new Worker('whatsapp-messages', processor, {
  connection: redisConnection,
  concurrency: 5,
});

// Socket.IO room join
socket.join(tenantId);
```

---

## Security Patterns

### API Key Hashing (C-001)

```typescript
function hashApiKey(key: string): string {
  const pepper = process.env.API_KEY_PEPPER!; // Required env var
  return crypto.createHmac('sha256', pepper).update(key).digest('hex');
}
```

### Metrics Endpoint Protection (C-002)

```typescript
const metricsToken = process.env.METRICS_TOKEN;
if (metricsToken) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${metricsToken}`) {
    return res.status(401).end();
  }
}
```

### CSP Headers (via Helmet)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
      // ...
    },
  },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
```

---

## Component Export Patterns

### Router (named export + default)

```typescript
import { Router } from 'express';
const router = Router();
router.get('/health', handler);
export default router;
```

### Service (class with static methods)

```typescript
export class IntentClassifier {
  static classify(text: string): { intent: string; confidence: number } {
    // ...
  }
}
```

### Function Export

```typescript
export async function createInstance(opts: CreateInstanceOptions) { ... }
export async function sendText(instanceName: string, opts: SendTextOptions) { ... }
```

---

## Test Conventions

### File Placement

- **Unit tests**: Co-located with source: `src/services/sessionManager.test.ts`
- **Integration/API tests**: `src/__tests__/*-api.test.ts`
- **Test helpers**: `src/__tests__/helpers.ts`
- **Test setup**: `src/__tests__/setup.ts`

### Mocking Pattern

```typescript
// Prisma mock (auto-applied in setup.ts)
vi.mock('../db/prisma', () => ({
  prisma: mockPrisma,
  prismaUnfiltered: mockPrisma,
}));

// Clerk mock
vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (req, _res, next) => {
    req.auth = { userId: 'clerk-test-user-id' };
    next();
  },
  // ...
}));

// Auth middleware overrides
vi.mock('../middleware/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    authenticateToken: (req, res, next) => { /* injects test user */ },
  };
});
```
