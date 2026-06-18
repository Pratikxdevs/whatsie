# ARCHITECTURE.md — System Architecture

**Project:** CrmV2 — Multi-Platform AI CRM Bot SaaS  
**Date:** 2026-06-15  
**Root:** `/home/clutch/Desktop/Whatsie`

---

## Architectural Style

**Monolithic Express Application with Background Worker**

- Single HTTP server serving REST API + Socket.IO
- Separate BullMQ worker process for async message processing
- Multi-tenant by design (all models scoped to `Tenant`)
- Event-driven real-time updates via Socket.IO + Redis pub/sub

---

## System Diagram

```
┌──────────────┐     ┌─────────────────────────────────────┐
│   Frontend   │────▶│         Express Server               │
│  (React/App) │     │  · REST API (routes/*.ts)           │
│              │◀────│  · Socket.IO (real-time)             │
└──────────────┘     │  · Clerk auth middleware             │
                     │  · Rate limiting                      │
                     │  · Helmet + CSP                       │
                     └────────────┬────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
           ┌──────────────┐          ┌──────────────────┐
           │  PostgreSQL  │          │      Redis       │
           │  (Prisma)    │◀────────▶│  · BullMQ Queue  │
           │  14 models   │          │  · Socket.IO Pub  │
           └──────────────┘          │  · Rate Limit     │
                                     │  · Cache/DeDup    │
                                     └────────┬─────────┘
                                              │
                                              ▼
                                  ┌──────────────────────┐
                                  │   BullMQ Worker       │
                                  │  (whatsapp-messages)  │
                                  │  · 13-step pipeline   │
                                  │  · Concurrency: 5     │
                                  └──────────────────────┘
                                              │
                                              ▼
                                  ┌──────────────────────┐
                                  │   Evolution API      │
                                  │  (WhatsApp Gateway)  │
                                  └──────────────────────┘
```

---

## Message Processing Pipeline (13-Step Worker)

The core of the system lives in `src/workers/index.ts`. Each incoming WhatsApp message flows through:

| Step | Component | File | Action |
|------|-----------|------|--------|
| 1 | Session Manager | `src/services/sessionManager.ts` | Load conversation state |
| 2 | Intent Classifier | `src/services/intentClassifier.ts` | Pattern-match intent from text |
| 3 | Workflow Engine (mid-flow) | `src/services/workflowEngine.ts` | Resume active workflow |
| 4 | Workflow Trigger | `src/services/workflowEngine.ts` | Check if intent triggers new workflow |
| 5 | Rule Engine | `src/services/ruleEngine.ts` | Evaluate declarative rules |
| 6 | AI Orchestrator | `src/ai/orchestrator.ts` | LLM fallback via OpenRouter |
| 7 | CRM Writer | `src/crm/crmService.ts` | Upsert lead, conversation, event |
| 8 | Session Update | `src/services/sessionManager.ts` | Push message to context window |
| 9 | Queue Response | `src/router/index.ts` | Route → rate limit → send via adapter |
| 10 | Delivery Status | — | Mark sent in DB + emit event |

### Pipeline Priority

```
Session Load → Intent Classify → Mid-flow Workflow? → Trigger Workflow?
  → Rules? → AI Fallback → Write DB → Session Push → Send → Confirm
```

- Workflow mid-flow resumes before any other processing
- Workflow triggers have priority over rules
- Rules have priority over AI fallback
- Automation is skipped if `Bot.lead.botPaused` is true

---

## Multi-Tenant Architecture

### Tenant Isolation

All data models have `tenantId` foreign key. Access is filtered via `tenantContext`:

- **Middleware**: `src/middleware/tenant.ts` — Uses `AsyncLocalStorage` for per-request tenant
- **Worker**: `tenantContext.run()` wraps each job execution
- **Auth**: `authenticateToken` extracts tenant from User/ApiKey record
- **Prisma**: Two clients — `prisma` (filtered), `prismaUnfiltered` (for auth/tenant resolution)

### Tenant Flow

1. Clerk auth resolves `tenantId` from `User` record
2. `tenantContext.run({ tenantId })` sets context for the request/worker
3. All downstream Prisma queries scope to the implicit tenant context

---

## Request Lifecycle

```
HTTP Request
  │
  ├── Helmet (security headers)
  ├── requestId (X-Request-Id)
  ├── Webhook Router (raw body — Clerk svix auth)
  ├── JSON body parser (50mb limit)
  ├── Clerk Middleware (sets req.auth.userId)
  ├── Prometheus Duration Timer
  ├── CORS Check (FRONTEND_URL origin)
  ├── API Rate Limiter (/api/* routes)
  ├── authenticateToken (API Key or Clerk JWT)
  │     └── tenantContext.run()
  ├── Route Handler
  │     └── Zod validation → Business logic → Prisma
  └── requestLoggerMiddleware (final logging)
```

---

## Real-Time Events (Socket.IO)

### Connection Auth

- Token via `socket.handshake.auth.token` or `socket.handshake.query.token`
- Supports both Clerk JWT verify and API key (HMAC-SHA256) auth
- On success: `socket.tenantId` and `socket.userId` attached

### Room Architecture

- Each socket auto-joins `tenantId` room
- `join_tenant` event allows re-joining (validates matching tenant)
- Workers emit via `@socket.io/redis-emitter`

### Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `new_message` | Inbound/outbound message processed | `{ conversationId, message }` |
| `connect`/`disconnect` | Socket lifecycle | Socket ID, tenant, user |

---

## Service Layer Architecture

