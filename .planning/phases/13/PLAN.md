# PLAN: Phase 13 — Telegram API Standalone Integration

**Phase Goal:** Wire the standalone Telegram API (`platforms/telegram-api/main.py`) into the CRM as a fully independent platform adapter — completely separate from Evolution API/WhatsApp. Verify bot connection, message send/receive, and webhook forwarding work end-to-end before touching the frontend.

**Why:** The Telegram API server already exists in Docker (port 8082) and has auth, messaging, and SSE endpoints built. The CRM already has a Telegram gateway route, normalizer, BullMQ queue, and worker. The missing piece is the bridge: a Node.js adapter that calls the Telegram API, and a webhook callback in the Telegram API that pushes incoming messages to the CRM gateway.

**Dependency:** None — this can run independently.

---

## Wave 1: Hydrogram API — Add webhook push support

### P01 — Add webhook callback to `on_message` handler

**File:** `platforms/telegram-api/main.py`

Modify `POST /auth/initialize` to accept an optional `webhook_url` query param. When set, the `on_message` handler also HTTP POSTs the message to `webhook_url` in standard Telegram Bot API JSON format (matching what `src/normalizer/telegram.ts:normalizeTelegramWebhook()` expects).

Changes:
1. Accept `webhook_url: str` and `webhook_secret: str` query params on `/auth/initialize`
2. Store webhook config per session in a new `webhook_configs` dict
3. In `on_message`, serialize Hydrogram `Message` into Bot API JSON shape (update_id, message.from, message.chat, message.text, message.date, etc.)
4. POST to webhook_url using `httpx.AsyncClient` (fire-and-forget with logging)
5. Add `X-Telegram-Bot-Api-Secret-Token` header with the webhook_secret
6. Add monotonic `update_id` counter per session

**Bot API payload shape:**
```json
{
  "update_id": 123456,
  "message": {
    "message_id": 1,
    "from": {"id": 123, "first_name": "Name", "username": "user"},
    "chat": {"id": 456, "type": "private"},
    "date": 1716500000,
    "text": "Hello",
    "caption": null,
    "entities": [],
    "photo": [],
    "voice": null,
    "document": null,
    "location": null,
    "reply_to_message": null,
    "forward_date": null
  }
}
```

### P02 — Add session status endpoint

**File:** `platforms/telegram-api/main.py`

Add `GET /session/{session_name}/status`:
```json
{
  "session_name": "bot_123456",
  "connected": true,
  "listening": true,
  "bot_info": {"id": 123456, "username": "mybot", "first_name": "My Bot"}
}
```

---

## Wave 2: Node.js Telegram Adapter

### P03 — Create Hydrogram adapter HTTP client

**File:** `src/adapters/telegramAdapter.ts` (rewrite — currently uses direct Bot API)

Replace with a clean HTTP client to the Hydrogram API (port 8082), modeled after `src/adapters/evolutionApi.ts`:

```typescript
const TG_URL = process.env.TELEGRAM_API_URL || 'http://localhost:8082';
const TG_TOKEN = process.env.TELEGRAM_API_TOKEN || 'telegram-api-secret';
```

Functions:
- `signBot(botToken)` → POST /auth/sign-in-bot
- `initializeSession(sessionName, webhookUrl, webhookSecret?)` → POST /auth/initialize
- `sendMessage(sessionName, chatId, text, parseMode?)` → POST /messages/send
- `sendPhoto(sessionName, chatId, photo, caption?)` → POST /messages/send-photo
- `sendDocument(sessionName, chatId, document, caption?)` → POST /messages/send-document
- `disconnectSession(sessionName)` → POST /auth/disconnect
- `getSessionStatus(sessionName)` → GET /session/{name}/status
- `healthCheck()` → GET /health
- `listSessions()` → GET /auth/sessions

---

## Wave 3: Response Router + Workspace Integration

### P04 — Update ResponseRouter for Hydrogram dispatch

**File:** `src/router/index.ts` (lines 59-65)

Change the `telegram` case to:
1. Import `sendMessage` from new `telegramAdapter.ts`
2. Look up bot: `prisma.bot.findFirst({ where: { tenantId, platform: 'telegram' } })`
3. Call `sendMessage(bot.sessionName, chatId, responseText)` with rate limiting

### P05 — Update workspace routes for Telegram platform

**File:** `src/routes/workspaces.ts`

Branch every endpoint on `platform === 'telegram'`:

- **POST / (create):** When platform=telegram, require `bot_token` in body. Call `signBot(bot_token)` + `initializeSession(sessionName, webhookUrl)` where webhook = `${APP_URL}/gateway/telegram/${tenantId}`. Create Bot record with `platform: 'telegram'`.
- **POST /:id/start:** Call `initializeSession()` with webhook URL. No QR needed (bot token auth is instant).
- **POST /:id/stop:** Call `disconnectSession()`.
- **DELETE /:id:** Call `disconnectSession()`, delete DB record.
- **GET /:** Add Telegram status sync via `getSessionStatus()`.
- **GET /:id/connection-status:** Add Telegram branch via `getSessionStatus()`.

### P06 — Update startup status sync

**File:** `src/index.ts`

Add Telegram bot status reconciliation on startup (alongside existing WhatsApp sync):
- Find bots with `platform: 'telegram'` and `sessionName` not null
- Call `getSessionStatus()` for each
- Update DB status accordingly

---

## Wave 4: Docker & Config

### P07 — Docker Compose verification

**File:** `docker-compose.yml`

- Verify `telegram-api` service has correct build context pointing to `platforms/telegram-api/Dockerfile`
- Ensure `TELEGRAM_API_TOKEN` env var is passed to both the telegram-api and the backend services
- Ensure session volume mount exists

### P08 — Environment config

- `.env.example`: Document `TELEGRAM_API_URL`, `TELEGRAM_API_TOKEN`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`
- Verify `docker-compose.yml` passes these to the telegram-api container

---

## Wave 5: Verification

### P09 — E2E connection verification

1. `docker compose up telegram-api` — verify API starts on port 8082
2. `curl http://localhost:8082/health` — returns `{"status":"ok","active_sessions":0}`
3. Create bot: `POST /api/workspaces` with `platform: 'telegram'`, `bot_token: '<token>'`
4. Verify `GET /api/workspaces/:id/connection-status` → connected
5. Send message to bot on Telegram → verify CRM receives it (check DB)
6. Reply from CRM → verify message delivered via Hydrogram API
7. `npm test` — all existing tests pass

---

## Files Changed

| # | File | Action |
|---|------|--------|
| 1 | `platforms/telegram-api/main.py` | Modify — webhook push + status endpoint |
| 2 | `src/adapters/telegramAdapter.ts` | Rewrite — Hydrogram API client |
| 3 | `src/router/index.ts` | Modify — telegram dispatch uses Hydrogram |
| 4 | `src/routes/workspaces.ts` | Modify — Telegram platform branching |
| 5 | `src/index.ts` | Modify — Telegram startup sync |
| 6 | `docker-compose.yml` | Verify — telegram-api service config |
| 7 | `.env.example` | Update — Telegram env vars |

## Files NOT Changed

- `src/normalizer/telegram.ts` — works as-is (Bot API payload shape)
- `src/normalizer/types.ts` — `'telegram'` already in platform union
- `src/routes/gateway.ts` — `/gateway/telegram/:tenantId` works as-is
- `src/queue/setup.ts` — `telegramQueue` exists
- `src/workers/index.ts` — `telegramWorker` exists
- `src/adapters/evolutionApi.ts` — untouched (WhatsApp only)
- `src/adapters/whatsapp.adapter.ts` — untouched (WhatsApp only)
