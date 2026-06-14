# Architecture

_Last updated: 2026-06-14 (after auth stabilization + bot sync hardening)_

## System Overview

**Whatsie CRM** is a multi-tenant SaaS that connects WhatsApp (via Evolution API) to an AI-powered CRM pipeline. Businesses onboard, connect a WhatsApp bot, and the system auto-processes inbound messages through AI/workflow logic, managing leads — all isolated per tenant.

**Core Value Flow:**
```
WhatsApp User → Evolution API Webhook → BullMQ → AI Pipeline → WhatsApp Reply
                                                       ↓
                                               Lead/Conversation DB
                                                       ↓
                                               Real-time Dashboard (Socket.IO)
```

## Architecture Pattern

- **Backend:** Monolith Express 5 app — layered (routes → middleware → services → adapters → DB)
- **Frontend:** SPA (Vite + React 19), Clerk-authenticated, Socket.IO connected
- **Async:** BullMQ worker runs in-process (imported at startup via `import './workers/index'`)
- **Multi-tenancy:** AsyncLocalStorage tenant context + Prisma query extension (auto-inject tenantId)
- **Real-time:** Socket.IO on shared HTTP server, rooms keyed by `tenantId`

## Middleware Chain (in order)

```
1. helmet()                      — security headers (CSP, HSTS, etc.)
2. requestId                     — X-Request-ID injection
3. express.json()                — body parsing
4. clerkMiddleware()             — populates getAuth(req) globally
5. Prometheus timer              — per-request duration tracking
6. CORS                          — strict: FRONTEND_URL only
7. [route] authenticateToken     — Clerk JWT or X-API-KEY
8. [route] tenantContext.run()   — AsyncLocalStorage scope start
9. requestLoggerMiddleware       — Pino + debug ring buffer
10. Sentry handler               — if SENTRY_DSN configured
```

## Route Map

| Mount                | Router                        | Auth    | Purpose                         |
|----------------------|-------------------------------|---------|---------------------------------|
| /api/webhooks        | routes/webhooks.ts            | svix    | Clerk user lifecycle events     |
| /api/auth            | api/auth.ts                   | none    | Login/register (rate-limited)   |
| /api/providers       | inline                        | none    | List AI providers               |
| /api/whatsapp        | routes/whatsapp.routes.ts     | Clerk   | Legacy bot instance proxy       |
| /api/whatsapp        | routes/whatsapp-chat.ts       | Clerk   | Chat/contacts/messages proxy    |
| /api/workspaces      | routes/workspaces.ts          | Clerk   | Workspace/bot management        |
| /api/conversations   | routes/conversations.ts       | Clerk   | Conversation + message API      |
| /api/leads           | routes/leads.ts               | Clerk   | Lead management CRUD            |
| /api/analytics       | routes/analytics.ts           | Clerk   | Dashboard stats                 |
| /api/billing         | routes/billing.ts             | Clerk   | Usage records + AI logs         |
| /api/ai              | AiInteg/endpoints.ts          | Clerk   | AI health, key verify, generate |
| /api/credentials     | routes/credentials.ts         | Clerk   | Per-user AI API key vault       |
| /gateway             | router/index.ts               | hmac    | Evolution API webhook receiver  |
| /metrics             | inline                        | none    | Prometheus scrape               |
| /health              | inline                        | none    | Liveness check                  |
| /ready               | inline                        | none    | Readiness (DB + Redis ping)     |

## Multi-tenancy (Defense in Depth)

1. **AsyncLocalStorage** (`tenantContext`): All authenticated requests run within `tenantContext.run({ tenantId })`.
2. **Prisma Extension** (`src/db/prisma.ts`): `prisma` client auto-injects `tenantId` in all reads, writes, creates. **Fail-closed**: throws if querying tenant model without active context.
3. **PostgreSQL RLS**: `SELECT set_config('app.current_tenant_id', tenantId, true)` on every tenant query.
4. **`prismaUnfiltered`**: Bypass client for auth/webhook system operations.

## Auth Flow

**New user (webhook path):**
```
Register → Clerk fires user.created webhook → /api/webhooks/clerk (svix-verified)
→ Create Tenant + User in DB → Update Clerk publicMetadata with tenantId
→ API calls include Authorization: Bearer <Clerk JWT>
→ authenticateToken: getAuth(req).userId → User lookup → tenantContext set
```

