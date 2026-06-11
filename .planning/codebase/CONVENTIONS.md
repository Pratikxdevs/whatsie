# CrmV2 — Code Conventions & Patterns

## TypeScript Configuration

- **Strict mode** enabled (`"strict": true` in tsconfig.json)
- Target: ES2022, Module: CommonJS
- Root dir: `./src`, output: `./dist`
- `esModuleInterop: true`, `forceConsistentCasingInFileNames: true`
- `skipLibCheck: true`, `resolveJsonModule: true`
- Test files excluded from compilation: `src/**/*.test.ts`, `src/__tests__/**`
- No ESLint or Prettier config files present — formatting is manual/convention-based

## Import & Export Patterns

- **Named exports** for utilities, constants, types, and functions
- **Default exports** only for Express routers (`export default router`)
- **Barrel exports** via `src/schemas/index.ts` re-exporting all schemas and types
- Named type exports co-located with their schema: `export type CreateLeadInput = z.infer<typeof createLeadSchema>`

### Import Order (observed convention, not enforced)

1. Node built-ins (`import express from 'express'`, `import crypto from 'crypto'`)
2. Third-party libraries (`import jwt from 'jsonwebtoken'`, `import { z } from 'zod'`)
3. Local modules relative to current file (`../db/prisma`, `../config/logger`)
4. Type-only imports where applicable (`import type { Request } from 'express'`)

### Import Style

- `import x from 'y'` for default exports
- `import { x, y } from 'z'` for named exports
- `import * as X from 'y'` rarely (e.g., `import * as Sentry from '@sentry/node'`)
- Dynamic `await import()` for lazy-loaded modules (e.g., providers, adapters)

## Module Organization

```
src/
├── adapters/        # Platform adapters (Evolution API for WhatsApp)
├── ai/              # AI provider integrations
├── AiInteg/         # AI bridge endpoints
├── api/             # Auth API (Clerk integration)
├── billing/         # Usage recording, quota tracking
├── config/          # Logger configuration
├── crm/             # CRM domain logic
├── db/              # Prisma client singleton
├── debug/           # Debug server, log ring buffer
├── errors/          # Error code registry
├── metrics/         # Prometheus counters/histograms
├── middleware/       # Express middleware (auth, validate, tenant, quota, rateLimit)
├── normalizer/      # Platform-specific webhook normalization
├── platforms/       # Platform abstractions
├── queue/           # BullMQ queue setup
├── rateLimiter/     # Rate limiting utilities
├── router/          # Legacy router
├── routes/          # Express route handlers (one file per domain)
├── schemas/         # Zod validation schemas (organized by domain subdirectories)
├── services/        # Business logic services (class-based, static methods)
├── utils/           # Pure utility functions
└── workers/         # BullMQ background workers
```

## Naming Conventions

### Files

- **kebab-case** for all files: `leads.ts`, `workflowEngine.ts`, `tenant-isolation.test.ts`
- Test files: `*.test.ts` or `*.spec.ts`
- Schema subdirectories: `schemas/auth/`, `schemas/leads/`, `schemas/bots/`

### Functions & Variables

- **camelCase** for functions and variables: `authenticateToken`, `validateBody`, `createAppError`
- **PascalCase** for classes: `WorkflowEngine`, `SessionManager`
- **PascalCase** for interfaces/types: `AuthenticatedRequest`, `WorkflowResponse`, `NormalizedMessage`
- **UPPER_SNAKE_CASE** for constants: `PLAN_LIMITS`, `PHONE_RE`, `EMAIL_RE`, `DEV_TENANT_ID`
- **camelCase** for Prisma exports: `prisma` (singleton instance)

### Route Files

- File names match their domain: `leads.ts`, `conversations.ts`, `billing.ts`
- Router variable is always `const router = Router()`
- Default export: `export default router`

### Schema Files

- Organized in domain subdirectories: `schemas/leads/create.ts`, `schemas/auth/login.ts`
- Schema variable naming: `createLeadSchema`, `updateLeadSchema`, `loginSchema`
- Type export: `export type CreateLeadInput = z.infer<typeof createLeadSchema>`
- Barrel re-export in `schemas/index.ts`

## Express Route Patterns

### Standard Route Structure

```typescript
import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { validateBody } from '../middleware/validate';
import { createAppError, ErrorCode } from '../errors/codes';

const router = Router();

// Apply auth to all routes
router.use(authenticateToken);

// CRUD routes with try/catch, structured errors, and logger context
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    // ... Prisma query ...
    return res.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'Description of failure');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

export default router;
```

### Key Patterns

- **Tenant scoping**: Every query includes `tenantId` from `req.user!.tenantId`
- **Try/catch wrapping**: All async route handlers wrapped with structured error logging
- **Validation middleware**: `validateBody(schema)` applied per-route, not globally
- **Error responses**: Use `createAppError(ErrorCode.XXX, 'detail')` for consistent error shape
- **Auth applied per-router**: `router.use(authenticateToken)` at top of router, not per-route

### Route Mounting (src/index.ts)

- Routes mounted with path prefix: `app.use('/api/leads', leadsRouter)`
- Rate limiters applied at mount point: `app.use('/api', apiRateLimiter)`
- Webhook routes unauthenticated: `app.use('/api/webhooks', webhookRouter)`

## Middleware Patterns

### Validation Middleware (`validate.ts`)

- Factory functions: `validateBody(schema)`, `validateQuery(schema)`, `validateParams(schema)`
- Uses `schema.safeParse()` (not `.parse()`) to avoid throwing
- Attaches parsed/stripped data back to `req.body`/`req.query`/`req.params`
- Returns 400 with `createAppError(ErrorCode.API_004, 'Validation failed', { errors })`

