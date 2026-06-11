# CrmV2 — System Architecture

*Last updated: 2026-06-09 — reflects WhatsApp-only cleanup state*

## High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite, port 5173)                  │
│  Dashboard │ Conversations │ Leads │ Bots │ Analytics │ Billing │ Team      │
│  Settings(6 tabs) │ Login │ Register                                        │
│                      Socket.IO Client ←──────────────┐                      │
└──────────────────────────────┬───────────────────────┬─────────────────────┘
                               │ HTTP REST             │ WebSocket
                               ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS API SERVER (port 3000)                           │
│                                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ /gateway  │  │ /api/    │  │ /api/    │  │ /api/    │  │ /admin   │       │
│  │ /whatsapp │  │ auth     │  │ whatsapp │  │ convos   │  │ (DLQ)    │       │
│  │ /:tenantId│  │          │  │          │  │          │  │          │       │
│  └─────┬────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│        │                                                                      │
│  ┌─────┴────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ /api/    │  │ /api/    │  │ /api/    │  │ /api/    │  │ /api/    │       │
│  │ workspaces│ │ analytics│  │ billing  │  │ ai       │  │ leads    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ /api/    │  │ /api/    │  │ /api/    │  │ /api/    │  │ /api/    │       │
│  │ credentials││ workflows│  │ api-keys │  │ team     │  │ events   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐     │
│  │  MIDDLEWARE PIPELINE (per request)                                    │     │
│  │  Helmet → CORS → express.json → RequestID → RateLimit → Auth → Route │     │
│  └──────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐     │
│  │  BULLMQ WORKER (same process)                                         │     │
│  │  whatsapp-messages queue → 13-step pipeline → outbound send           │     │
│  └──────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
   │  PostgreSQL  │    │    Redis      │    │ Evolution API │
   │  (Prisma)    │    │  (BullMQ +   │    │ (WhatsApp     │
   │  + RLS       │    │   Sessions +  │    │  Gateway)     │
   │              │    │   Idempotency)│    │               │
   └─────────────┘    └──────────────┘    └──────────────┘
```

## Message Processing Pipeline (13-Step Worker)

The BullMQ worker (`src/workers/index.ts`) processes each inbound WhatsApp message through a deterministic pipeline:

```
Inbound Webhook
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Session Load        → SessionManager.getWorkflowState()      │
│ 2. DB Persist          → processInboundMessageDbUpdates()       │
│    (lead upsert, conversation upsert, message create)           │
│ 3. Event Log           → logEvent('message_received')           │
│ 4. Socket.IO Emit      → io.to(tenantId).emit('new_message')    │
│ 5. Context Window Push → SessionManager.pushMessage(user)       │
│ 6. Workflow Mid-Flow   → WorkflowEngine.processStep()           │
│ 7. Intent Classify     → IntentClassifier.classify()            │
│ 8. Workflow Trigger    → WorkflowEngine.checkTrigger()          │
│ 9. Rule Engine         → RuleEngine.evaluate()                  │
│10. AI Fallback         → generateAiResponse() [multi-provider]  │
│11. Outbound Dispatch   → ResponseRouter.dispatch()              │
│12. Context Push (asst) → SessionManager.pushMessage(assistant)  │
│13. Delivery Update     → message metadata.deliveredAt           │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Hierarchy (priority order)

1. **Active workflow step** — if user is mid-flow, process the step first
2. **Intent classification** — regex/keyword matching (HUMAN_ESCALATION, PRICING, OPT_OUT, INTERESTED)
3. **Workflow trigger** — high-confidence intent starts a new workflow
4. **Rule engine** — hard rules bypass AI (escalation → transfer, pricing → canned response, opt-out → mark lead)
5. **AI Orchestrator** — fallback to LLM (Unified OpenRouter Factory for Claude, Llama, etc., replacing legacy direct provider SDKs).

## Multi-Tenant Isolation