**JIT sync (fallback):**
```
Sign in → clerkId not in DB → clerkClient.users.getUser() → create Tenant+User
→ Request continues with new tenant context
```

## Bot Lifecycle

```
Create   → POST /api/workspaces → createInstance() → Bot(status: pending_qr)
QR       → GET /instance/connect/:name → base64 QR → frontend QRCodeModal
Scan     → User scans → Evolution fires CONNECTION_UPDATE webhook
Connected → /gateway handler → Bot.status = 'connected'
Startup  → On server boot: getConnectionState() for all non-terminal bots
Logout   → logoutInstance() → Bot.status = 'disconnected'
Delete   → deleteInstance() → Bot row deleted
```

## Message Pipeline

```
1. WA user sends message → Evolution fires webhook → /gateway/whatsapp/:tenantId
2. HMAC-SHA256 validation (EVOLUTION_API_SECRET)
3. Normalizer → NormalizedMessage
4. whatsappQueue.add(job)

BullMQ Worker (concurrency: 5):
5. SessionManager.getWorkflowState()  — Redis session load
6. processInboundMessageDbUpdates()   — upsert Lead + Conversation + Message
7. Socket.IO emit new_message (in) to tenant room
8. SessionManager.pushMessage()       — append to context window
9. Check botPaused (human takeover flag)
10. WorkflowEngine.processStep()      — mid-flow step
11. IntentClassifier.classify()       — rule-based intent
12. WorkflowEngine.checkTrigger()     — intent → workflow trigger
13. RuleEngine.evaluate()             — keyword/rule match → immediate reply
14. generateAiResponse()              — OpenRouter LLM fallback (JSON output)
15. WhatsAppAdapter.sendMessage()     — rate-limited dispatch
16. Socket.IO emit new_message (out)  — frontend sees response instantly
17. recordBillingUsage()              — usage tracking
```

## Frontend Architecture

### Routing
```
ClerkProvider → Router → AuthProvider
  ├── /login → <SignIn> (Clerk hosted)
  ├── /register → <SignUp> (Clerk hosted)
  └── <ProtectedRoute>
      └── <AppLayout>
          ├── /dashboard, /bots, /leads, /conversations, /analytics, /billing, /settings
```

### Key Patterns
- **State:** No Redux/Zustand — local component state + Clerk hooks
- **API:** `frontend/src/services/api.ts` — Axios with Clerk Bearer token interceptor
- **401/403 handler:** Calls `window.__clerkLogout` → toast → redirect to `/login`
- **Real-time:** `socketManager` singleton — one WS connection, listener replay, race-proof emit
- **Mock mode:** `VITE_USE_MOCK=true` disables Vite proxy for frontend-only dev

## Data Layer (Prisma Models)

| Model             | Tenant-scoped | Purpose                                |
|-------------------|---------------|----------------------------------------|
| Tenant            | Root          | Top-level org (plan, status)           |
| User              | Yes           | CRM user; clerkId linked               |
| Bot               | Yes           | WhatsApp instance; sessionName unique  |
| Lead              | Yes           | Contact; created from inbound messages |
| Conversation      | Yes           | Thread between Lead ↔ Bot             |
| Message           | Yes           | Individual messages (in/out)           |
| Workflow          | Yes           | Multi-step intent-triggered flows      |
| WorkflowExecution | Yes           | Active execution state per lead        |
| ApiKey            | Yes           | HMAC-SHA256 hashed API keys            |
| Event             | Yes           | Audit events log                       |
| BillingUsage      | Yes           | Usage metrics by period                |
| AiLog             | Yes           | LLM token usage + cost                 |
| AuditLog          | Yes           | Security/admin action trail            |
| RefreshToken      | No            | Legacy JWT refresh tokens              |
| UserCredential    | User-scoped   | Per-user AI provider API key vault     |

## Real-time Communication

- **Protocol:** Socket.IO over shared `http.createServer(app)`
- **Auth:** Clerk JWT via `verifyToken()` in socket handshake middleware; fallback to API key
- **Rooms:** `tenantId` — auto-joined on connect, re-joined on reconnect
- **Events emitted:** `new_message`, `connection_status`, `error`