```
src/
├── adapters/          ── External API adapters (Evolution API, WhatsApp)
│   ├── evolutionApi.ts    ── 642 lines, full Evolution API v2.3 client
│   └── whatsapp.adapter.ts ── Thin adapter layer
│
├── ai/                ── AI/LLM integration
│   ├── orchestrator.ts    ── generateAiResponse(), fallback chain
│   └── structuralizer.ts  ── Structured output from LLM
│
├── services/          ── Business logic services
│   ├── intentClassifier.ts ── Rule-based intent matching
│   ├── ruleEngine.ts       ── Declarative rule evaluation
│   ├── workflowEngine.ts   ── Workflow step management
│   └── sessionManager.ts   ── Conversation state per user
│
├── crm/               ── CRM operations
│   └── crmService.ts       ── Lead upsert, event logging
│
├── billing/           ── Usage tracking
│   └── recordUsage.ts      ── BillingUsage + AiLog recording
│
├── workers/           ── Background job processing
│   ├── index.ts           ── Main BullMQ worker (13-step pipeline)
│   ├── dlq.ts             ── Dead letter queue monitor
│   └── handlers/          ── (empty — handler registration not yet populated)
│
├── middleware/        ── Express middleware
│   ├── auth.ts            ── authenticateToken (Clerk + API Key)
│   ├── tenant.ts          ── AsyncLocalStorage tenant context
│   ├── rateLimit.ts       ── Auth + API rate limiters
│   ├── validate.ts        ── Zod-based request validation
│   ├── quota.ts           ── Plan quota enforcement
│   ├── requestId.ts       ── X-Request-Id generation
│   ├── requestLogger.ts   ── Universal request/response logging
│   └── httpProxy.ts       ── Proxy wrapper for Evolution API calls
│
├── routes/            ── API route handlers
│   ├── workspaces.ts      ── Bot/workspace CRUD (17.9KB)
│   ├── whatsapp-chat.ts   ── WhatsApp messages (10.6KB)
│   ├── conversations.ts   ── Conversation management (12.4KB)
│   ├── leads.ts           ── Lead management (5.4KB)
│   ├── analytics.ts       ── Analytics queries (4.4KB)
│   ├── billing.ts         ── Billing data (3.3KB)
│   ├── credentials.ts     ── User credential storage (5.3KB)
│   ├── webhooks.ts        ── Inbound webhooks (4.9KB)
│   └── gateway.ts         ── Internal gateway router (7.8KB)
│
├── jobs/              ── Scheduled jobs
│   └── stalledConversations.ts ── Periodic health check for stalled convos
│
├── router/            ── Response routing
│   └── index.ts           ── ResponseRouter.dispatch()
│
├── normalizer/        ── Message normalization
│   └── (types.ts, etc.)    ── NormalizedMessage type
│
├── queue/             ── Queue setup
│   └── setup.ts           ── Redis connection + BullMQ Queue creation
│
├── debug/             ── Debugging infrastructure
│   ├── server.ts          ── Debug HTTP server (port 9222)
│   ├── dockerLogs.ts      ── Docker log streaming
│   └── ...
│
├── metrics/           ── Prometheus metrics
│
├── errors/            ── Error recovery/handling
│
├── schemas/           ── Zod schemas for validation
│
└── utils/             ── Shared utilities
```

---

## Key Design Patterns

### 1. Adapter Pattern
- `src/adapters/evolutionApi.ts` wraps Evolution API HTTP calls
- Each external platform gets its own adapter (only WhatsApp via Evolution currently)
- `whatsapp.adapter.ts` provides a uniform interface for the rest of the system

### 2. Middleware Pipeline Pattern
- Express middleware chain for authentication, validation, rate limiting
- `tenantContext` via `AsyncLocalStorage` for implicit tenant scoping
- Request ID propagation via `requestId` middleware

### 3. Worker / Job Queue Pattern
- BullMQ for async message processing
- Configurable concurrency (5), retries with exponential backoff (5 attempts)
- Dead letter queue monitor (`src/workers/dlq.ts`)

### 4. Service Layer Chain (Chain of Responsibility)
- Intent Classifier → Rule Engine → Workflow Engine → AI Orchestrator
- Each step can short-circuit and produce a response directly

### 5. Multi-Tenant via AsyncLocalStorage
- `src/middleware/tenant.ts`: `const tenantContext = new AsyncLocalStorage()`
- Wraps every request and BullMQ job
- Services access tenant via `tenantContext.getStore()?.tenantId`

---

## Entry Points

| Entry Point | Purpose | Command |
|-------------|---------|---------|
| `src/index.ts` | Express server + Socket.IO | `npm run dev`, `npm run build && npm start` |
| `src/workers/index.ts` | BullMQ worker process | Separate process (NODE_ENV=production) |
| `src/debug/server.ts` | Debug dashboard | Auto-started on port 9222 |
| `prisma/seed.ts` | Database seed | `npx prisma db seed` |

---

## Graceful Shutdown

```
SIGTERM → stopStalledConversationJob()
       → server.close()
       → prisma.$disconnect()
       → redisConnection.quit()
       → process.exit(0) [or 1 if hangs >10s]
```

---

## Key Architectural Decisions (ADRs Implied)

1. **Monolith not microservices** — Single Express app + worker process. Simple deployment, shared types.
2. **Evolution API for WhatsApp** — Third-party Baileys wrapper instead of native WhatsApp Business API.
3. **BullMQ over in-process queue** — Persists across restarts, scales horizontally, supports delays/retries.
4. **Clerk over custom auth** — Reduces auth complexity, JIT sync handles race conditions.
5. **Redis Socket.IO adapter** — Enables multi-instance WebSocket scaling without sticky sessions.
6. **Auto-migrations on startup** — Fail-fast if DB schema is out of sync. `npx prisma migrate deploy` in dev/prod.
7. **Two Prisma clients** — `prismaUnfiltered` for auth lookups (before tenant context exists), `prisma` for filtered queries.
