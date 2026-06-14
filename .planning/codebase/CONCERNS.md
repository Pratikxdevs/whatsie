# Technical Concerns

_Last updated: 2026-06-14 (after auth stabilization + bot sync hardening)_

---

## 🔴 Critical (Blocking / Security)

### C-001: API_KEY_PEPPER not enforced in production guard
**File:** `src/middleware/auth.ts` L22-28  
**Issue:** `hashApiKey()` warns if `API_KEY_PEPPER` is missing but uses a hardcoded fallback `'dev-pepper-do-not-use-in-prod'`. If deployed without the pepper set, API keys are insecurely hashed with a known value.  
**Risk:** API key compromise — attacker can reverse hash all keys if they know the pepper is the default.  
**Fix:** Enforce `API_KEY_PEPPER` at startup env validation (add to `requiredEnvs` in `index.ts`).

### C-002: /metrics endpoint unauthenticated
**File:** `src/index.ts` L130  
**Issue:** `GET /metrics` (Prometheus) has no auth — any client can read tenant message counts, error rates, latency histograms.  
**Risk:** Information disclosure — tenant IDs visible in metric labels.  
**Fix:** Add IP allowlist or basic auth to the metrics endpoint.

### C-003: Legacy whatsapp.routes.ts hardcodes wrong instance name
**File:** `src/routes/whatsapp.routes.ts` L22, 71, 95  
**Issue:** Hardcodes instance name as `tenant_{tenantId}_bot` but the actual adapter convention (and Evolution API) uses `bot_{botIdNoDashes}` or the exact name passed at creation. This route is still mounted.  
**Risk:** Bot management calls via this route target the wrong Evolution API instance — silent no-op or error.  
**Fix:** Remove or redirect to the primary workspaces router which uses the correct sessionName.

---

## 🟡 High (Should Fix Soon)

### H-001: Test file duplication
**Files:** `src/__tests__/utils/`, `src/utils/__tests__/`, `src/__tests__/schemas/`, `src/schemas/__tests__/`  
**Issue:** Same tests exist in two locations. Vitest glob `src/**/*.test.ts` picks them all up. Causes double test runs, inflated coverage numbers, and confusion.  
**Fix:** Remove the duplicate directories — keep one canonical location per domain.

### H-002: No frontend test suite
**Issue:** `frontend/` has no Vitest/Jest configured. Zero test coverage for 114 frontend files, 91 components, 8 pages.  
**Risk:** Regressions in UI logic, form validation, socket event handling go undetected.  
**Fix:** Add Vitest + React Testing Library to `frontend/`.

### H-003: Worker pipeline untested
**File:** `src/workers/index.ts` (245 lines)  
**Issue:** The 13-step BullMQ message processing pipeline has no unit or integration tests. The most critical business logic path has zero coverage.  
**Risk:** Regressions in intent classification, workflow triggering, AI fallback, lead qualification.  
**Fix:** Mock Evolution API + Redis, test each step of the worker.

### H-004: AI API key stored in plaintext
**File:** `prisma/schema.prisma` — `UserCredential.keyValue String`  
**Issue:** OpenRouter/Groq API keys stored as plain strings in DB. No encryption at rest.  
**Risk:** DB breach → all user AI keys exposed.  
**Fix:** Encrypt `keyValue` using server-side AES-256-GCM before storing. Add `keyEncrypted` + `keyIv` fields.

### H-005: BillingUsage table missing `createdAt` — potential schema drift
**Issue (from STATE.md):** `BillingUsage` model lacks a `createdAt` column in some states. The schema.prisma shows no `createdAt` on `BillingUsage`, which may cause query issues if any code expects it.  
**Fix:** Verify `BillingUsage` table columns match schema.prisma with `npx prisma migrate status`.

### H-006: Socket.IO emits tenant room ID in plaintext
**File:** `src/workers/index.ts` L52, L147  
**Issue:** Worker emits `io.to(msg.tenantId)` — tenantId (a UUID) is used as the room name. Clients that know or guess a tenantId can emit `join_tenant` for any tenant. The server validates this, but the room name itself is a UUID which could be brute-forced.  
**Risk:** Low probability but deserves a signed room token pattern.

### H-007: No message deduplication in worker
**File:** `src/workers/index.ts`  
**Issue:** If Evolution API retries a webhook (network timeout), the same message is enqueued twice. `processInboundMessageDbUpdates()` may upsert the same `Message` twice.  
**Risk:** Duplicate messages in DB, double AI responses to users.  
**Fix:** Use `platformMessageId` as idempotency key before processing. Check/set with Redis SETNX.

---

## 🟢 Medium (Tech Debt)

### M-001: `src/routes/whatsapp.routes.ts` is superseded but still mounted
**Issue:** This legacy proxy route (bot instance create/state/logout) duplicates functionality now handled by `src/routes/workspaces.ts` + `src/adapters/evolutionApi.ts`. It's mounted at `/api/whatsapp` alongside the chat route.  
**Fix:** Audit if any frontend code still calls `/api/whatsapp/instance/*`. Remove if not.

### M-002: Bot config caching in AI orchestrator is in-memory (single process)
**File:** `src/ai/orchestrator.ts` L11, `botCache` Map  
**Issue:** Bot config cached in a process-level Map with 60s TTL. In multi-process deployments (PM2 cluster, K8s), each process has its own cache → inconsistent AI config.  
**Fix:** Move cache to Redis with TTL.

