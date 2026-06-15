# INTEGRATIONS.md — External Integrations

**Project:** CrmV2 — Multi-Platform AI CRM Bot SaaS  
**Date:** 2026-06-15  
**Root:** `/home/clutch/Desktop/Whatsie`

---

## Evolution API (WhatsApp Gateway)

| Aspect | Details |
|--------|---------|
| **Purpose** | WhatsApp Business API via Evolution API v2.3 (Baileys) |
| **Base URL** | `EVOLUTION_API_URL` (default: `http://localhost:8081`) |
| **Auth** | API Key header: `apikey: ${EVOLUTION_API_KEY}` |
| **Webhook Secret** | `EVOLUTION_API_SECRET` (HMAC verification) |
| **Adapter** | `src/adapters/evolutionApi.ts` — 642 lines, full endpoint coverage |

### Key Operations (mapped to DB)

| Operation | Evolution Endpoint | DB Sync |
|-----------|-------------------|---------|
| Create Instance | `POST /instance/create` | Upserts `Bot` record with `sessionName` |
| Get Connection State | `GET /instance/connectionState/{name}` | Updates `Bot.status` (`connected`/`disconnected`/`starting`) |
| Delete Instance | `DELETE /instance/delete/{name}` | Deletes `Bot` row |
| Send Text/Media | `POST /message/sendText/{instance}` | — |
| Webhook Events | `MESSAGES_UPSERT`, `CONNECTION_UPDATE`, etc. | Handled in `src/routes/webhooks.ts` |

### Webhook Events Subscribed

- `QRCODE_UPDATED` — QR code for pairing
- `MESSAGES_UPSERT` — Inbound messages
- `MESSAGES_UPDATE` — Message status updates
- `MESSAGES_DELETE` — Deleted messages
- `SEND_MESSAGE` — Outbound confirmations
- `CONNECTION_UPDATE` — Connection state changes

---

## Clerk (Authentication & User Management)

| Aspect | Details |
|--------|---------|
| **Purpose** | Authentication provider (JWT, sessions, user profiles) |
| **Frontend Key** | `CLERK_PUBLISHABLE_KEY` |
| **Backend Key** | `CLERK_SECRET_KEY` |
| **Integration** | `@clerk/express` middleware + `verifyToken` for sockets |
| **Webhook** | `/api/webhooks/clerk` — Svix signature verification |
| **JIT Sync** | Auto-creates `Tenant` + `User` on first login if missing |

### User Flow

1. Clerk middleware populates `req.auth.userId`
2. `authenticateToken` middleware looks up `User` by `clerkId`
3. If not found → JIT sync via Clerk REST API (`clerkClient.users.getUser`)
4. Creates `Tenant` (plan: free) + `User` in same transaction
5. Sets `req.user = { id, tenantId }` and runs `tenantContext`

---

## OpenRouter (LLM Gateway)

| Aspect | Details |
|--------|---------|
| **Purpose** | Unified access to multiple LLMs (GPT-4, Claude, etc.) |
| **SDK** | OpenAI SDK (`openai` 6.42.0) with custom base URL |
| **API Key** | `OPENROUTER_API_KEY` |
| **Integration** | `src/ai/orchestrator.ts` → `generateAiResponse()` |
| **Models** | Configurable via OpenRouter dashboard |
| **Usage Tracking** | `AiLog` model records prompt/completion tokens, cost |

---

## PostgreSQL (Primary Database)

| Aspect | Details |
|--------|---------|
| **Provider** | `postgresql` (Prisma datasource) |
| **Connection** | `DATABASE_URL` env var |
| **Schema** | `prisma/schema.prisma` — 14 models |
| **Migrations** | Auto-deploy on startup: `npx prisma migrate deploy` |
| **Connection Pool** | Prisma default (configured via `DATABASE_URL` params) |

### Models (Key Relationships)

```
Tenant 1──* User
Tenant 1──* Bot
Tenant 1──* Lead
Tenant 1──* Conversation
Tenant 1──* Message
Tenant 1──* Workflow
Tenant 1──* WorkflowExecution
Tenant 1──* ApiKey
Tenant 1──* Event
Tenant 1──* BillingUsage
Tenant 1──* AiLog
Tenant 1──* AuditLog

User 1──* Bot (owner)
User 1──* RefreshToken
User 1──* UserCredential

Lead *──1 Bot (optional)
Lead 1──* Conversation
Lead 1──* WorkflowExecution

Conversation 1──* Message

Workflow 1──* WorkflowExecution
```

---

