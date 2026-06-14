# Research: Phase 14 — Full Telegram UI Integration + Universal Logger

## What Exists

### Frontend Bot Management Components

| Component | File | Status |
|-----------|------|--------|
| PlatformSelector | `frontend/src/components/bots/PlatformSelector.tsx` | Telegram marked `supported: true`, shows Send icon |
| AddBotModal | `frontend/src/components/bots/AddBotModal.tsx` | 3-step wizard (platform → config → connect). Config step has NO Telegram-specific fields (no bot_token, no phone input). Connect step is WhatsApp-only (QR code). |
| BotCard | `frontend/src/components/bots/BotCard.tsx` | Shows start/stop/edit/delete. All actions wired to callbacks. Works for any platform. |
| BotConfigForm | `frontend/src/components/bots/BotConfigForm.tsx` | Name, system prompt, AI provider, temperature, max tokens. Generic — works for all platforms. |
| BotDetailPanel | `frontend/src/components/bots/BotDetailPanel.tsx` | 5 tabs: Overview, Configuration, Analytics, Conversations, Leads. All tabs functional. |
| QRCodeModal | `frontend/src/components/bots/QRCodeModal.tsx` | WhatsApp-specific (says "Scan the QR code with WhatsApp"). Needs Telegram variant. |
| BotsPage | `frontend/src/pages/BotsPage.tsx` | Grid with search/filter, start/stop/delete with optimistic UI, Socket.IO real-time, QR polling. All functional for WhatsApp. |

### API Service (`frontend/src/services/api.ts`)

- `botApi.createWorkspace(name, opts)` — opts has `system_prompt`, `ai_engine`, `platform`, `api_key`, `temperature`, `max_tokens`. **Missing `bot_token`.**
- `botApi.startWorkspace(id)` — returns `ConnectionStatus { sessionInfo, screenshotUrl }`. For Telegram, `screenshotUrl` will be null and `sessionInfo.status` will be `'connected'`.
- `botApi.stopWorkspace(id)` — generic, works for both.
- `botApi.deleteWorkspace(id)` — generic, works for both.
- `botApi.getConnectionStatus(id)` — returns `ConnectionStatus`. For Telegram, no QR.
- `botApi.updateWorkspace(id, data)` — generic.
- Auth interceptor: attaches Clerk session token via `window.__clerk`.
- Error interceptor: logs all API errors via `errorLog`.

### Auth (`frontend/src/contexts/AuthContext.tsx`)

- Login is **currently bypassed for local dev** with a hardcoded `DEV_USER` (admin role, tenantId `default`).
- Clerk is the intended production auth.
- The login page (`pages/LoginPage.tsx`) has email + password form.
- **The user does NOT need to "log into Telegram" via the CRM.** The Telegram auth is separate — the user provides a bot token (or phone number for userbot) through the AddBotModal, and the backend calls the Telegram API to authenticate.

### Backend Workspaces Routes (`src/routes/workspaces.ts`)

Already updated for Telegram in Phase 13:
- `POST /` — requires `bot_token` for platform=telegram, calls signBot + initializeSession
- `POST /:id/start` — calls initializeSession for Telegram (no QR)
- `POST /:id/stop` — calls disconnectSession for Telegram
- `DELETE /:id` — calls disconnectSession for Telegram
- `GET /` — status sync for both platforms
- `GET /:id/connection-status` — uses getSessionStatus for Telegram

### Debug Server (`src/debug/server.ts`)

Already runs on port 9222 with:
- HTML dashboard (live logs, health, stats, error codes)
- SSE stream at `/api/stream`
- Health checks: Postgres, Redis, Evolution API (**missing Telegram API**)
- Logs: in-memory ring buffer (1000 entries), request stats, error codes
- **Missing: does not log every HTTP request. Only logs when `recordRequest()` is called explicitly.**

### Telegram API (`platforms/telegram-api/main.py`)

All auth endpoints exist and work:
- `POST /auth/connect` — connect existing session
- `POST /auth/sign-in-bot` — bot token auth
- `POST /auth/send-code` — send OTP to phone
- `POST /auth/sign-in` — verify OTP code
- `POST /auth/check-password` — handle 2FA
- `POST /auth/initialize` — start listening + webhook push
- `POST /auth/disconnect` — clean disconnect
- `GET /session/{name}/status` — connection state

All messaging endpoints exist. **No logging to 9222 debug server.**

## What Needs To Be Built

### 1. Frontend Telegram Flow
The AddBotModal needs a Telegram-specific connect step. Two paths:

**Bot Token Path:**
- Config step: add `bot_token` input field (only shown when platform=telegram)
- Connect step: show "Connecting to Telegram..." spinner → "Connected!" (no QR code needed)
- Call `createWorkspace` with `bot_token`, then `startWorkspace`

**Userbot Path (optional, more complex):**
- Config step: add `phone_number` input
- Connect step: send-code → user enters OTP → sign-in → 2FA if needed
- Multiple sub-steps in the connect flow

### 2. QRCodeModal — Platform-aware
Needs to handle Telegram (no QR, just spinner → connected). Currently hardcoded to WhatsApp.

### 3. Debug Server — Universal Logger
Need to add:
- Request logging middleware (log every HTTP request to the debug buffer)
- Telegram API health check
- Log auth events (login/logout/register)
- Log message sends (both platforms)
- Telegram API → 9222 integration (Python POSTs logs to Node.js debug server)

### 4. Auth Flow Summary
```
CRM User login: email + password → AuthContext → JWT token (or Clerk)
Telegram Bot creation: bot_token → Backend → Hydrogram API → Telegram MTProto
These are two completely separate auth systems.
```