- **ORM-level**: Global Prisma Extension (`src/db/prisma.ts`) intercepts all queries against `TENANT_MODELS` and automatically injects `{ where: { tenantId } }` or `{ data: { tenantId } }` via `AsyncLocalStorage` context.
- **Fail-Closed Boundary**: Queries attempting to execute without a `tenantId` in context will throw a `CRITICAL_SECURITY_ALERT` exception.
- **Tenant context**: Propagated via `AsyncLocalStorage` in `src/middleware/tenant.ts`.
- **Socket.IO**: Connections auto-join `tenantId` room; `join_tenant` event validates tenant ownership.

## Outbox Pattern
Messages created during the processing pipeline default to a `pending` status. Only after the `ResponseRouter` successfully receives an HTTP 200 OK from the Evolution API will the system update the record to `sent`. This prevents false-positive billing or analytics metrics on network failures.

## Authentication Architecture

Three strategies in priority order (`src/middleware/auth.ts`):

| Strategy | Trigger | Resolution |
|----------|---------|------------|
| Dev bypass | `DEV_AUTH_BYPASS=true` | Uses mocked `dev-user-001` obj directly to avoid Prisma crash on missing `User.name` schema sync |
| API Key | `X-API-KEY` header | SHA-256 hash lookup in `ApiKey` table |
| Clerk JWT | `req.auth.userId` (upstream middleware) | Lookup user by `clerkId` |
| Bearer JWT | `Authorization: Bearer <token>` | `jwt.verify()` with `JWT_SECRET` |

Socket.IO uses the same strategies via handshake auth/query.

## Real-Time Architecture

- **Socket.IO** server attached to HTTP server (`src/index.ts:123-213`)
- **Connection auth**: Same dual-mode (JWT + API key) as HTTP
- **Auto-join**: Clients join `tenantId` room on connect
- **Events emitted**:
  - `new_message` — inbound + outbound messages (worker emits after DB persist)
  - `qrcode.updated` — QR code refresh (gateway emits immediately)
  - `connection.update` — connection state change (gateway emits immediately)
  - `bot_status_change` — bot status update (gateway emits on connection.update)

## AI Provider Architecture

- **Orchestrator** (`src/ai/orchestrator.ts` & `OpenRouterService.ts`): Unified API gateway connecting directly to OpenRouter, drastically reducing SDK dependencies.
- **Provider selection**: Resolved from bot config → user credentials → OpenRouter API key.

## Credential Storage

- **Encryption**: AES-256-GCM via `src/utils/crypto.ts`
- **Key derivation**: `scryptSync(CREDENTIAL_ENCRYPTION_KEY || JWT_SECRET || 'fallback-dev-key', salt, 32)`
- **Storage**: `UserCredential` model — `keyValue` field stores encrypted blob
- **⚠️ Risk**: Hardcoded fallback key if both env vars are missing

## Outbound Message Flow

```
Worker calls ResponseRouter.dispatch()
    │
    ├─ 1. Push assistant reply to Redis context window
    ├─ 2. Persist outbound message to PostgreSQL (direction: 'out')
    ├─ 3. Select platform adapter (currently only WhatsApp)
    │      └─ WhatsAppAdapter.sendMessage() → Evolution API
    ├─ 4. Increment Prometheus counter (messagesSentTotal)
    └─ 5. Update message metadata with deliveredAt timestamp
```

## Webhook Reception (Gateway)

`POST /gateway/whatsapp/:tenantId` (`src/routes/gateway.ts`):

1. **Rate limit**: 100 webhooks/second per tenant (Redis counter)
2. **Signature verify**: HMAC-SHA256 with `EVOLUTION_API_SECRET` (skipped in dev bypass)
3. **Tenant auth**: Verify tenant exists and is active
4. **Immediate 200 OK**: Response returned within 3 seconds; processing is async
5. **Event routing**:
   - `qrcode.updated` / `connection.update` → Socket.IO broadcast + bot status DB update
   - `messages.upsert` → Normalize → Redis idempotency check → BullMQ enqueue
   - Other events → silently dropped

## Data Layer

