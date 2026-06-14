# CONCERNS
**Updated:** 2026-06-15
**Project:** CrmV2 — Whatsie WhatsApp AI CRM

## Security Concerns

### 🟡 Webhook Signature Verification — Partial
- **File**: `src/routes/gateway.ts`
- `EVOLUTION_API_SECRET` signature validation exists in code but has historically been bypassed in dev
- Verify the `isValidSignature()` call is not gated behind `process.env.NODE_ENV !== 'production'`
- **Risk**: Unauthenticated parties could inject arbitrary WhatsApp events

### 🟡 Debug Server Token Exposure Risk
- **File**: `src/debug/server.ts`
- `DEBUG_TOKEN` is required — good. But SSE stream URL `GET /api/stream` passes token as query param `?token=...`
- Query params appear in server access logs — token could be logged
- **Mitigation**: Move to Authorization header only (break SSE `EventSource` which doesn't support headers)

### 🟡 `/metrics` Endpoint Protection
- **File**: `src/metrics/index.ts`
- Prometheus `/metrics` endpoint requires basic auth — verify this is actually enforced in prod
- If misconfigured, exposes tenant counts, request rates, error counts

### 🟢 CORS Configuration
- `CORS_ORIGIN=*` set in Evolution API docker config — acceptable since Evolution API is internal
- Main Express app: verify `cors({ origin: FRONTEND_URL })` is set and not `*`

### 🟢 API Key Pepper Enforcement
- `API_KEY_PEPPER` is marked `required` via `requiredEnvs` check at startup — enforced
- Concern was addressed in Phase 1; no action needed

---

## Technical Debt

### 🟡 Pre-existing TypeScript Errors (11 errors, 8 files)
All are `TS7006: implicit any` on callback parameters. Not introduced by recent phases.
- `src/ai/structuralizer.ts:42` `.map(m =>` 
- `src/jobs/stalledConversations.ts:21` `.map(c =>`
- `src/middleware/auth.ts:70` `$transaction(async (tx) =>`
- `src/routes/analytics.ts:81` `.map(g =>`
- `src/routes/billing.ts:36,68` `.map(u =>`
- `src/routes/credentials.ts:28` `.map((cred) =>`
- `src/routes/whatsapp-chat.ts:36,82` `.map(async (bot) =>`
- `src/routes/workspaces.ts:49,52` `.filter(b =>`, `.map(async (bot) =>`
- **Fix**: Add `: any` or proper type annotation to each callback

### 🟡 `as any` Usage (~40 occurrences)
- Heaviest usage in `src/db/prisma.ts` (Prisma extension args), `src/queue/setup.ts` (IORedis type mismatch)
- Some in adapter responses and route handlers
- Not critical but reduces type safety in hot paths

### 🟡 Routes Without Enriched Error Codes
These routes still return `{ error: 'Internal Server Error' }` without typed codes or recovery:
- `src/routes/analytics.ts` (3 error paths)
- `src/routes/billing.ts` (3 error paths)
- `src/routes/conversations.ts` (10+ error paths) — highest priority
- `src/routes/leads.ts` (not checked — likely similar)
- `src/routes/credentials.ts` (not checked)
- **Fix**: Import `enrichError` and apply `DB_002`/`WA_004`/`DB_005` codes to each catch block

### 🟢 Dead Files
- `src/api/auth.ts` — deleted in Phase 28 commit but was listed as dead code before
- `src/middleware/httpProxy.ts` — proxy middleware, unclear if mounted anywhere
- Verify `httpProxy.ts` is actually used in `src/index.ts`

---

## Performance Risks

### 🟡 Unindexed Queries (Potential N+1)
- `src/routes/whatsapp-chat.ts`: `bots.map(async (bot) => ...)` — parallel per-bot API calls to Evolution API
- Each call is independent HTTP request; no batching or connection pooling
- At 10+ bots: 10 parallel HTTP calls on every chat page load
- **Fix**: Add concurrency limit (`p-limit`) or batch endpoint on Evolution API

### 🟢 Ring Buffer Memory (Debug Server)
- 2000 entries max, each entry is a JSON object with msg + meta
- Estimated memory: ~2MB worst case — acceptable for a dev/debug tool
- No concern at current scale

### 🟢 Prisma Query Logging (Dev)
- All queries logged in dev mode — could be noisy but is development-only
- Prod: only errors + slow queries (>200ms) — appropriate

### 🟡 Socket.IO Room Management
- `socket.join(tenantId)` called on every connect — correct
- No cleanup of empty rooms — Socket.IO handles this automatically, not a concern
- Potential issue: if `tenantId` is undefined on connect (auth failure), room join silently fails

---

## Missing Error Coverage

### 🟡 Routes Not Returning Enriched Errors
Frontend's `errorRecovery.handleEnrichedError()` only activates when `response.data.recovery` exists.
Routes still returning `{ error: string }` provide no recovery guidance:
- `conversations.ts` — `WA_004` (send failed), `DB_005` (not found)
- `analytics.ts` — `DB_002` (query timeout)
- `billing.ts` — `DB_002` (query timeout)
- `leads.ts` — likely similar pattern

### 🟢 Recovery Map Completeness
All 32 codes have recovery entries in `src/errors/recovery.ts`. No gaps in the map itself.

### 🟡 Frontend Error Recovery Tests
No tests exist for:
- `ErrorRecoveryHandler.handle()` per trigger
- `errorLog.activityLog()` → debug server delivery
- API interceptor recovery dispatch flow

---

## Observability Gaps

### 🟡 Stalled Conversations Job Logging
- `src/jobs/stalledConversations.ts` — no `addLog()` calls; runs silently
- Should log `[BACKEND]` on each job run with count of conversations closed

### 🟡 Quota Middleware Logging
- `src/middleware/quota.ts` — quota exceeded likely not logged to ring buffer
- Should log `[BACKEND] QUOTA_EXCEEDED tenant:X` with `Q_005` code

### 🟡 Billing Record Logging
- `src/billing/recordUsage.ts` — billing writes not visible in debug dashboard
- Should log `[BACKEND]` on each usage record

### 🟢 DLQ Worker Logging
- `src/workers/dlq.ts` — verify DLQ events are logged with `Q_004` code
- Was not updated in Phase 28

### 🟢 Frontend Route Change Logging
- `socketManager.ts` logs socket events — good
- Route changes (React Router navigation) not logged to debug server
- Could add in `App.tsx` via `useLocation()` effect

---

## Known Bugs / Issues

### 🟡 Docker Log Stream Timing
- `src/debug/dockerLogs.ts` captures `addLog` lazily via `require('../debug/server')` at stream start
- If Docker log stream starts before debug server is fully initialized, `addLogFn` is null
- Logs would be silently dropped for the first few seconds
- **Fix**: Pass `addLog` function as parameter or use event emitter pattern

### 🟡 Prisma Logger Circular Dependency Risk
- `src/db/prisma.ts` lazy-requires `../debug/server` via `getAddLog()`
- This avoids circular dep at module load time but could fail silently if require chain is wrong
- Verify with a startup test that DB logs actually appear in the 9222 dashboard

### 🟢 `prismaLogger.ts` File Unused
- `src/debug/prismaLogger.ts` was created in Phase 28 but the logging is implemented directly in `src/db/prisma.ts` via `$on` events
- `prismaLogger.ts` exports a Prisma extension (`prismaLoggerExtension`) that is **never imported or applied**
- Either remove `prismaLogger.ts` or wire the extension via `prisma.$extends(prismaLoggerExtension)` in `db/prisma.ts`
- Currently dead code

### 🟢 BotCard Action Buttons (Carryover from Phase 21)
- Phase 21 bug fixes for `/bots` page were planned but status unclear
- QR flow, model selector no-op, and PhoneInput country reversion may still exist
- Verify current `/bots` page behavior before next demo

### 🟢 `src/api/auth.ts` Listed in Tree
- File appears in source tree scan but was marked as deleted in Phase 28 commit
- Confirm it is fully removed: `ls src/api/` should show empty or not exist
