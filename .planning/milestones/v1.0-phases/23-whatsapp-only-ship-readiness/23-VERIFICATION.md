# Phase 23 Verification: WhatsApp-Only Ship Readiness

**Status:** `gaps_found`
**Verified:** 2026-06-09
**Verifier:** GSD Agent

---

## Summary

Phase 23 successfully removed all non-WhatsApp platform code and made WhatsApp production-ready. However, **9 obsolete test files** referencing deleted code remain, causing test failures. Additionally, **Telegram/Discord/Twitter error codes** and **PlatformStep onboarding component** were not cleaned up.

---

## Verification Results

### 1. Platform Removal — PASS

| Platform | Backend Adapters | Normalizers | Workers | Docker Services |
|----------|-----------------|-------------|---------|-----------------|
| Telegram | `telegramAdapter.ts` deleted | `telegram.ts` deleted | `telegramWorker` removed | `telegram-api`, `hydrogram-api` removed |
| Discord | `discordAdapter.ts` deleted | `discord.ts` deleted | `discordWorker` removed | N/A (in-process) |
| Twitter | `twitterApi.ts`, `twitter.adapter.ts` deleted | `twitter.ts` deleted | `twitterWorker.ts`, `twitterSync.ts` deleted | `twitter-api` removed |

**Evidence:**
- `src/adapters/` contains only `evolutionApi.ts` and `whatsapp.adapter.ts`
- `src/normalizer/` contains only `types.ts`, `whatsapp.ts`, `whatsapp.test.ts`
- `src/workers/` contains only `index.ts` and `dlq.ts`
- `grep -r "telegram\|discord\|twitter" src/ --include="*.ts" | grep -v __tests__` — **CLEAN** (no results)

**Gap:** `src/errors/codes.ts` still contains `TG_*` (Telegram) and `TW_*` (Twitter) error codes (lines 55-70). These are inert constants but should be removed for cleanliness.

### 2. Frontend Simplification — PASS

| Check | Status |
|-------|--------|
| `Platform` type is `'whatsapp'` only | PASS (`frontend/src/components/bots/types.ts:3`) |
| `PlatformSelector.tsx` deleted | PASS |
| `TwitterSyncStatus.tsx` deleted | PASS |
| `AddBotModal.tsx` has no platform selection step | PASS (steps: `['config', 'connect']`) |
| `AddBotModal.tsx` hardcodes `platform: 'whatsapp'` | PASS (line 67) |
| `QRCodeModal.tsx` shows WhatsApp QR flow only | PASS |
| `PlatformIcon.tsx` has only WhatsApp icon | PASS |
| `BotDetailPanel.tsx` has no Twitter imports | PASS |
| `frontend/src/services/api.ts` — no `discordApi`, `telegramApi`, `scraperApi` | PASS |

**Gap:** `frontend/src/components/onboarding/PlatformStep.tsx` still exists and is used by `OnboardingPage.tsx`. It now only shows WhatsApp, but the component itself is redundant (single-option selector).

### 3. WhatsApp Connect — PASS

| Step | File | Verified |
|------|------|----------|
| createInstance (qrcode: true) | `src/adapters/evolutionApi.ts:149-201` | PASS |
| connectInstance → QR code | `src/adapters/evolutionApi.ts:212-217` | PASS |
| getConnectionState (open → connected) | `src/adapters/evolutionApi.ts:232-251` | PASS |
| connection.update webhook handler | `src/routes/gateway.ts:100-136` | PASS |
| Bot created with `status: 'pending_qr'` | `src/routes/workspaces.ts:123` | PASS |
| Socket.IO `bot_status_change` event | `frontend/src/components/bots/AddBotModal.tsx:41-46` | PASS |
| Polling + auto-close on connected | `AddBotModal.tsx:108-134` | PASS |

### 4. WhatsApp Pipeline — PASS

| Step | File | Verified |
|------|------|----------|
| Webhook → 200 OK + Redis idempotency | `src/routes/gateway.ts:84-187` | PASS |
| WhatsApp normalizer → NormalizedMessage | `src/normalizer/whatsapp.ts` | PASS |
| BullMQ queue (`whatsapp-messages`) | `src/queue/setup.ts` | PASS |
| Worker 13-step pipeline | `src/workers/index.ts:87-197` | PASS |
| Real-time Socket.IO (inbound) | `src/workers/index.ts:112-124` | PASS |

### 5. WhatsApp AI — PASS

| Step | File | Verified |
|------|------|----------|
| `callAiFallback` → `generateAiResponse` | `src/workers/index.ts:70-82` | PASS |
| Intent classification (HUMAN_ESCALATION, OPT_OUT, etc.) | `src/services/intentClassifier.ts` | PASS |
| Rule engine (short-circuits AI when handled) | `src/services/ruleEngine.ts` | PASS |
| Workflow engine (mid-flow + trigger) | `src/services/workflowEngine.ts` | PASS |
| AI orchestrator → tenant's AI provider | `src/ai/orchestrator.ts` | PASS |

### 6. WhatsApp Callback — PASS

