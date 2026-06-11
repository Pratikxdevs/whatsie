# External Integrations

**Analysis Date:** 2026-06-09

**Note:** This codebase was recently cleaned to WhatsApp-only. References to Telegram, Discord, Twitter/X, and other platforms in old documentation or dead code are NOT current integrations.

## Active Integrations

### WhatsApp via Evolution API

| Detail | Value |
|--------|-------|
| **Service** | Evolution API v2.3 |
| **Protocol** | HTTP REST (Baileys-based WhatsApp Web socket) |
| **Purpose** | All WhatsApp messaging — send/receive text, media, locations, contacts, reactions, stickers, polls, lists, buttons |
| **Adapter** | `src/adapters/evolutionApi.ts` (complete endpoint coverage) |
| **Thin wrapper** | `src/adapters/whatsapp.adapter.ts` (rate-limited, used by BullMQ worker) |
| **Normalizer** | `src/normalizer/whatsapp.ts` (Evolution webhook payload -> `NormalizedMessage`) |
| **Type** | `src/normalizer/types.ts` — `NormalizedMessage` (platform: `'whatsapp'`) |
| **Webhook route** | `src/routes/gateway.ts` (`/gateway/whatsapp/:tenantId`) |
| **User API routes** | `src/routes/whatsapp.routes.ts` (`/api/whatsapp/*`), `src/routes/whatsapp-chat.ts` |
| **Worker** | `src/workers/index.ts` (BullMQ consumer — 13-step inbound pipeline) |
| **Status** | ACTIVE — sole messaging platform |
| **Docker service** | `crmv2-evolution-api`: `evoapicloud/evolution-api:latest` (port 8081) |

**Configuration env vars:**
- `EVOLUTION_API_URL` — Base URL (default: `http://localhost:8081`)
- `EVOLUTION_API_KEY` — API key (passed as `apikey` header)
- `EVOLUTION_API_SECRET` — Webhook HMAC-SHA256 signature verification

**Inbound flow:**
1. Evolution API sends webhook to `/gateway/whatsapp/:tenantId`
2. Signature verified via HMAC-SHA256 (`EVOLUTION_API_SECRET`) or dev bypass
3. Rate limited: 100 webhooks/sec per tenant (Redis)
4. Idempotency check: Redis `setnx` with 24h TTL per message ID
5. Payload normalized via `normalizeWhatsAppWebhook()` -> `NormalizedMessage`
6. Job enqueued to BullMQ `whatsapp-messages` queue
7. Worker processes: session load -> intent classifier -> workflow engine -> rule engine -> AI orchestrator -> CRM write -> outbound dispatch via `ResponseRouter`

**Outbound flow:**
1. `ResponseRouter.dispatch()` (`src/router/index.ts`) selects WhatsApp adapter
2. `WhatsAppAdapter.sendMessage()` (`src/adapters/whatsapp.adapter.ts`) applies rate limiting
3. `sendWithRateLimit('whatsapp', ...)` throttles to 1 msg/sec
4. Delegates to `sendText()` or `sendMedia()` in `evolutionApi.ts`
5. All HTTP calls flow through universal `createProxiedClient()` (circuit breaker + retry + cache)

**Operations supported (evolutionApi.ts):**
- Instance lifecycle: create, connect (QR code), restart, logout, delete, connection state
- Messaging: sendText, sendMedia, sendAudio, sendPtv, sendStatus, sendSticker, sendLocation, sendContact, sendReaction, sendPoll, sendList, sendButtons
- Chat management: findContacts, findMessages, findChats, markMessagesRead, archiveChat, updateBlockStatus, deleteMessageForEveryone, updateMessage, sendPresenceToChat
- Profile: fetchProfile, updateProfileName/Status/Picture, fetchPrivacySettings
- Groups: createGroup, updateGroupPicture
- Labels: findLabels, handleLabel
- Settings: setSettings, findSettings, setProxy
- Calls: fakeCall
- Number validation: checkWhatsAppNumbers

### Clerk (Authentication)

| Detail | Value |
|--------|-------|
| **Service** | Clerk (clerk.com) |
| **Purpose** | User authentication and session management |
| **Backend SDK** | `@clerk/express` v2.1.19 |
| **Frontend SDK** | `@clerk/clerk-react` v5.61.6 |
| **Webhook route** | `src/routes/webhooks.ts` (`POST /api/webhooks/clerk`) |
| **Webhook lib** | `svix` v1.94.0 (signature verification) |
| **Auth middleware** | `src/middleware/auth.ts` — strict fail-closed enforcement of Clerk JWTs |
| **Status** | ACTIVE |

**Configuration env vars:**
- `CLERK_SECRET_KEY` — Backend secret key
- `CLERK_WEBHOOK_SECRET` — Webhook signing secret
- `VITE_CLERK_PUBLISHABLE_KEY` — Frontend publishable key

