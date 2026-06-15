# CONCERNS.md — Technical Debt, Risks & Areas of Concern

**Project:** CrmV2 — Multi-Platform AI CRM Bot SaaS  
**Date:** 2026-06-15  
**Root:** `/home/clutch/Desktop/Whatsie`

---

## Critical Issues

### 1. Empty Workers/Handlers Directory

**File:** `src/workers/handlers/` (empty directory)

The worker pipeline architecture references handler registration (`./dlq` is imported, and `handlers/` exists as a directory), but no handler modules have been placed there. This suggests either:
- An incomplete refactor where handler logic was planned but not implemented
- A dead code path that should be cleaned up

**Impact:** Low currently (the main worker processes jobs directly in `src/workers/index.ts`), but any planned migration to handler-based architecture is blocked.

---

## High Priority

### 2. No Worker Tests

**Files:** `src/workers/index.ts` (274 lines)

The critical BullMQ worker implementing the 13-step message pipeline has zero tests. This is the most important code path in the system — handling the full message lifecycle from inbound webhook to outbound response.

**Risk:** Regressions in intent classification, workflow processing, AI fallback, or response delivery go undetected.

### 3. Adapter Evolution API Has No Tests

**File:** `src/adapters/evolutionApi.ts` (642 lines, largest file)

The core WhatsApp integration layer is untested. Every function requires a running Evolution API instance. No unit tests with HTTP mocking exist.

**Risk:** API contract changes in Evolution API v2.3 could silently break instance creation, message sending, or connection state management.

### 4. AI Orchestrator — Possibly Missing

**File:** `src/ai/orchestrator.ts` — Referenced by `src/workers/index.ts:22` (`import { generateAiResponse } from '../ai/orchestrator'`) but not confirmed to exist as a complete file.

The `src/ai/` directory contains `structuralizer.ts`, `leadPromotion.ts`, and yes — `orchestrator.ts` exists at `/home/clutch/Desktop/Whatsie/src/ai/orchestrator.ts` (6.4KB). But the file path resolution returned "File not found" when queried at `src/services/orchestrator.ts` — which does NOT exist. The correct path is `src/ai/orchestrator.ts`.

**Risk:** Low — file exists at correct path. No misconfiguration.

---

## Medium Priority

### 5. Ungraceful Console Disable

**Files:** `src/index.ts:38-43`, `src/workers/index.ts:37-43`

```typescript
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
}
```

All console methods are silently replaced with no-ops in production. This is overly aggressive — it also disables `console.error` which could mask runtime errors. A pino-based redirect or selective disable would be safer.

### 6. AI Integration Directory Naming Inconsistency

**Files:** `src/AiInteg/` (PascalCase with combined casing vs `src/ai/` lowercase)

Two directories contain AI-related code:
- `src/ai/` — Core orchestration (orchestrator, structuralizer, leadPromotion)
- `src/AiInteg/` — AI Bridge REST endpoints

The inconsistent naming (`AiInteg` vs `ai`) is confusing. The `AiInteg` directory appears to be a legacy module that should be merged into the `ai/` structure.

### 7. Any-Type Usage in Key Files

**Files:** Multiple locations

- `src/adapters/evolutionApi.ts` — `Record<string, any>` used for payloads and response data
- `src/index.ts` — `(socket as any).tenantId`, `(socket as any).userId`
- `src/workers/index.ts` — `dbRecords: any` in `callAiFallback()`

While pragmatic for external API interactions and dynamic socket properties, these bypass TypeScript strict mode checks and can hide bugs.

### 8. DLQ Monitor Implementation Status

**File:** `src/workers/dlq.ts` (1KB)

The dead letter queue monitor is imported and initialized but its actual behavior is unclear. The `handlers/` directory is empty, suggesting the DLQ may monitor but not act on failed jobs.

---

## Low Priority

### 9. Legacy Route Stubs

**File:** `src/index.ts:288-290`

```typescript
app.use('/api/whatsapp/instance', (_req, res) => {
  res.status(410).json({ error: 'Gone — use /api/workspaces for bot management' });
});
```

Legacy route stub with a hardcoded 410 response. Should be removed once all clients migrate to `/api/workspaces`.

### 10. Commented-Out Import

**File:** `src/index.ts:15`

```typescript
// whatsapp.routes.ts removed (C-003) — superseded by workspaces.ts + whatsapp-chat.ts
```

