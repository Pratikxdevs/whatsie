# ARCHITECTURE
**Updated:** 2026-06-15
**Project:** CrmV2 — Whatsie WhatsApp AI CRM

## System Overview
WhatsApp-only, multi-tenant AI CRM SaaS. Tenants each have one or more WhatsApp bots. Inbound WhatsApp messages are normalized, queued, and processed by an AI pipeline that generates responses and dispatches them back via Evolution API.

**Platforms supported (post Phase 23 cleanup):** WhatsApp only (Telegram/Discord/Twitter removed)

## High-Level Architecture
```
WhatsApp User
    │
    ▼
Evolution API (Docker port 8081)
    │ webhook POST /api/gateway/webhook/whatsapp
    ▼
Gateway Route (src/routes/gateway.ts)
    │ webhook signature verify (HMAC)
    │ normalize → NormalizedMessage
    ▼
BullMQ Queue ("whatsapp-messages" on Redis)
    │ 5 attempts, exponential backoff
    ▼
Worker (src/workers/index.ts)
    │
    ▼
AI Bridge (src/AiInteg/bridge.ts)
    ├─ Persist lead + conversation + inbound message (Prisma)
    ├─ AI generation (OpenRouter via openai SDK)
    ├─ Persist outbound message
    └─ ResponseRouter → Evolution API → WhatsApp User
```

## Layered Architecture

### Layer 1 — HTTP Server
- **Express** with `helmet`, `cors`, `express-rate-limit`
- **Middleware stack** (in order): requestId → clerkMiddleware → requestLogger → auth
- **Socket.IO**: tenant-room isolation, Clerk JWT auth on connect

### Layer 2 — Auth & Tenant Isolation
- `authenticateToken()` (src/middleware/auth.ts): API Key → Clerk JWT → fail-closed
- `tenantContext` (AsyncLocalStorage): all downstream operations receive tenantId
- **Enriched errors**: all auth failures return typed `{code, message, recovery}` responses
- `prisma` client: `$allOperations` injects `tenantId` in WHERE + sets PostgreSQL `app.current_tenant_id`
- `prismaUnfiltered`: bypasses tenant filter for webhook/system operations only

### Layer 3 — API Routes
| Route | File | Protected |
|-------|------|-----------|
| `POST /api/gateway/webhook/whatsapp` | gateway.ts | Webhook sig |
| `GET/POST/PUT/DELETE /api/workspaces` | workspaces.ts | Clerk JWT |
| `GET /api/conversations/*` | conversations.ts | Clerk JWT |
| `GET /api/leads/*` | leads.ts | Clerk JWT |
| `GET /api/analytics/*` | analytics.ts | Clerk JWT |
| `GET /api/billing/*` | billing.ts | Clerk JWT |
| `POST /api/ai/verify` | endpoints.ts | Public |
| `POST /api/ai/test` | endpoints.ts | Clerk JWT |
| `GET /api/credentials/*` | credentials.ts | Clerk JWT |
| `GET /metrics` | metrics/index.ts | Basic auth |
| `POST /api/webhooks/clerk` | webhooks.ts | Svix sig |

### Layer 4 — AI Pipeline (src/AiInteg/bridge.ts)
1. Resolve/create Lead from `platformUserId`
2. Resolve/create Conversation
3. Persist inbound Message
4. Emit Socket.IO `new_message` to tenant room
5. Check quota, intent rules, AI config
6. **[AI]** Generate AI response (OpenRouter)
7. Persist outbound Message
8. **[AI]** Dispatch via ResponseRouter → Evolution API
9. Retry once on dispatch failure

### Layer 5 — Error Recovery System (Phase 28)
- **32 error codes** across 7 domains: AUTH, WA, API, DB, Q, WS, SYS
- Every error response is `EnrichedError {code, message, detail, meta, timestamp, recovery}`
- `recovery.action` — what user should do
- `recovery.cta.trigger` — frontend dispatch key (e.g. `open_qr_modal`, `open_settings_ai`)
- `ErrorRecoveryHandler` (frontend) dispatches per-trigger UI actions

### Layer 6 — 100x Observability (Phase 28)
- **6 log streams**: `[FRONTEND]` `[BACKEND]` `[DATABASE]` `[DOCKER]` `[API]` `[AI]`
- **Request logger**: logs START + FINISH with auth method, body size, duration
- **Prisma logger**: all DB ops (dev) / errors + slow >200ms (prod) → ring buffer
- **AI bridge**: every pipeline step — inbound, prompt, response, dispatch
- **Socket.IO**: connect/disconnect/join/mismatch events
- **Docker**: stdout/stderr from postgres, redis, evolution-api containers
- **Frontend**: every API call start/finish, socket events, errors → `POST /api/log` on 9222
- **Ring buffer**: 2000 entries, FIFO, SSE-broadcast to dashboard

## Security Architecture
- **No dev bypasses**: `DEV_AUTH_BYPASS` fully removed (Phase 27)
- **Fail-closed auth**: unauthenticated requests return `AUTH_001` enriched error
- **API key**: HMAC-SHA256 + `API_KEY_PEPPER` server-side pepper
- **Tenant isolation**: dual enforcement (ORM injection + PostgreSQL RLS)
- **Helmet**: CSP, HSTS, X-Frame-Options
- **Rate limiting**: per-IP (express-rate-limit + Redis store)
- **Debug server**: `DEBUG_TOKEN` mandatory, no public access
- **Metrics**: `GET /metrics` auth-protected (Prometheus scrape)

## Real-time Architecture
- Socket.IO singleton on server (`io` exported from src/index.ts)
- Tenant rooms: server calls `socket.join(tenantId)` on connect
- Events: `new_message`, `bot_status_update`, `lead_update`
- Client: `socketManager.ts` singleton — avoids race conditions from multiple instances

## Debug Server Architecture (Port 9222)
- Pure Node.js `http.createServer` (no Express dependency)
- `addLog(level, msg, code?, meta?)` — universal ingestion function, auto-derives category from msg prefix
- `categoryCounts` map for badge counts
- `broadcastToClients()` — SSE to all `/api/stream` subscribers
- Dashboard: self-contained HTML, no external CDN deps, 6-tab NPM-style UI