**Flow:**
1. Clerk handles user sign-up/sign-in (OAuth, email, etc.)
2. Clerk webhook fires on `user.created`/`user.updated`/`user.deleted`
3. Backend creates/syncs `Tenant` + `User` in PostgreSQL
4. Frontend receives Clerk session -> attaches Bearer token via Axios interceptor
5. Backend middleware resolves Clerk userId -> User record -> tenantId

### AI / LLM Providers

| Detail | Value |
|--------|-------|
| **Purpose** | AI-powered message responses (fallback in the 13-step worker pipeline) |
| **Orchestrator** | `src/ai/orchestrator.ts` |
| **Provider registry** | Unified OpenRouter Factory (`OpenRouterService.ts`) |
| **Endpoints** | `src/AiInteg/endpoints.ts` — `/ai/chat`, `/ai/validate` |
| **Status** | ACTIVE |

**AI providers:**
The system has been consolidated to exclusively use OpenRouter for AI models, eliminating the need for 13 separate provider SDKs.

| Provider | Default Model | Base URL | Env Key |
|----------|---------------|----------|---------|
| OpenRouter | `anthropic/claude-3-5-sonnet:beta` | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |

**Config resolution priority:** Bot config (`Bot.config.apiKey`) > Client Vault (`whatsie_vault` localStorage) > Environment variables

### Redis

| Detail | Value |
|--------|-------|
| **Client** | ioredis v5.10.1 |
| **Connection** | `REDIS_URL` env var (default: `redis://localhost:6379`) |
| **Docker** | Redis 7 Alpine (port 6379) |
| **Status** | ACTIVE |

**Usage:**
- BullMQ message queue backend (`whatsapp-messages` queue)
- Session context window (`context:{tenantId}:{userId}` — LPUSH/LTRIM, 10 messages per user)
- Workflow state cache (`state:{tenantId}:{userId}` — SETEX, 24h TTL)
- Webhook idempotency (SETNX, 24h TTL per message ID)
- Rate limiting counters (INCR/EXPIRE for auth, API, webhooks)
- Evolution API cache (dedicated Redis DB 6 via Evolution API config)

### PostgreSQL

| Detail | Value |
|--------|-------|
| **ORM** | Prisma v5.22.0 |
| **Connection** | `DATABASE_URL` env var |
| **Docker** | PostgreSQL 15 Alpine (port 7777 mapped from container 5432) |
| **Status** | ACTIVE |

**Schema:** Multi-tenant with `Tenant` as root. Key models: `User`, `Bot`, `Lead`, `Conversation`, `Message`, `Workflow`, `WorkflowExecution`, `ApiKey`, `Event`, `BillingUsage`, `AiLog`, `UserCredential`, `RefreshToken`.

**Additional DB:** `evolution_db` schema managed by Evolution API container (same PostgreSQL instance).

### Prometheus

| Detail | Value |
|--------|-------|
| **Docker** | `prom/prometheus:latest` (port 9090) |
| **Scrape config** | `monitoring/prometheus.yml` — scrapes `host.docker.internal:3000/metrics` every 15s |
| **Client lib** | prom-client v15.1.3 |
| **Endpoint** | `GET /metrics` (exposed in `src/index.ts`) |
| **Status** | ACTIVE |

**Custom metrics:** `messagesReceivedTotal`, `messagesSentTotal`, `errorsTotal`, `httpRequestDurationSeconds`.

### Grafana

| Detail | Value |
|--------|-------|
| **Docker** | `grafana/grafana:latest` (port 3001) |
| **Admin password** | `admin` (set in docker-compose) |
| **Status** | ACTIVE |

### Sentry (Optional)

| Detail | Value |
|--------|-------|
| **SDK** | `@sentry/node` v10.53.1 |
| **Config** | `SENTRY_DSN` env var |
| **Traces sample rate** | 10% |
| **Setup** | `src/index.ts` — conditional init + Express error handler |
| **Status** | OPTIONAL — only initialized if `SENTRY_DSN` is provided |

## Webhooks & Real-Time Events

### Incoming: Evolution API Webhook

| Detail | Value |
|--------|-------|
| **Route** | `POST /gateway/whatsapp/:tenantId` |
| **File** | `src/routes/gateway.ts` |
| **Verification** | HMAC-SHA256 (`x-hub-signature` header) using `EVOLUTION_API_SECRET` |
| **Dev bypass** | `DEV_AUTH_BYPASS=true` skips signature verification |
| **Events processed** | `MESSAGES_UPSERT`, `QRCODE_UPDATED`, `CONNECTION_UPDATE`, `MESSAGES_UPDATE`, `MESSAGES_DELETE`, `SEND_MESSAGE` |
| **Rate limit** | 100 webhooks/sec per tenant |

### Incoming: Clerk Webhook