No code impact, but indicates historical route refactoring. The C-003 reference is a security convention marker. Worth verifying no remaining references to the removed routes exist.

### 11. TypeScript Build Excludes Test Files

**File:** `tsconfig.json:14`

```json
"exclude": ["node_modules", "dist", "src/**/*.test.ts", "src/__tests__/**"]
```

Test files are excluded from the production build, which is correct. However, `vitest` uses `tsx`/`ts-node` directly, so this doesn't affect test execution.

### 12. Aggressive Port Killing on Startup

**File:** `src/index.ts:385-388`

```typescript
try {
  const { execSync } = require('child_process');
  execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`, { timeout: 2000 });
} catch { /* port was free */ }
```

Kills any process holding the target port without discrimination. In development this is convenient, but it could kill unrelated processes sharing the same port in production-like environments.

---

## Security Observations

| # | Observation | Severity |
|---|-------------|----------|
| S-01 | API key pepper (`API_KEY_PEPPER`) required at startup — fail-fast if missing (C-001) | ✅ Good |
| S-02 | `/metrics` gated by `METRICS_TOKEN` bearer (C-002) | ✅ Good |
| S-03 | Strict CORS with single `FRONTEND_URL` | ✅ Good |
| S-04 | Helmet CSP and HSTS configured | ✅ Good |
| S-05 | PII redaction in logs (phone, email, API keys) | ✅ Good |
| S-06 | Console disabled in production (overly aggressive — also blocks `console.error`) | ⚠️ Medium |
| S-07 | `crossOriginEmbedderPolicy: false` — disables COEP for cross-origin resources | ⚠️ Low |
| S-08 | WebSocket emits unvalidated tenant data to rooms — relies on Socket.IO auth only | ⚠️ Low |
| S-09 | `apikeys.txt` file present in project root | 🔴 High |

---

## Performance Observations

| # | Observation | Impact |
|---|-------------|--------|
| P-01 | In-memory LRU cache (`lru-cache`) for frequently accessed data | ✅ Good |
| P-02 | Redis for rate limiting, queue, and Socket.IO pub/sub | ✅ Good |
| P-03 | Worker concurrency of 5 — may need tuning for high-traffic tenants | ⚠️ Monitor |
| P-04 | BullMQ `removeOnComplete: { age: 24h }` — keeps processed jobs for a day | ⚠️ Storage |
| P-05 | Prisma auto-migrations on startup block server until complete | ⚠️ Latency |
| P-06 | Request body limit of 50mb may be excessive for typical payloads | ⚠️ Low |

---

## Reliability Observations

| # | Observation | Impact |
|---|-------------|--------|
| R-01 | Startup bot status sync with `Promise.allSettled` | ✅ Good (non-blocking) |
| R-02 | Graceful shutdown with 10s timeout | ✅ Good |
| R-03 | Port contention handling (retries up to PORT+10) | ✅ Good |
| R-04 | BullMQ retries with exponential backoff (5 attempts, 1min initial) | ✅ Good |
| R-05 | Webhook deduplication with Redis `SET NX EX 1800` (H-007) | ✅ Good |
| R-06 | Prisma auto-migration on every startup — risks downtime if migration fails | ⚠️ Medium |
| R-07 | No health check for Evolution API dependency | ⚠️ Low |

---

## Code Quality Metrics

| Metric | Value |
|--------|-------|
| Total source files | ~50 files |
| Largest file | `evolutionApi.ts` (642 lines) |
| Files > 200 lines | 8 |
| Total test files | 15 |
| Test-to-source ratio | ~30% |
| Source lines with `any` type | ~20+ occurrences |
| TODO/FIXME markers | Not systematically counted |

---

## Summary of Action Items

| Priority | Item | File(s) |
|----------|------|---------|
| 🔴 High | Remove `apikeys.txt` from repo | `apikeys.txt` |
| 🟡 Medium | Add worker pipeline tests | `src/workers/index.ts` |
| 🟡 Medium | Add Evolution API adapter tests | `src/adapters/evolutionApi.ts` |
| 🟡 Medium | Improve console disable approach | `src/index.ts`, `src/workers/index.ts` |
| 🟡 Medium | Clean up `AiInteg` naming inconsistency | `src/AiInteg/`, `src/ai/` |
| 🟢 Low | Remove 410 legacy route stub | `src/index.ts` |
| 🟢 Low | Audit `any` type usage | Multiple files |
| 🟢 Low | Verify DLQ monitor behavior | `src/workers/dlq.ts` |
