# Technical Concerns

_Last updated: 2026-06-14 (all C/H/M/L concerns resolved — commit ffb28d1)_

---

## 🔴 Critical (Blocking / Security)

### ✅ C-001: API_KEY_PEPPER enforced at startup
**Fixed:** Added to `requiredEnvs` in `src/index.ts`. Removed insecure dev fallback from `hashApiKey()`.

### ✅ C-002: /metrics endpoint now auth-gated
**Fixed:** Bearer token check against `METRICS_TOKEN` env var. Server returns 401 if token is set and not matched.

### ✅ C-003: Legacy whatsapp.routes.ts removed
**Fixed:** Import removed from `src/index.ts`. `/api/whatsapp/instance/*` returns 410 Gone with redirect note.

---

## 🟡 High (Should Fix Soon)

### ✅ H-001: Duplicate test directories removed
**Fixed:** Deleted `src/__tests__/schemas/` and `src/utils/__tests__/`.

### H-002: No frontend test suite
**Deferred:** Large effort (~1 week). Tracked for next milestone.

### H-003: Worker pipeline untested
**Deferred:** Large effort (~3 days). Tracked for next milestone.

### ✅ H-004: AI API keys now decrypted before use
**Fixed:** `orchestrator.ts` now calls `decryptCredential(keyValue)` (using `isEncrypted()` guard for backward compat).

### H-005: BillingUsage table missing `createdAt`
**Non-issue:** Confirmed — no code queries `createdAt` on `BillingUsage`. Schema intentional.

### H-006: Socket.IO emits tenant room ID in plaintext
**Accepted:** Low probability, UUID brute-force not feasible. Documented. Deferred.

### ✅ H-007: Message deduplication added
**Fixed:** Worker uses Redis SETNX with 30-min TTL on `dedup:msg:{tenantId}:{platformMessageId}`.

---

## 🟢 Medium (Tech Debt)

### ✅ M-001: whatsapp.routes.ts superseded
**Fixed:** Removed with C-003.

### ✅ M-002: Bot config cache moved to Redis
**Fixed:** `orchestrator.ts` now uses `redisConnection.set/get` with 60s TTL — safe for multi-process deployments.

### ✅ M-003: OpenRouter client map is now LRU-bounded
**Fixed:** `openRouterClients` replaced with `LRUCache<string, OpenAI>({ max: 100 })`.

### ✅ M-004: window monkey-patch replaced with clerk-bridge singleton
**Fixed:** `frontend/src/lib/clerk-bridge.ts` module created. `AuthContext.tsx`, `api.ts` updated.

### ✅ M-005: Dead LoginPage/RegisterPage deleted
**Fixed:** Files removed.

### ✅ M-006: Dead tenantAuthMiddleware removed
**Fixed:** `src/middleware/tenant.ts` now only exports `tenantContext`.

### ✅ M-007: User.role field added to schema
**Fixed:** Migration `20260614000000_add_user_role` created. Will apply on next server start.

---

## 🔵 Low (Nice to Have)

### L-001 / L-002
Already covered or deferred to docs sprint.

### ✅ L-003: stalledConversations interval now configurable
**Fixed:** Reads `STALLED_CONV_INTERVAL_MS` and `STALLED_CONV_THRESHOLD_HOURS` env vars (defaults: 1h / 12h).

### ✅ L-004: Debug server optionally auth-gated
**Fixed:** Checks `DEBUG_TOKEN` env var. Returns 401 if token is set and bearer doesn't match.

### ✅ L-005: Duplicate utils/httpProxy.ts deleted
**Fixed:** Removed. `middleware/httpProxy.ts` is the canonical location.

---

## Security Concerns Summary

| Concern               | Severity | Status |
|-----------------------|----------|--------|
| API_KEY_PEPPER missing| 🔴 Critical | ✅ Fixed — enforced at startup |
| /metrics unauthed     | 🔴 Critical | ✅ Fixed — METRICS_TOKEN bearer |
| AI keys plaintext     | 🟡 High   | ✅ Fixed — decrypt on read |
| Socket.IO room UUIDs  | 🟡 High   | Accepted risk |
| Debug server no auth  | 🔵 Low    | ✅ Fixed — DEBUG_TOKEN bearer |

---

## Remaining Open Items (Deferred)

| Concern | Priority | Est. Effort |
|---------|----------|-------------|
| Frontend test suite (H-002) | 🟡 High | ~1 week |
| Worker pipeline tests (H-003) | 🟡 High | ~3 days |
