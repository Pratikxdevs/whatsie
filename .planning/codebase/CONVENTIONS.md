---
title: Code Conventions
last_mapped_commit: f683cc9578043d8141583bd2d2d84c7ebcaea9d4
last_updated: 2026-06-09
---

# Code Conventions

## Code Style
- TypeScript with `strict: true`, targeting ES2022, CommonJS modules
- 2-space indentation, semicolons, single quotes
- No ESLint or Prettier config in the backend root (only `platforms/evolution-api/` has its own `.eslintrc.js` and `.prettierrc.js`)
- Lint step in CI is `npx tsc --noEmit` (typecheck only, no dedicated linter)
- Express 5, Prisma ORM, Zod for validation
- Pino for structured logging; Sentry for error tracking
- `module-alias` used for path aliasing (configured in package.json)
- Comments are sparse; JSDoc used selectively on exported functions and complex logic (e.g., middleware strategies, error code registry)

## Naming Conventions
- **Files:** `camelCase.ts` for source files; `kebab-case` for test files (e.g., `leads-api.test.ts`, `tenant-isolation.test.ts`)
- **Directories:** `camelCase` (e.g., `AiInteg/`, `rateLimiter/`); some use `PascalCase` for adapter/service folders
- **Functions:** `camelCase` — route handlers, middleware factories, utility functions (e.g., `validateBody`, `authenticateToken`, `createAppError`)
- **Classes:** `PascalCase` (e.g., `IntentClassifier`, `TwitterSyncManager`)
- **Interfaces/Types:** `PascalCase` suffixed with descriptive noun (e.g., `AuthenticatedRequest`, `IntentResult`, `ErrorCode`)
- **Constants:** `UPPER_SNAKE_CASE` for env vars and error codes (e.g., `DEV_AUTH_BYPASS`, `API_001`); `camelCase` for exported singletons (e.g., `logger`, `prisma`, `tenantContext`)
- **Route files:** Export a default `Router` instance; named after the resource (e.g., `leads.ts`, `conversations.ts`)
- **Schema files:** Organized in subdirectories per domain (`schemas/leads/create.ts`), export a Zod schema + inferred TypeScript type

## Patterns
- **Multi-strategy auth middleware:** `authenticateToken` supports dev bypass, API key header, Clerk JWT, and standard Bearer JWT in a single middleware
- **Tenant isolation:** `AsyncLocalStorage` for tenant context (`tenantContext`); Prisma queries scoped by `tenantId` on every request
- **Zod validation middleware:** Generic `validateBody`, `validateQuery`, `validateParams` factories wrap Zod `safeParse`; attach parsed/stripped data to `req.body`
- **Structured error codes:** Centralized `ErrorCode` registry with `{DOMAIN}_{NUMBER}` format (e.g., `WA_001`, `DB_003`); `createAppError()` factory returns structured error objects
- **Adapter pattern:** Platform adapters (`evolutionApi`, `telegramAdapter`, `twitterApi`, `discordAdapter`) abstract external API communication
- **Queue-based async processing:** BullMQ queues (`discordMessagesQueue`, etc.) for message dispatch; workers spawned in background
- **Normalization layer:** `src/normalizer/` converts platform-specific webhook payloads into a unified message format
- **Service layer:** Domain services (`intentClassifier`, `ruleEngine`, `sessionManager`, `workflowEngine`) contain business logic separate from routes
- **Graceful shutdown:** Explicit `SIGTERM`/`SIGINT` handlers that close HTTP server, Prisma, and Redis connections
- **PII redaction in logs:** Logger automatically redacts phone numbers, emails, and API keys from log output
- **Request lifecycle middleware:** Request ID injection, request duration metrics (Prometheus), request logging to both Pino and debug server ring buffer

## Error Handling
- Route handlers wrap logic in `try/catch`, log with `logger.error({ err }, 'context message')`, return structured JSON via `createAppError()`
- HTTP status codes mapped semantically: 400 (validation), 401 (auth required), 403 (forbidden), 404 (not found), 500 (internal error)
- `createAppError(code, detail?, meta?)` returns `{ code, message, detail, meta, timestamp }` — consumer-facing error format
- Zod validation errors formatted as `{ field, message }` array in the `meta.errors` field
- Prisma errors handled at the route level (not globally); unique constraint violations and FK violations mapped to appropriate error codes
- External service failures (Evolution API, Telegram, Discord, Twitter) are caught and logged; DB status is preserved rather than crashing
- Sentry integration is optional (only when `SENTRY_DSN` is set); positioned after all route registrations
- Missing env vars cause an immediate `logger.fatal` + `process.exit(1)` at startup
- Port-in-use conflicts trigger automatic retry on next port (up to PORT+10)

## Import Organization
- Third-party imports first (`express`, `jsonwebtoken`, `zod`, etc.)
- Internal imports next, grouped by layer: `../db/prisma`, `../config/logger`, `../middleware/*`, `../schemas/*`, `../errors/codes`
- Relative paths used exclusively (no path aliases in practice despite `module-alias` in dependencies)
- Dynamic `import()` used for startup-heavy modules (platform adapters) to avoid blocking startup
- Test files import from `vitest` first, then source modules, then `../__tests__/setup` and `../__tests__/helpers`