### Authentication Middleware (`auth.ts`)

- `authenticateToken` — dual-mode: supports Clerk JWT and system-issued API keys.
- Extends Express Request: `interface AuthenticatedRequest extends Request { user?: { id, tenantId, role } }`
- Strict fail-closed verification. No dev bypasses permitted.
- API keys hashed with SHA-256 before database lookup.

### Tenant Middleware (`tenant.ts`)

- Uses `AsyncLocalStorage` for request-scoped tenant context
- `tenantContext.run({ tenantId }, () => next())` pattern
- Consumed by Prisma extension to set PostgreSQL RLS context

### Error Response Shape

All errors follow the structure defined in `errors/codes.ts`:

```typescript
{
  code: 'AUTH_001',           // Domain error code
  message: 'Description...',  // Human-readable from ERROR_DESCRIPTIONS
  detail: 'Optional extra',   // Context-specific detail
  meta: { ... },              // Optional metadata
  timestamp: '2026-01-01T00:00:00.000Z'
}
```

## Prisma Usage Patterns

### Client Singleton (`db/prisma.ts`)

- Global singleton with hot-reload guard: `globalThis.__prisma ?? new PrismaClient()`
- Only stores on global in non-production to prevent connection pool exhaustion

### Tenant Global Middleware Integration

- Extended PrismaClient intercepts queries for `TENANT_MODELS` and automatically applies `{ where: { tenantId } }` or `{ data: { tenantId } }`.
- Uses `AsyncLocalStorage` from `tenantContext` to securely resolve the current tenant.
- Completely abstracts tenant filtering from business logic, throwing `CRITICAL_SECURITY_ALERT` if a tenantId is missing.

### Query Patterns

- Always include `tenantId` in `where` clauses (defense-in-depth, RLS is primary)
- Use `findMany` with `include` for nested relations
- Use `findFirst` for single-record lookups
- Pagination: `skip`/`take` with `count` for total
- Transactions via `$transaction` callback

## Error Handling Patterns

### Structured Error Codes

- Format: `{DOMAIN}_{NUMBER}` (e.g., `AUTH_001`, `DB_003`, `WA_004`)
- Domains: API, DB, AUTH, WA (WhatsApp), Q (Queue), WS (WebSocket), SYS (System)
- Registry in `errors/codes.ts` with descriptions and factory function

### Route-Level Error Handling

```typescript
catch (err: any) {
  logger.error({ err }, 'Contextual description');
  return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
}
```

- Never expose raw error messages to clients
- Log full error object with structured context
- Return generic error codes to client

### Non-Blocking Error Patterns

- Quota check failures are swallowed (allow request to proceed)
- Billing usage recording errors are swallowed (don't block user operations)
- Startup sync failures are caught and logged as warnings

## Logging Approach (Pino)

### Configuration (`config/logger.ts`)

- Pino with `pino-pretty` transport in development (colorized, timestamped)
- Production: plain JSON logs to stdout
- Log level: `LOG_LEVEL` env var, defaults to `info`
- ISO timestamps via `pino.stdTimeFunctions.isoTime`

### PII Redaction

- Automatic redaction of phone numbers, email addresses, and API keys
- Object key inspection: keys containing `key`, `secret`, or `token` get first 4 chars + `****`
- `redactObject()` applied to logger child context

### Context Logging

- `getContextLogger(tenantId, module, context)` — creates child logger with tenant + module context
- Structured log objects: `logger.error({ err, tenantId }, 'message')`
- Debug server integration via `setDebugLogger()` for real-time log streaming

## Environment Variable Management

### Validation (`utils/env.ts`)

- Zod schema validates all env vars at startup
- Required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (min 32 chars), `GATEWAY_SECURITY_TOKEN`, `EVOLUTION_API_*`
- Optional with format validation: `FRONTEND_URL`, `SENTRY_DSN`, `DEFAULT_TENANT_ID`, `DEV_AUTH_BYPASS`, `NODE_ENV`
- Fail-fast: throws with detailed error messages if validation fails

### Startup Validation (`index.ts`)

- `requiredEnvs` array checked before anything else
- `process.exit(1)` with `logger.fatal()` on missing envs
- Prisma migrations auto-run on startup (`prisma migrate deploy`)

## Metrics & Observability

### Prometheus (`metrics/index.ts`)

- Custom registry (not default) for metrics isolation
- Default metrics: process, GC, event loop
- Counters: `messages_received_total`, `messages_sent_total`, `errors_total`
- Histograms: `http_request_duration_seconds` (with route/method/status labels)
- Gauges: `queue_depth`
- `/metrics` endpoint in `index.ts`

### Sentry Integration

- Conditional init: only if `SENTRY_DSN` env var is set
- 10% trace sample rate
- Express error handler via `Sentry.setupExpressErrorHandler(app)`

## Security Patterns

- Helmet with custom CSP directives
- CORS: explicit allowlist for dev origins, configurable in production
- HMAC SHA-256 webhook signature verification for WhatsApp
- API keys stored as SHA-256 hashes, never plaintext
- Rate limiting: Redis-backed with separate auth (5/15min) and API (100/min) limiters
- Content sanitization via `dompurify` (dependency present)

## Service Layer Patterns

- Services are **classes with static methods** (not instantiated): `WorkflowEngine.checkTrigger()`
- Interfaces defined for return types: `WorkflowResponse`
- Services import Prisma directly, no dependency injection
- Business logic in services, not in route handlers
