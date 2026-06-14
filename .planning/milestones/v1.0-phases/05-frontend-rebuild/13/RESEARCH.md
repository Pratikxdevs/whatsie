# Research: Phase 13 — Telegram API Integration (Hydrogram MTProto)

## Platform Under Integration

**Location:** `platforms/telegram-api/main.py` (FastAPI server, port 8082)
**Transport:** Hydrogram MTProto library (Python, async)
**Docker:** Already defined in `docker-compose.yml` as `telegram-api` service on port 8082

## Telegram API Endpoints (from main.py)

### Auth Flow (Bot Token — primary path for CRM)
1. `POST /auth/sign-in-bot` — Create bot client from BotFather token
   - Input: `{ bot_token: string }`
   - Output: `{ status, session_name, bot_id, username }`
   - Auto-generates session_name: `bot_{bot_token.split(':')[0]}`

2. `POST /auth/initialize` — Start listening for messages on a session
   - Input: query param `session_name`
   - Output: `{ status: "listening", session_name }`
   - Registers `@client.on_message(filters.all)` handler → pushes to in-memory queue

3. `POST /auth/disconnect` — Stop and remove session
   - Input: query param `session_name`

### Auth Flow (Userbot — phone number)
1. `POST /auth/send-code` — Send verification code
2. `POST /auth/sign-in` — Verify code + sign in
3. `POST /auth/check-password` — Handle 2FA

### Messaging
1. `POST /messages/send` — Send text message
   - Input: query `session_name`, body `{ chat_id, text, parse_mode?, reply_to_message_id? }`
2. `POST /messages/send-photo` — Send photo
3. `POST /messages/send-document` — Send document
4. `GET /messages/history` — Get chat history
5. `GET /messages/search` — Search messages

### Other
- `GET /health` — Health check
- `GET /auth/sessions` — List active sessions
- `GET /updates/{session_name}` — SSE stream of incoming messages
- `GET /chats/list`, `GET /chats/{chat_id}`, `GET /users/{user_id}`, `GET /contacts/list`

## Current CRM Telegram Pipeline (already built)

### Inbound flow (WORKS, just needs a message source)
1. `POST /gateway/telegram/:tenantId` — receives Telegram Bot API webhook payloads
2. `src/normalizer/telegram.ts` — `normalizeTelegramWebhook()` converts to `NormalizedMessage`
3. `src/queue/setup.ts` — `telegramQueue` (BullMQ)
4. `src/workers/index.ts` — `telegramWorker` runs full 13-step pipeline

### Outbound flow (needs Hydrogram adapter)
1. `src/router/index.ts` — `ResponseRouter.dispatch()` has `telegram` case (lines 59-65)
2. Currently calls `sendTelegramMessage()` from `src/adapters/telegram.ts` (direct Bot API HTTP)
3. Needs to call Hydrogram API `/messages/send` instead

### Bot management
1. `src/routes/workspaces.ts` — Bot CRUD, currently only handles WhatsApp via Evolution API
2. Needs Telegram platform branching for create/start/stop/delete

## Architecture Decision: Inbound Bridge

**Problem:** Hydrogram uses MTProto (push-based). CRM expects Bot API webhook POSTs.

**Solution:** Add a webhook callback to the Telegram API's `on_message` handler:
- When `/auth/initialize` is called, accept an optional `webhook_url` parameter
- The `on_message` handler serializes the Hydrogram Message into standard Telegram Bot API JSON shape
- POSTs it to the webhook URL with the same format `normalizeTelegramWebhook()` expects
- This means ZERO changes needed to gateway.ts, normalizer, queue, or worker

**Bot API payload shape needed:**
```json
{
  "update_id": 123456,
  "message": {
    "message_id": 1,
    "from": { "id": 123, "first_name": "User", "username": "user" },
    "chat": { "id": -100123, "type": "private" },
    "date": 1716500000,
    "text": "Hello world",
    "entities": [...],
    "reply_to_message": { "message_id": 0 }
  }
}
```

## Environment Variables

| Variable | Default | Used By |
|----------|---------|---------|
| `TELEGRAM_API_URL` | `http://localhost:8082` | Node.js adapter |
| `TELEGRAM_API_TOKEN` | `telegram-api-secret` | Node.js adapter + Python API |
| `TELEGRAM_API_ID` | `33222828` | Python API (my.telegram.org) |
| `TELEGRAM_API_HASH` | `b95049a28bbfd17e32aab20511aef964` | Python API (my.telegram.org) |
| `TELEGRAM_SESSIONS_DIR` | `./sessions` | Python API |

## Key Isolation Requirement

The Telegram API must be **completely separate** from Evolution API:
- Different container (`telegram-api` vs `evolution-api`)
- Different port (8082 vs 8081)
- Different sessions directory
- Different adapter file (`src/adapters/telegramAdapter.ts` vs `src/adapters/evolutionApi.ts`)
- Different DB platform string (`'telegram'` vs `'whatsapp'`)
- Same Redis + Postgres infrastructure (shared)