## Redis (Queue, Cache, Pub/Sub)

| Aspect | Details |
|--------|---------|
| **Connection** | `REDIS_URL` env var |
| **Client** | `ioredis` 5.10.1 |
| **BullMQ** | Queue: `whatsapp-messages` (concurrency: 5, exponential backoff) |
| **Socket.IO Adapter** | `@socket.io/redis-adapter` for multi-instance scaling |
| **Redis Emitter** | `@socket.io/redis-emitter` for server→client events from workers |
| **Rate Limiting** | `rate-limit-redis` store for `express-rate-limit` |
| **Deduplication** | `SET NX EX 1800` keys for webhook dedup (H-007) |

---

## Prometheus + Grafana (Observability)

| Aspect | Details |
|--------|---------|
| **Prometheus** | `prom/prometheus` on port 9090, scrapes `/metrics` |
| **Grafana** | `grafana/grafana` on port 3001 |
| **Metrics Exposed** | `prom-client` — HTTP duration, messages sent/received, errors |
| **Auth** | `/metrics` gated by `METRICS_TOKEN` bearer (C-002) |

---

## Sentry (Error Tracking)

| Aspect | Details |
|--------|---------|
| **DSN** | `SENTRY_DSN` (optional) |
| **Sample Rate** | 10% traces |
| **Integration** | `@sentry/node` — `Sentry.init()` in `src/index.ts` + worker |
| **Express Handler** | `Sentry.setupExpressErrorHandler(app)` after routes |

---

## Docker Log Streaming (Debug)

| Aspect | Details |
|--------|---------|
| **Purpose** | Stream container logs to debug UI |
| **Implementation** | `src/debug/dockerLogs.ts` — `docker log` tail via child_process |
| **Port** | Debug server on 9222 |
| **Auth** | `DEBUG_TOKEN` bearer required |

---

## Webhook Endpoints (Inbound)

| Route | Handler | Purpose |
|-------|---------|---------|
| `POST /api/webhooks` | `webhookRouter` | Clerk webhooks (svix verified) |
| `POST /api/webhooks/evolution` | Evolution API webhooks | WhatsApp events (inbound messages, status) |

---

## API Key Authentication (External Access)

| Aspect | Details |
|--------|---------|
| **Header** | `X-API-KEY: <plaintext_key>` |
| **Hashing** | HMAC-SHA256 with `API_KEY_PEPPER` (C-001) |
| **Storage** | `ApiKey.keyHash` (unique), linked to `Tenant` |
| **Validation** | `authenticateToken` middleware, Strategy 1 |
| **WebSocket** | Also accepted in `socket.handshake.auth.apiKey` |

---

## Rate Limiting Tiers

| Tier | Config | Scope |
|------|--------|-------|
| Auth | `authRateLimiter` | `/api/webhooks`, login endpoints |
| API | `apiRateLimiter` | All `/api/*` routes |
| Metrics | Bearer token | `/metrics` endpoint |
| Redis Store | `rate-limit-redis` | Distributed across instances |

---

## Frontend Integration (CORS)

| Aspect | Details |
|--------|---------|
| **Origin** | `FRONTEND_URL` (required, strict) |
| **Methods** | GET, POST, PUT, DELETE, OPTIONS, PATCH |
| **Headers** | Content-Type, Authorization, X-API-KEY |
| **Credentials** | `Access-Control-Allow-Credentials: true` |
| **WebSocket** | Same origin check in `io` CORS config |

---

## Billing / Usage Tracking

| Metric | Model | Incremented By |
|--------|-------|----------------|
| `messages_received` | `BillingUsage` | Worker on inbound |
| `messages_sent` | `BillingUsage` | Worker on outbound dispatch |
| `ai_tokens` | `AiLog` | Orchestrator on LLM call |

---

## Summary of External Dependencies

| Service | Protocol | Criticality | Fallback |
|---------|----------|-------------|----------|
| Evolution API | HTTP + Webhooks | Critical (core product) | None — startup fails if unreachable |
| Clerk | HTTP (REST + Webhooks) | Critical (auth) | JIT sync on first login |
| PostgreSQL | TCP (Prisma) | Critical | Startup fails (`/ready` returns 503) |
| Redis | TCP (ioredis) | Critical (queue, sockets, rate limit) | Startup fails |
| OpenRouter | HTTP (OpenAI SDK) | High (AI fallback) | Rule Engine / Workflows still work |
| Sentry | HTTP | Low | Optional (disabled if no DSN) |
| Prometheus/Grafana | HTTP | Low | Optional monitoring |