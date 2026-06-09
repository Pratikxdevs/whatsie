# Technical Concerns

## Critical Issues (Security, Data Loss, Correctness)

### 1. Fallback Encryption Key — HIGH
**File:** `src/utils/crypto.ts`
> `process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-dev-key-change-in-prod'`

If `CREDENTIAL_ENCRYPTION_KEY` is unset in production, encryption silently falls back to JWT_SECRET or a hardcoded string. **All stored credentials become trivially decryptable.** Either make the env var required at startup (fail-fast) or remove the fallback.

### 2. CORS Wildcard with Credentials — MEDIUM
**File:** `src/index.ts` — `cors: { origin: '*' }` with credential-bearing requests
> JWT auth uses cookies/localStorage and Helmet expects same-origin. `cors: { origin: '*' }` conflicts with `credentials: true` in most browsers. Confirm CORS origins are locked down for production.

### 3. JWT Secret in Encryption Fallback — MEDIUM
**File:** `src/utils/crypto.ts`
> Falls back to `JWT_SECRET` if `CREDENTIAL_ENCRYPTION_KEY` is missing.

This means the JWT signing key would double as the data encryption key. Compromise of one compromises both.

### 4. Evolution API Adapter Error Swallowing — HIGH
**File:** `src/adapters/evolutionApi.ts` (620 lines)

Large adapter file with extensive error handling. Need to verify errors fromEvolution API are properly surfaced to callers and not silently caught+logged without alerting. If WhatsApp message sends fail silently, leads are lost.

### 5. WebSocket Auth Edge Case
Socket.IO auth uses JWT but the handshake shares an HTTP session with Express. If JWT expiration happens mid-connection, socket doesn't auto-reconnect with fresh token. Users may see stale/broken real-time updates.

## Technical Debt

### 6. DELETE /api/workspaces — No Cascade Guard
`DELETE /api/workspaces/:id` with 423 lines of workspace management — verify all related entities (bots, credentials, messages, conversations, users) have proper `onDelete: Cascade` in Prisma or manual cleanup. Missing cascade = orphaned data.

### 7. Prisma Client Singleton
`src/db/prisma.ts` exports a global singleton. Works for single-replica but creates connection pool sizing issues at scale. Consider per-request Prisma client or connection pool tuning.

### 8. Socket.IO State in Memory
Active socket connections stored in a JavaScript Map. Works for single-process but breaks with multi-replica deployment (sticky sessions needed Redis adapter for Socket.IO).

### 9. Frontend Bundle No Code-Splitting
`App.tsx` imports all pages synchronously. No `React.lazy()` — all 7 pages + settings tabs ship in the initial bundle (~121 files tree-shaken but still substantial).

### 10. Rate Limiter In-Memory Store
`src/middleware/rateLimit.ts` uses in-memory counters. Ineffective across replicas — a user can bypass limits by hitting different backends.

## Dependency Risks

| Package | Risk |
|---------|------|
| `bullmq` v5 | Active rapidly — breaking changes between minors |
| `prisma` v6 | Major version update may change generator behavior |
| `@sentry/node` v9 | ESM-only in recent versions — verify bundler compat |
| `express` v5 | v5 types differ from v4 (`req.params` is `string\|string[]`) |
| `react` v19 | New server components features not used — pure client renders |

## Missing Features / Gaps

### 11. No RLS (Row-Level Security)
All tenant filtering is application-level (`where: { workspaceId }`). No PostgreSQL RLS policies — a single bug leaks cross-tenant data.

### 12. No Health Check Endpoint
Express has `/metrics` (Prometheus) but no `/healthz` for liveness/readiness probes in Docker/K8s.

### 13. No Database Migration CI
Prisma migrations exist but no CI step to validate migrations apply cleanly or detect drift.

### 14. No API Versioning
Routes are unversioned (`/api/...`). Any breaking change affects all consumers with no migration path.

## Performance Concerns

### 15. Intent Classification Per-Message (218-line orchestrator)
Every incoming WhatsApp message triggers AI classification. Under load (many concurrent conversations), AI API rate limits become a bottleneck. No priority queue or classification caching.

### 16. N+1 in Conversation/Message Routes
`routes/conversations.ts` (303 lines) likely loads messages per conversation in a loop. Verify `include` or batch queries are used instead.

### 17. WebSocket Broadcast Scope
Socket.IO events are per-workspace but verify they don't broadcast to all connected clients in a workspace — only relevant conversation participants should receive updates.

## Reliability Risks

### 18. BullMQ Jobs No Dead Letter Queue
Message processing jobs fail silently after retries. No DLQ to capture and replay failed jobs — lost messages.

### 19. No Request Body Size Limit
`express.json()` has no explicit `limit` option. A massive payload could OOM the process.

### 20. Redis Single Point of Failure
All queue state, rate-limit state, and session cache in one Redis. No replica or Sentinel configured.

## Test Coverage Gaps

### 21. No Frontend Test Framework
121 frontend files, zero test files. No Vitest React Testing Library, no Playwright E2E.

### 22. WhatsApp Adapter Untested
`src/adapters/whatsapp.adapter.ts` (41 lines) and `src/adapters/evolutionApi.ts` (620 lines) have no test files — the highest-risk untested area.

### 23. Auth Middleware Only Unit-Tested
`src/middleware/auth.test.ts` exists but doesn't cover token expiration races or malformed JWT edge cases.

## Maintainability Concerns

### 24. 16 Route Files, No Service Layer Separation
Routes directly call Prisma in many cases. Only 4 service files exist (`intentClassifier`, `ruleEngine`, `sessionManager`, `workflowEngine`). CRUD-heavy routes should delegate to service functions.

### 25. Debug Server in Production Code
`src/debug/server.ts` and `src/debug/` directory contain a full request replay + log viewing server. Should be behind a feature flag or separated entirely.

### 26. Mixed Validation Patterns
Some routes use Zod validation middleware, others validate inline. Inconsistent — hard to know which routes validate input and which don't.