### M-003: OpenRouter client cache is unbounded
**File:** `src/ai/orchestrator.ts` L8, `openRouterClients` Map  
**Issue:** `openRouterClients` grows indefinitely — one entry per unique API key, never evicted.  
**Risk:** Memory leak in long-running processes with many tenants using different keys.  
**Fix:** Use LRU cache (e.g., `lru-cache`) with size limit.

### M-004: `window.__clerkGetToken` / `window.__clerkLogout` global monkey-patch
**File:** `frontend/src/contexts/AuthContext.tsx` L72-73  
**Issue:** Clerk functions exposed on `window` for the Axios interceptor to consume. Non-idiomatic, fragile, and risky in SSR contexts (though not SSR here).  
**Fix:** Use React Context or a module-level singleton instead.

### M-005: `LoginPage.tsx` and `RegisterPage.tsx` are dead code
**File:** `frontend/src/pages/LoginPage.tsx`, `RegisterPage.tsx`  
**Issue:** App.tsx routes `/login` and `/register` to Clerk's `<SignIn>` / `<SignUp>` components inline, not to these page files. The page files are imported nowhere.  
**Fix:** Delete the unused page files.

### M-006: `tenantAuthMiddleware` in tenant.ts is unused
**File:** `src/middleware/tenant.ts` — `tenantAuthMiddleware` function  
**Issue:** This middleware (API key auth → set tenant context) exists but is not mounted anywhere. `authenticateToken` in `auth.ts` handles both Clerk + API key and calls `tenantContext.run()` directly.  
**Fix:** Remove dead code or document intended use case.

### M-007: Missing Role field on User model
**File:** `prisma/schema.prisma` — `User` model  
**Issue:** No `role` field on the `User` model. The frontend `AuthContext` reads `clerkUser.publicMetadata.role` and the `webhooks.ts` sets `role: 'admin'` on the DB User. But the User model has no `role` column — the DB can't enforce role-based access control.  
**Fix:** Add `role String @default("admin")` to User model and run migration.

---

## 🔵 Low (Nice to Have)

### L-001: `src/__tests__/schemas/` and `src/schemas/__tests__/` duplicate
Already covered under H-001.

### L-002: No OpenAPI/Swagger documentation
Routes are undocumented outside of inline code comments. Makes onboarding harder.

### L-003: `stalledConversations.ts` job interval not configurable
Hardcoded schedule — should be driven by env var.

### L-004: Debug server (port 9222) has no auth
Anyone on the network can view the ring-buffer logs at port 9222. Fine for dev, bad for production.

### L-005: `src/utils/httpProxy.ts` duplicates middleware/httpProxy.ts
Two files for HTTP proxy utilities — one in `utils/`, one in `middleware/`. Merge into one.

---

## Security Concerns Summary

| Concern               | Severity | Issue                                              |
|-----------------------|----------|----------------------------------------------------|
| API_KEY_PEPPER missing| 🔴 Critical | Hardcoded fallback pepper in dev mode            |
| /metrics unauthed     | 🔴 Critical | Tenant IDs in Prometheus labels                  |
| AI keys plaintext     | 🟡 High   | UserCredential.keyValue not encrypted at rest     |
| Socket.IO room UUIDs  | 🟡 High   | tenantId as room name (minor brute-force surface) |
| Debug server no auth  | 🔵 Low    | Ring-buffer logs at port 9222                     |

---

## Performance Concerns

| Concern                     | Issue                                            | Priority |
|-----------------------------|--------------------------------------------------|----------|
| Bot config in-memory cache  | Process-local, unbounded memory                 | 🟡 High  |
| OpenRouter client map       | Unbounded LRU growth                            | 🟢 Medium|
| No pagination on Socket.IO  | Large tenants emit all history on connect       | 🟢 Medium|
| Missing indexes             | Event table only indexed on tenantId            | 🟢 Medium|

---

## Reliability Concerns

| Concern                     | Issue                                            | Priority |
|-----------------------------|--------------------------------------------------|----------|
| No message deduplication    | Double processing on webhook retry               | 🟡 High  |
| Worker pipeline untested    | Regressions invisible                           | 🟡 High  |
| Bot status polling          | No rate limit on startup reconciliation          | 🟢 Medium|
| Stalled conv job            | No dead letter if job fails                     | 🔵 Low   |

---

## Tech Debt Summary

| Area                         | Concern                         | Priority | Est. Effort |
|------------------------------|---------------------------------|----------|-------------|
| whatsapp.routes.ts           | Legacy proxy, wrong instance name | 🔴 Crit | 1h (remove) |
| API_KEY_PEPPER enforcement   | Missing in startup validation   | 🔴 Crit | 30m         |
| /metrics auth                | Unauthenticated Prometheus      | 🔴 Crit | 1h          |
| UserCredential encryption    | Plaintext AI keys in DB         | 🟡 High | 4h          |
| Message deduplication        | No idempotency key in worker    | 🟡 High | 2h          |
| Frontend tests               | Zero test coverage              | 🟡 High | 1 week      |
| Worker tests                 | No pipeline tests               | 🟡 High | 3 days      |
| Test deduplication           | 2x schema + utils tests         | 🟢 Med  | 1h (delete) |
| Bot config Redis cache       | In-memory → Redis               | 🟢 Med  | 2h          |
| User.role DB field           | Missing from schema             | 🟢 Med  | 1h + migrate|
| Dead code (LoginPage etc)    | Unused files                    | 🔵 Low  | 30m         |
