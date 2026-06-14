# Plan: Phase 14 — Full Telegram UI Integration + Universal Logger (9222)

**Phase Goal:** Wire the Telegram platform fully into the frontend bot management UI — every button functional, every flow complete. Add comprehensive logging to the 9222 debug server for all system events.

---

## Wave 1: Telegram Auth + Bot Creation in AddBotModal

### P01 — AddBotModal Telegram-specific flow

**File:** `frontend/src/components/bots/AddBotModal.tsx`

The `connect` step currently only shows WhatsApp QR flow. Add a Telegram branch:

**When `platform === 'telegram'`:**
1. Config step: Add a `bot_token` input field below the name field (visible only for Telegram). Show hint: "Get a token from @BotFather on Telegram".
2. Connect step: Skip QR entirely. Show:
   - "Connecting to Telegram..." spinner
   - On success: "Connected! @bot_username" with checkmark
   - On error: "Failed to connect. Check your bot token." with retry
3. Pass `bot_token` in the `botApi.createWorkspace()` call

**When `platform === 'whatsapp'`:** Existing QR flow unchanged.

### P02 — Update API service for bot_token

**File:** `frontend/src/services/api.ts`

Add `bot_token?: string` to the createWorkspace options type.

---

## Wave 2: QRCodeModal + Start/Stop Telegram Awareness

### P03 — QRCodeModal platform-aware messaging

**File:** `frontend/src/components/bots/QRCodeModal.tsx`

Currently says "Scan the QR code with WhatsApp" always. Add platform prop:
- WhatsApp: existing QR flow
- Telegram: "Connecting to Telegram..." with spinner, no QR. Auto-close on connected.
- Update hint text: "Connecting to your Telegram bot..." instead of WhatsApp instructions

### P04 — BotsPage start/stop Telegram awareness

**File:** `frontend/src/pages/BotsPage.tsx`

The `handleStartStop` function currently always shows QR modal. When the bot's platform is `telegram`:
- On start: show a simple connecting modal (no QR), auto-transition to connected
- On stop: same as WhatsApp (just call stopWorkspace)
- On restart: stop then start, no QR

---

## Wave 3: Debug Server Universal Logger (9222)

### P05 — Add Telegram API health check to debug server

**File:** `src/debug/server.ts`

In `getSystemHealth()`, add Telegram API check alongside Evolution API:
```typescript
// Telegram API
try {
  const start = Date.now();
  const url = process.env.TELEGRAM_API_URL || 'http://localhost:8082';
  const res = await fetch(`${url}/health`, {
    signal: AbortSignal.timeout(5000),
  });
  checks.telegramApi = { status: res.ok ? 'ok' : 'degraded', latency: Date.now() - start };
} catch (err: any) {
  checks.telegramApi = { status: 'error', error: err.message };
}
```

### P06 — Add request logging middleware

**New file:** `src/middleware/requestLogger.ts`

Express middleware that logs every HTTP request to the debug server:
```typescript
// Logs: method, path, status, duration, userId, tenantId
// Sends to debug server addLog via recordRequest()
// Also logs auth events (login/logout) when path matches /api/auth/*
```

Wire it in `src/index.ts` after `requestId` middleware.

### P07 — Add event logging for message pipeline

**Files:**
- `src/adapters/telegramAdapter.ts` — log every outbound API call (send, photo, doc)
- `src/adapters/evolutionApi.ts` — add debug logging to send functions
- `src/workers/index.ts` — log message processing start/end, AI calls, response dispatch

Each log entry goes to both pino logger AND debug server ring buffer (via `debugLog()`).

### P08 — Telegram API Python logging to 9222

**File:** `platforms/telegram-api/main.py`

Add an HTTP logger that POSTs log entries to the Node.js debug server:
```python
DEBUG_URL = os.getenv("CRM_DEBUG_URL", "http://host.docker.internal:9222")

async def log_to_debug(level: str, msg: str, meta: dict = None):
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(f"{DEBUG_URL}/api/log", json={
                "level": level, "message": f"[TG-API] {msg}", "meta": meta
            })
    except: pass  # don't crash on debug server being down
```

Call this from: auth events, message send/receive, webhook POST, session connect/disconnect.

---

## Wave 4: Minor UI Fixes + Cleanup

### P09 — Remove hardcoded "WhatsApp" text

Search all bot-related components for hardcoded "WhatsApp" strings and make them platform-aware:
- `AddBotModal.tsx` line 259: "Connecting to WhatsApp..."
- `QRCodeModal.tsx` line 31: "Scan the QR code with WhatsApp"
- `QRCodeModal.tsx` line 82: "Open WhatsApp > Settings > Linked Devices"

### P10 — BotCard identifier for Telegram

**File:** `frontend/src/pages/BotsPage.tsx`

The `mapWorkspaceToBot` function sets `identifier: ws.session_id`. For Telegram bots, this should show the bot username from config or session name (e.g., `@mybot`).

---

## Wave 5: Verification

### P11 — End-to-end verification

1. Frontend: Create bot with platform=telegram, enter bot token → verify creation flow
2. Frontend: Start/stop/restart/delete Telegram bot → verify all buttons work
3. Frontend: Bot detail panel → verify all tabs show data for Telegram bots
4. Debug server (9222): Send a message → verify it appears in live logs
5. Debug server: Login → verify auth event logged
6. Debug server: Health check → verify Telegram API shows up
7. TypeScript compile check
8. `npm test` — all tests pass

---

## Files Changed

| # | File | Action |
|---|------|--------|
| 1 | `frontend/src/components/bots/AddBotModal.tsx` | Modify — Telegram bot_token flow |
| 2 | `frontend/src/services/api.ts` | Modify — add bot_token to createWorkspace |
| 3 | `frontend/src/components/bots/QRCodeModal.tsx` | Modify — platform-aware messaging |
| 4 | `frontend/src/pages/BotsPage.tsx` | Modify — Telegram start/stop awareness |
| 5 | `src/debug/server.ts` | Modify — Telegram health check |
| 6 | `src/middleware/requestLogger.ts` | New — universal request logging middleware |
| 7 | `src/index.ts` | Modify — wire requestLogger middleware |
| 8 | `src/adapters/telegramAdapter.ts` | Modify — add debug logging |
| 9 | `src/adapters/evolutionApi.ts` | Modify — add debug logging to sends |
| 10 | `src/workers/index.ts` | Modify — log pipeline stages |
| 11 | `platforms/telegram-api/main.py` | Modify — log to 9222 debug server |