| Step | File | Verified |
|------|------|----------|
| `ResponseRouter.dispatch` (WhatsApp only) | `src/router/index.ts:46-57` | PASS |
| `WhatsAppAdapter.sendMessage` (rate-limited) | `src/adapters/whatsapp.adapter.ts:18-26` | PASS |
| `sendText` → Evolution API POST | `src/adapters/evolutionApi.ts` | PASS |
| Rate limiter: 1 msg/sec | `src/rateLimiter/index.ts` (`whatsappLimiter`) | PASS |
| Outbound message persisted to PostgreSQL | `src/router/index.ts:34-43` | PASS |
| Delivery status updated | `src/router/index.ts:64-69` | PASS |
| Socket.IO `new_message` emit | `src/workers/index.ts:50-62` | PASS |

### 7. Docker — PASS

`docker-compose.yml` services:
- postgres ✅
- redis ✅
- prometheus ✅
- grafana ✅
- evolution-api ✅

Removed: `telegram-api`, `hydrogram-api`, `obscura`, `twitter-api` (and their volumes).

`platforms/` directories: Only `platforms/evolution-api/` remains.

### 8. Env Vars — PASS

| Check | Status |
|-------|--------|
| No `TELEGRAM_*` in `.env` or `.env.example` | PASS |
| No `DISCORD_*` in `.env` or `.env.example` | PASS |
| No `TWITTER_*` in `.env` or `.env.example` | PASS |
| `EVOLUTION_API_*` vars preserved | PASS |
| `discord.js` removed from `package.json` | PASS |

### 9. TypeScript — PASS

- Backend: `npx tsc --noEmit` — **CLEAN** (zero errors)
- Frontend: `cd frontend && npx tsc --noEmit` — **CLEAN** (zero errors)

### 10. Tests — GAPS FOUND

| Result | Count |
|--------|-------|
| Passed | 41 test files (360 tests) |
| Failed | 11 test files (8 tests) |

**Failed test files (Phase 23-related — testing deleted code):**

| Test File | Reason |
|-----------|--------|
| `src/__tests__/discord-adapter.test.ts` | Tests deleted Discord adapter |
| `src/__tests__/discord-normalizer.test.ts` | Tests deleted Discord normalizer |
| `src/__tests__/discord-startup.test.ts` | Tests deleted Discord startup sync |
| `src/__tests__/discord-worker.test.ts` | Tests deleted Discord worker |
| `src/__tests__/discord-workspace.test.ts` | Tests deleted Discord workspace routes |
| `src/__tests__/discord-rate-limit.test.ts` | Tests deleted Discord rate limiters |
| `src/__tests__/response-router.test.ts` | Tests Telegram/Discord dispatch (deleted) |
| `src/__tests__/telegram-webhook.test.ts` | Tests deleted Telegram webhook |
| `src/schemas/__tests__/bots.test.ts` | Tests `platform: "telegram"` (removed from enum) |

**Failed test files (pre-existing — unrelated to Phase 23):**

| Test File | Reason |
|-----------|--------|
| `src/__tests__/leads-api.test.ts` | Pre-existing Express v5 type mismatch |
| `src/middleware/auth.test.ts` | Pre-existing auth error message mismatch |

---

## Gaps Found

### Gap 1: Obsolete Test Files (HIGH)

**9 test files** reference deleted platform code. These should be deleted:
- `src/__tests__/discord-adapter.test.ts`
- `src/__tests__/discord-normalizer.test.ts`
- `src/__tests__/discord-startup.test.ts`
- `src/__tests__/discord-worker.test.ts`
- `src/__tests__/discord-workspace.test.ts`
- `src/__tests__/discord-rate-limit.test.ts`
- `src/__tests__/response-router.test.ts`
- `src/__tests__/telegram-webhook.test.ts`
- `src/schemas/__tests__/bots.test.ts` (uses `platform: "telegram"`)

### Gap 2: Error Code Registry (LOW)

`src/errors/codes.ts` still contains Telegram (`TG_001-003`) and Twitter (`TW_001-010`) error codes. These are inert constants but should be removed for completeness.

### Gap 3: PlatformStep Onboarding Component (LOW)

`frontend/src/components/onboarding/PlatformStep.tsx` is a single-option platform selector (WhatsApp only). It could be simplified or removed.

### Gap 4: Git History (NOTED)

Per P11 summary: `.git` was lost during `npm install` (postinstall script). Original commit history not preserved. User handled remote setup via GitHub Desktop.

---

## Human Verification Items

1. **Scan QR code flow** — Create a bot via the UI, verify QR code appears, scan with WhatsApp, confirm connection status updates in real-time
2. **Send a test message** — Send a message to the connected WhatsApp number, verify it appears in the conversations inbox
3. **AI response** — Confirm the bot replies with an AI-generated response
4. **Outbound send** — Type a message in the conversations page and send it, verify it arrives on WhatsApp
5. **Docker compose up** — Run `docker compose up -d` and verify all 5 services start correctly

---

## Conclusion

Phase 23 achieved its core goal: WhatsApp is the sole platform, the connect/pipeline/AI/callback flows are intact, Docker is clean, env vars are cleaned, and TypeScript compiles clean. The **primary gap is 9 obsolete test files** that should be deleted to restore a green test suite.
