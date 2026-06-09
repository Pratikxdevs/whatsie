---
title: Technical Concerns
last_mapped_commit: f683cc9578043d8141583bd2d2d84c7ebcaea9d4
last_updated: 2026-06-09
---

# Technical Concerns

## Technical Debt

- **`src/crm/crmService.ts:109-117`** — `logEvent` uses `prisma as any` cast with runtime check for `event?.create`. Stale Prisma client silently skips audit logging. Should be fixed after `prisma generate`.
- **`src/routes/apiKeys.ts:33`** — API keys hashed with `bcrypt` (slow) while auth middleware uses `crypto.createHash('sha256')`. Inconsistent hashing strategy — API key verification uses SHA-256 but creation uses bcrypt. The auth middleware at `src/middleware/auth.ts:45` hashes with SHA-256 for lookup, meaning bcrypt-hashed keys can never match. This is a functional bug.
- **`src/middleware/tenant.ts:29`** — `(keyRecord.tenant as any).status` cast suggests Prisma schema typing issue or stale generation. Should resolve with `prisma generate`.
- **`src/workers/index.ts:89-441`** — Three nearly identical worker pipelines (WhatsApp, Telegram, Discord) with ~250 lines of duplicated logic each. Should be extracted into a shared pipeline function.
- **`frontend/src/pages/DashboardPage.tsx:72-77`** — Dashboard secondary stats (Revenue, Response Time, Satisfaction, AI Accuracy) are hardcoded placeholder values. Missing backend API endpoints for these metrics.
- **`src/routes/workspaces.ts`** — 1200+ line route file handling 4 platforms (WhatsApp, Telegram, Twitter, Discord) with massive inline platform-specific logic. Should be split into platform-specific route modules.
- **`src/routes/team.ts:31`** — Role validation allows `owner`, `admin`, `member` but User schema default is `viewer`. Inconsistent role vocabulary across the codebase.

## Known Bugs

- **`src/routes/apiKeys.ts:33` vs `src/middleware/auth.ts:45`** — API key creation hashes with bcrypt but auth lookup hashes with SHA-256. Newly created API keys will never authenticate successfully. Critical functional bug.
- **`src/middleware/httpProxy.ts:57-64`** — `getDomain()` includes port in the domain key (`hostname:port`), causing separate circuit breaker/rate limit states for the same hostname on different ports. Should normalize to hostname-only for domain-level tracking.
- **`src/middleware/tenant.ts`** — Standalone tenant middleware exists but is not mounted in `src/index.ts`. Only `authenticateToken` is used, meaning `tenantContext` AsyncLocalStorage is never populated for most routes.
- **`src/routes/conversations.ts:170-173`** — `lastMessageAt` update is not idempotent and races with concurrent message sends. Could cause stale timestamps under load.
- **`src/services/workflowEngine.ts:82-86`** — Workflow step auto-mapping writes directly to Lead `name` and `email` without validation. Malicious or malformed workflow responses can overwrite lead data.

## Security Concerns

- **`src/utils/crypto.ts:9-11`** — `getKey()` generates a random salt on every call but never persists it, making decryption impossible across restarts. The actual `encryptCredential`/`decryptCredential` functions correctly use per-record salt. The unused `getKey()` function is dead code with a misleading fallback.
- **`src/utils/crypto.ts:9`** — Fallback encryption key `'fallback-dev-key-change-in-prod'` used when `CREDENTIAL_ENCRYPTION_KEY` and `JWT_SECRET` are both missing. Should fail fast instead of silently using weak key.
- **`src/middleware/auth.ts:29-40`** — `DEV_AUTH_BYPASS=true` completely skips JWT verification and assigns admin role. Must never be enabled in production. `.env` has it enabled.
- **`src/routes/gateway.ts:39-41`** — WhatsApp signature verification skipped when `DEV_AUTH_BYPASS=true`. An attacker could forge webhook payloads in dev/test environments.
- **`src/index.ts:91`** — CORS allows all origins in non-production: `if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production')`. Any origin can make authenticated requests in development.
- **`src/index.ts:110`** — Socket.IO configured with `cors: { origin: '*' }` — accepts connections from any origin. Should be restricted to known frontend origins.
- **`src/routes/webhooks.ts:23`** — Clerk webhook endpoint is unauthenticated (by design), but mounted at `/api/webhooks` without rate limiting. Potential DoS vector.
- **`src/routes/team.ts:27-35`** — No role-based authorization check. Any authenticated user can change any team member's role (including elevating to `admin`). Missing `requireAdmin` guard.
- **`apikeys.txt`** — Contains plaintext API keys (Groq, OpenAI) committed to repo. Even though `.gitignore` has `.env`, this plain text file is tracked.
- **`.env`** — Contains real credentials (database password, Groq API key, Clerk keys) committed to repo. Should use `.env.example` with placeholders only.
- **`src/routes/workspaces.ts:220,282`** — Bot tokens stored in plaintext in DB `config` JSON field. Discord `bot_token` and Telegram `bot_token` are persisted without encryption.
- **`src/routes/workspaces.ts:294-308`** — Twitter credentials (username, email, password) accepted in POST body and passed to Python service. No encryption at rest for these credentials.
- **`src/services/sessionManager.ts:18-24`** — Chat context stored in Redis without encryption. Sensitive conversation data persists in plaintext in Redis.
- **`src/index.ts:253-256`** — `execSync('lsof -ti:${PORT} | xargs kill -9 2>/dev/null')` — kills any process on the configured port at startup. Dangerous if multiple instances or other services use the same port.
- **`src/utils/sanitize.ts:5-19`** — HTML sanitization uses regex instead of a proper library (e.g., DOMPurify). Regex-based sanitization is notoriously bypassable.
- **`src/routes/conversations.ts:151-153`** — Error details from WhatsApp send failures exposed to client: `details: sendErr?.message`. Could leak internal infrastructure information.