**PostgreSQL** via Prisma ORM (`prisma/schema.prisma`):

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| Tenant | Workspace isolation | Has many Users, Bots, Leads, Conversations |
| User | Authenticated users | Belongs to Tenant; has Credentials, Bots |
| Bot | WhatsApp session | Belongs to Tenant + User; has Leads |
| Lead | Contact/prospect | Belongs to Tenant + Bot; has Conversations |
| Conversation | Chat thread | Belongs to Tenant + Lead; has Messages |
| Message | Individual messages | Belongs to Tenant + Conversation |
| Workflow | Multi-step flows | Belongs to Tenant; has Executions |
| WorkflowExecution | Running workflow state | Belongs to Tenant + Workflow + Lead |
| ApiKey | API authentication | Belongs to Tenant |
| Event | Audit log | Belongs to Tenant |
| BillingUsage | Usage tracking | Belongs to Tenant |
| AiLog | AI usage/cost tracking | Belongs to Tenant |
| RefreshToken | JWT refresh | Belongs to User (cascade delete) |
| UserCredential | Encrypted API keys | Belongs to User |

**Redis** (via BullMQ + direct access):
- BullMQ queue: `whatsapp-messages`
- Session context window: `context:{tenantId}:{userId}` (list, max 10 msgs)
- Workflow state: `state:{tenantId}:{userId}` (JSON, 24h TTL)
- Idempotency: `idempotency:whatsapp:{messageId}` (24h TTL)
- Rate limiting: `ratelimit:webhook:{tenantId}` (1s window)

## Security Layers

| Layer | Implementation | Location |
|-------|---------------|----------|
| HTTP headers | Helmet (CSP, HSTS, etc.) | `src/index.ts:67-82` |
| CORS | Dynamic origin check | `src/index.ts:96-113` |
| Rate limiting | Redis-backed (100 webhook/s, API rate limits) | `src/middleware/rateLimit.ts` |
| Auth | JWT + API Key + Clerk | `src/middleware/auth.ts` |
| Tenant isolation | AsyncLocalStorage + RLS | `src/middleware/tenant.ts`, `src/db/prisma.ts` |
| Webhook integrity | HMAC-SHA256 signature | `src/routes/gateway.ts:46-60` |
| Credential encryption | AES-256-GCM | `src/utils/crypto.ts` |
| Input validation | Zod schemas | `src/middleware/validate.ts` |

## Infrastructure Dependencies

| Service | Purpose | Failure Mode |
|---------|---------|-------------|
| PostgreSQL | Primary data store | App refuses to start (migration check) |
| Redis | Queue + sessions + idempotency | App refuses to start (health check) |
| Evolution API | WhatsApp gateway | Messages silently fail; circuit breaker in httpProxy |
| Clerk | User authentication | Login/registration unavailable |
| Sentry | Error monitoring | Optional; disabled if no DSN |

## Process Architecture

Single-process deployment:
- Express HTTP server (port 3000)
- Socket.IO server (same port)
- BullMQ worker (concurrency: 5, same process)
- Debug dashboard server (port 9222)
- Prometheus metrics endpoint (`/metrics`)

No clustering, no worker separation. Under WhatsApp message spikes, API response times will degrade.

## Frontend Architecture

**SPA** built with React + Vite + Tailwind CSS + Radix UI:

| Layer | Technology | Location |
|-------|-----------|----------|
| Routing | React Router | `frontend/src/App.tsx` |
| Auth | Clerk React SDK | `frontend/src/contexts/AuthContext.tsx` |
| HTTP client | Axios (via `services/api.ts`) | `frontend/src/services/api.ts` |
| Real-time | Socket.IO client | Page components |
| UI primitives | Radix UI + shadcn/ui | `frontend/src/components/ui/` |
| Forms | React Hook Form + Zod | Form components |
| Styling | Tailwind CSS | `frontend/src/index.css` |

**10 pages** (post-cleanup): Login, Register, Dashboard, Bots, Leads, Conversations, Analytics, Billing, Team, Settings

**6 settings tabs**: General, Profile, Team, API Keys, Billing, Danger Zone

**Deleted pages** (WhatsApp-only cleanup): Campaigns, Contacts, Integrations, Onboarding, Reports, Workflows
