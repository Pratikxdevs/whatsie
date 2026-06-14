# INTEGRATIONS
**Updated:** 2026-06-15
**Project:** CrmV2 — Whatsie WhatsApp AI CRM

## Evolution API (WhatsApp Gateway)
- **URL**: `EVOLUTION_API_URL` env var (default: `http://localhost:8081`)
- **Auth**: `EVOLUTION_API_KEY` header (`apikey: <key>`)
- **Container**: `crmv2-evolution-api` (Docker port 8081 → 8080)
- **Session name pattern**: `bot_<botId-no-dashes>` or `tenant_<tenantId>_bot`
- **Key operations**:
  - `POST /instance/create` — create WhatsApp session
  - `GET /instance/connectionState/{sessionName}` — check connection status
  - `POST /instance/restart/{sessionName}` — restart session
  - `DELETE /instance/delete/{sessionName}` — delete session
  - `POST /message/sendText/{sessionName}` — send outbound message
  - `GET /instance/fetchInstances` — list all active sessions
- **Webhook**: Evolution pushes `POST /api/gateway/webhook/whatsapp` on each inbound event
- **Webhook sig**: `EVOLUTION_API_SECRET` HMAC validation (currently bypassed for dev — see CONCERNS)
- **Normalizer**: `src/normalizer/whatsapp.ts` maps Evolution payload → `NormalizedMessage`
- **Adapter**: `src/adapters/evolutionApi.ts` — axios client with typed methods

## OpenRouter AI
- **URL**: `https://openrouter.ai/api/v1`
- **Auth**: `Authorization: Bearer <OPENROUTER_API_KEY>` 
- **Headers required**: `HTTP-Referer: https://whatsie.ai`, `X-Title: Whatsie CRM`
- **Key operations**:
  - `GET /auth/key` — verify API key, get credit balance and usage
  - `GET /models` — fetch available models with pricing
  - `POST /chat/completions` — AI response generation (via `openai` SDK configured to OpenRouter base URL)
- **Frontend**: `/api/ai/verify` endpoint validates key + fetches models; stored per-tenant in DB
- **Model selection**: Per-tenant, stored as `tenant.aiModel` in Prisma
- **Timeout**: 8s for key verification; configurable for completions

## Clerk (Authentication)
- **SDK**: `@clerk/express` backend, `@clerk/clerk-react` frontend
- **Env vars**: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Flow**: `clerkMiddleware()` → `getAuth(req)` → lookup user in DB → set `req.user`
- **JIT sync**: If user not in DB, `clerkClient.users.getUser()` + create tenant + upsert user
- **Webhooks**: `POST /api/webhooks/clerk` — Svix signature validation → sync user events
- **Frontend**: `<ClerkProvider>` wraps app; `useAuth()` for session token; `clerkBridge.ts` for non-React contexts
- **Logout**: `clerkBridge.signOut()` called by API interceptor on 401/403

## PostgreSQL Row-Level Security (RLS)
- **Mechanism**: `SELECT set_config('app.current_tenant_id', tenantId, true)` before every query
- **Implementation**: `src/db/prisma.ts` → `prisma.$extends` → `$allOperations` → injects `tenantId` in WHERE
- **Fail-closed**: Any query to tenant-scoped models without active tenant context throws `CRITICAL SECURITY ALERT`
- **Unfiltered client**: `prismaUnfiltered` bypasses tenant injection (used only for auth/webhook operations)
- **Tenant models**: User, Bot, Lead, Conversation, Message, Workflow, WorkflowExecution, ApiKey, BillingUsage, AiLog

## Redis / BullMQ
- **URL**: `REDIS_URL` env (default: `redis://localhost:6379`)
- **Connection**: `IORedis` with `maxRetriesPerRequest: null` for BullMQ compatibility
- **Queue name**: `whatsapp-messages`
- **Job options**: 5 attempts, exponential backoff (1min base), retain completed 24h, retain failed 7d
- **Worker**: `src/workers/index.ts` — pulls jobs, calls `src/AiInteg/bridge.ts`
- **DLQ worker**: `src/workers/dlq.ts` — handles permanently failed jobs
- **Rate limiter**: `rate-limit-redis` for per-IP express-rate-limit store

## Debug Server (Port 9222)
- **Auth**: `DEBUG_TOKEN` env var — required, `Authorization: Bearer <token>` header
- **Endpoints**:
  - `GET /` — NPM-style dashboard HTML
  - `GET /api/logs?category=<cat>&level=<lvl>&limit=<n>` — query ring buffer
  - `GET /api/categories` — per-category log counts
  - `GET /api/stats` — request stats, error counts
  - `GET /api/health` — service health checks with latency
  - `GET /api/stream` — SSE live log stream
  - `POST /api/log` — ingest log from frontend
- **Ring buffer**: 2000 entries, FIFO
- **Categories**: `frontend | backend | db | docker | api | ai | system`
- **Dashboard**: 6-tab NPM error-box style UI, real-time SSE, expandable JSON meta

## Socket.IO (Real-time)
- **Path**: default `/socket.io`
- **Auth**: `socket.auth.token` → Clerk JWT verified on connection
- **Tenant rooms**: `socket.join(tenantId)` on connect (auto, server-side)
- **Events emitted**: `new_message`, `bot_status_update`, `lead_update`
- **Client**: `socketManager.ts` singleton, avoids multiple connection instances
- **Frontend logging**: connect/disconnect/reconnect/emit all logged to debug server