## Performance Issues

- **`src/routes/workspaces.ts:89-153`** — GET `/api/workspaces` makes individual platform API calls for each bot on every request. N+1 query pattern — should batch status checks or cache results.
- **`src/services/sessionManager.ts:17-25`** — Chat context limited to 10 messages (`ltrim(key, 0, 9)`). For long conversations, early context is lost, degrading AI response quality.
- **`src/workers/index.ts:198`** — WhatsApp and Telegram workers have concurrency of 5, while Discord has 200. May need tuning based on actual throughput requirements.
- **`src/routes/analytics.ts:28-51`** — Raw SQL queries for message volume analytics. No materialized view or caching — full table scan on every dashboard load.
- **`src/middleware/rateLimit.ts`** — Redis-backed rate limiter requires a Redis round-trip for every request. Consider local in-memory fallback with periodic sync.
- **`src/middleware/quota.ts:36-41`** — Quota check queries `prisma.tenant.findUnique` on every request to get the plan. Should be cached in Redis or attached to the auth token.
- **`src/index.ts:222-231`** — Legacy `recordRequest` middleware runs on every request alongside `requestLoggerMiddleware`. Duplicate request tracking overhead.

## Fragile Areas

- **`src/index.ts:282-392`** — Startup sync reconnects all bots with `Promise.allSettled`. If platform APIs are slow or down, startup hangs for up to the timeout duration. No individual timeouts per bot.
- **`src/routes/workspaces.ts:347`** — WhatsApp session name generated with `Date.now() + random`. Not guaranteed unique under high concurrency. Could cause collisions.
- **`src/workers/index.ts:193-195`** — Worker throws on error for BullMQ retry, but no dead letter queue routing. Permanently failed jobs are only logged, not moved to DLQ.
- **`src/routes/conversations.ts:132-155`** — WhatsApp message dispatch is synchronous inside the HTTP handler. If Evolution API is slow, the request blocks until timeout.
- **`src/services/ruleEngine.ts:33-37`** — Pricing response is hardcoded to `$99/month`. Should be configurable per tenant.
- **`src/routes/gateway.ts:106-133`** — Bot status update from `connection.update` event uses fire-and-forget `prisma.bot.updateMany().then().catch()`. DB errors are silently swallowed.
- **`src/routes/webhooks.ts:131-146`** — `user.deleted` webhook suspends the entire tenant. Single user deletion cascades to all users in that tenant.
- **`src/middleware/validate.ts`** — Not reviewed but referenced extensively. If validation is missing or weak, all input-accepting routes are vulnerable to injection.
- **`src/billing/recordUsage.ts`** — Billing recording happens inside the worker pipeline. If it fails, the message is processed but not billed. Revenue leakage risk.

## Missing Pieces

- **No CSRF protection** — API uses Bearer tokens (immune) but Socket.IO and webhook endpoints lack additional CSRF safeguards.
- **No request body size limits** — `express.json()` used without size limit config. Large payloads could OOM the server.
- **No input sanitization on most routes** — `sanitizeInput` exists in `src/utils/sanitize.ts` but is not applied in route handlers (conversations, leads, workflows, etc.).
- **No database migrations for indexes** — Schema has `@@index` directives but no evidence of migration strategy for production index creation.
- **No health check for platform adapters** — `/health` and `/ready` only check Postgres and Redis, not Evolution API, Telegram API, or Discord.
- **No graceful degradation for AI** — If AI provider is down, the entire message pipeline fails. No fallback to cached responses or queueing for later.
- **No audit trail for admin actions** — Admin DLQ replay and queue management actions are logged but not persisted to the Event table.
- **No tenant isolation on Socket.IO** — `join_tenant` event trusts client-provided `tenantId` without verification. A client could join any tenant's room.
- **Missing `updatedAt` on Message model** — Messages cannot track edit timestamps or delivery status updates.
- **No webhook retry mechanism** — Failed webhook processing relies solely on BullMQ retry. No exponential backoff configuration for external webhook delivery.
