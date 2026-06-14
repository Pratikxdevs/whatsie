# CONCERNS
**Updated:** 2026-06-15
**Project:** CrmV2 — Whatsie WhatsApp AI CRM

## Security Concerns

### 🟡 Webhook Signature Verification — Partial
- **File**: `src/routes/gateway.ts`
- `EVOLUTION_API_SECRET` signature validation exists in code but has historically been bypassed in dev
- Verify the `isValidSignature()` call is not gated behind `process.env.NODE_ENV !== 'production'`
- **Risk**: Unauthenticated parties could inject arbitrary WhatsApp events

### 🟡 `/metrics` Endpoint Protection
- **File**: `src/metrics/index.ts`
- Prometheus `/metrics` endpoint requires basic auth — verify this is actually enforced in prod
- If misconfigured, exposes tenant counts, request rates, error counts

### 🟢 CORS Configuration
- `CORS_ORIGIN=*` set in Evolution API docker config — acceptable since Evolution API is internal
- Main Express app: verify `cors({ origin: FRONTEND_URL })` is set and not `*`

---

## Technical Debt

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

### 🟡 AI Key Resolution Duplicated
- Both `src/ai/orchestrator.ts` and `src/AiInteg/config.ts` implement the same logic to resolve `OPENROUTER_API_KEY`.
- Duplicate resolution logic risks divergence. One canonical config should be used.

---

## Performance Risks

### 🟡 Unindexed Queries (Potential N+1)
- `src/routes/whatsapp-chat.ts`: `bots.map(async (bot) => ...)` — parallel per-bot API calls to Evolution API
- Each call is independent HTTP request; no batching or connection pooling
- At 10+ bots: 10 parallel HTTP calls on every chat page load
- **Fix**: Add concurrency limit (`p-limit`) or batch endpoint on Evolution API

### 🟡 Socket.IO Room Management
- `socket.join(tenantId)` called on every connect — correct
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

### 🟢 BotCard Action Buttons
- QR flow, model selector no-op, and PhoneInput country reversion may still exist
- Verify current `/bots` page behavior before next demo