| Detail | Value |
|--------|-------|
| **Route** | `POST /api/webhooks/clerk` |
| **File** | `src/routes/webhooks.ts` |
| **Verification** | svix (`svix-id`, `svix-timestamp`, `svix-signature` headers) |
| **Events processed** | `user.created`, `user.updated`, `user.deleted` |
| **Actions** | Creates Tenant + User, syncs email, soft-deletes (suspends tenant) |

### Outgoing: Socket.IO Events

| Detail | Value |
|--------|-------|
| **Server** | `src/index.ts` (CORS: `*`) |
| **Client** | `frontend/src/services/api.ts` |
| **Events** | |
| `new_message` | Inbound/outbound messages (with conversationId) |
| `bot_status_change` | Bot connection state changes |
| `qrcode.updated` | QR code refresh for bot pairing |
| `connection.update` | Raw Evolution API connection events |
| `dlq.alert` | Dead letter queue alerts (exhausted retries) |

## Billing & Usage Tracking

| Detail | Value |
|--------|-------|
| **Module** | `src/billing/recordUsage.ts` |
| **DB Model** | `BillingUsage` (tenantId, metric, quantity, periodStart, periodEnd) |
| **Metrics** | `messages_sent`, `messages_received` (monthly period bucketing) |
| **AI usage** | `AiLog` model (model, promptTokens, completionTokens, cost) |
| **API** | `/api/billing` (usage, AI logs) |
| **Design** | Billing failures logged but never thrown — billing outage does not block messages |

## Per-User Credential Storage

| Detail | Value |
|--------|-------|
| **DB Model** | `UserCredential` (userId, provider, keyName, keyValue, isDefault) |
| **API** | `/api/credentials` (list, create, delete, setDefault) |
| **Resolution** | Bot config > User credential > Env vars |
| **Status** | ACTIVE |

## Environment Variables (Required)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `GATEWAY_SECURITY_TOKEN` | Yes | Gateway auth token |
| `EVOLUTION_API_URL` | Yes | Evolution API base URL |
| `EVOLUTION_API_KEY` | Yes | Evolution API key |
| `EVOLUTION_API_SECRET` | Yes | Evolution API webhook HMAC secret |
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret |
| `CLERK_WEBHOOK_SECRET` | Yes | Clerk webhook signing secret |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend key (Vite prefix required) |

## Environment Variables (Optional)

| Variable | Purpose |
|----------|---------|
| `SENTRY_DSN` | Sentry error tracking DSN |
| `DEFAULT_AI_PROVIDER` | Default AI provider (defaults to `groq`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `GROQ_API_KEY` | Groq API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `MISTRAL_API_KEY` | Mistral API key |
| `COHERE_API_KEY` | Cohere API key |
| `XAI_API_KEY` | xAI API key |
| `FIREWORKS_API_KEY` | Fireworks API key |
| `TOGETHER_API_KEY` | Together AI API key |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `CEREBRAS_API_KEY` | Cerebras API key |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `AWS_BEDROCK_KEY` | AWS Bedrock key |
| `OLLAMA_API_KEY` | Ollama API key |
| `DEV_AUTH_BYPASS` | Skip auth in dev mode |
| `DEFAULT_TENANT_ID` | Dev bypass tenant ID |
| `DEBUG_PORT` | Debug server port (default: 9222) |

## Integration Patterns

### Adapter Pattern

All platform integrations follow a two-layer adapter pattern:
1. **Low-level adapter** (`src/adapters/evolutionApi.ts`) — wraps third-party API with typed functions, axios client configured with circuit breaker proxy
2. **Domain adapter** (`src/adapters/whatsapp.adapter.ts`) — thin wrapper used by the BullMQ worker, adds rate limiting on top

### Normalizer Pattern

Incoming webhooks are normalized to a single canonical type:
- `NormalizedMessage` (`src/normalizer/types.ts`) — platform-agnostic shape with `tenantId`, `platform`, `userId`, `message`, `type`, `timestamp`, `metadata`
- One normalizer per platform (currently only `src/normalizer/whatsapp.ts`)

### Response Router

`ResponseRouter` (`src/router/index.ts`) centralizes outbound dispatch:
- Context window push -> DB persistence -> platform adapter selection -> rate-limited send -> delivery status
- Currently only the `'whatsapp'` case is active

### Error Code System

Structured error codes in `src/errors/codes.ts`:
- Format: `{DOMAIN}_{NUMBER}` (e.g., `WA_001`, `DB_003`, `AUTH_002`)
- Domains: API, DB, AUTH, WA (WhatsApp/Evolution), Q (Queue/Redis), WS (WebSocket), SYS

### HTTP Proxy Layer

All outbound HTTP calls (Evolution API, AI providers) flow through `createProxiedClient()` (`src/middleware/httpProxy.ts`):
- Per-domain circuit breaker
- Exponential backoff retry
- Response caching for GET requests
- Request/response logging

---

*Integration audit: 2026-06-09*
