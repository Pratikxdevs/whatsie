# Whatsie (CrmV2) — AI Context Handover

> **Target Audience:** Future AI Agents, LLM Coding Assistants, and Automated Workflows.
> **Purpose:** Read this document FIRST to instantly understand the system architecture, constraints, and operational patterns before modifying any code.

---

## 1. System Identity & Philosophy
**Whatsie** is a multi-tenant Node.js + React monorepo acting as a WhatsApp CRM and automation bridge. 
It connects external WhatsApp numbers (via Evolution API) to an internal rule engine, AI classifier, and human-in-the-loop dashboard.
- **Philosophy**: Failsafe messaging. Webhooks must never block or drop messages. Everything async goes into BullMQ. All UI updates must be real-time.

## 2. Core Architecture
- **Backend (`src/`)**: Express API running on Node.js (TypeScript). Serves as the webhook receiver, job orchestrator, and data API.
- **Frontend (`frontend/`)**: React 19 SPA bundled by Vite. Runs on port 5173 locally, proxies `/api`, `/gateway`, and `/socket.io` to the backend.
- **Database**: PostgreSQL managed by Prisma (`src/db/`). Migrations and schemas are in `prisma/schema.prisma`.
- **Caching & Queues**: Redis handles rate-limiting (`rate-limit-redis`), deduping locks, and drives the **BullMQ** pipelines (`src/workers/`).

## 3. The "Holy Trinity" of External Dependencies
1. **Evolution API (v2.3)**: Handles the actual WhatsApp protocol. Runs in Docker. We communicate with it via `src/adapters/evolutionApi.ts`. It sends webhooks back to `src/routes/webhooks.ts`.
2. **Clerk**: Identity provider. Backend verifies JWTs (`@clerk/express`); frontend uses `@clerk/clerk-react`. `src/middleware/auth.ts` implements a Just-In-Time (JIT) DB sync for users (if a webhook is delayed, the first API request manually syncs the user to the DB).
3. **OpenRouter**: The AI engine. We use the standard `openai` Node SDK to call OpenRouter for intent classification and fallback conversational chat (`src/ai/orchestrator.ts`).

## 4. Critical Data Flows

### Inbound WhatsApp Message Flow (Asynchronous Pipeline)
1. **Webhook Receiver** (`src/routes/webhooks.ts`): Evolution API posts here. We validate the HMAC signature (`EVOLUTION_API_KEY`).
2. **Job Queueing**: The raw payload is immediately pushed into BullMQ (`whatsapp-messages` queue) so the webhook can return `200 OK` instantly to Evolution API.
3. **Worker Processing** (`src/workers/index.ts`):
   - **Deduplication**: Uses a Redis `setnx` lock (`H-007`) to prevent double-processing delayed webhooks.
   - **Normalization**: Translates the messy Evolution payload into a clean `NormalizedMessage` (`src/normalizer/`).
   - **Persistence**: Upserts the Lead and Conversation in Postgres.
   - **Evaluation**: Evaluates rules. *Is it a known intent? Does it match a workflow?* If not, it falls back to the AI Orchestrator.
4. **Outbound Dispatch** (`src/router/index.ts`): `ResponseRouter` takes generated replies, formats them, saves outbound logs to DB, and sends them to the `WhatsAppAdapter`.
5. **Real-time Sync**: The backend emits a `new_message` Socket.IO event to the `tenantId` room.

### Frontend API Communication
1. **Axios Interceptor** (`frontend/src/services/api.ts`): Automatically injects the Clerk Bearer token.
2. **Error Recovery**: Automatically catches structured `AppError` payloads (e.g., `AUTH_001`, `API_004`) from the backend and dispatches UI recovery actions (like "Sign in again" or redirecting to settings).

## 5. Architectural Mandates & "Gotchas" (CRITICAL)

### Tenant Isolation (Backend)
- The backend uses `AsyncLocalStorage` (`tenantContext.run`) to implicitly pass the `tenantId` down the call stack. 
- **Rule**: Do not prop-drill `tenantId` through every function. Retrieve it deep in the stack using `tenantContext.getStore()?.tenantId`.
- **Database Safety**: Almost all Prisma queries must include `where: { tenantId }` to ensure cross-tenant data bleed is impossible.

### WebSocket Connections (Frontend)
- **Frontend Socket Singleton**: **DO NOT** initialize `io()` inside React components. 
- **Rule**: Always import and use `socketManager` from `frontend/src/services/socketManager.ts`. It queues emit requests until the connection is fully established. Multiple raw socket instances cause immediate "send called before connect" race conditions.

### Logging Hazards
- We use Pino (`src/config/logger.ts`). 
- **Rule**: **NEVER** `console.log()` or `logger.info()` an entire Express `req` or `res` object, or a raw `Error` containing Socket/DOM references. Circular JSON serialization will crash the entire Node process. 
- **Fix**: Use `enrichError` (`src/errors/recovery.ts`) to safely format errors.

### Request Validation
- **Rule**: All inbound HTTP requests must be validated using Zod schemas (`src/schemas/`) via the `validateBody`, `validateQuery`, or `validateParams` middlewares. The middleware handles throwing 400 errors if validation fails.

### Security
- **API Keys**: Server-to-server API keys are hashed with HMAC-SHA256 and a global `API_KEY_PEPPER` before being stored.
- **Metrics**: The `/metrics` Prometheus endpoint is protected by a `METRICS_TOKEN` Bearer auth check.

## 6. Directory Cheat Sheet

```text
/Whatsie/
├── docker/                 # Docker config files (e.g., init scripts)
├── frontend/               # React Vite client app
│   ├── public/             # Static assets
│   └── src/                # Frontend source code
│       ├── components/     # Reusable UI elements, grouped by feature
│       ├── contexts/       # React contexts (AuthContext)
│       ├── pages/          # Top-level route components
│       ├── schemas/        # Frontend Zod schemas
│       └── services/       # API clients, Socket manager
├── platforms/              # External platform integration code (evolution-api)
├── prisma/                 # Database schema and seed files
└── src/                    # Node.js Express backend source code
    ├── adapters/           # Adapters for external APIs (WhatsApp, Evolution API)
    ├── ai/                 # AI core logic (orchestrator, classifiers)
    ├── api/                # Core API routes/handlers (some tests here)
    ├── db/                 # Prisma client instance and helpers
    ├── errors/             # Error definitions, codes, recovery mappings
    ├── middleware/         # Express middleware (auth, rateLimit, validate, tenant)
    ├── queue/              # BullMQ queue definitions
    ├── router/             # Response routing/dispatch logic
    ├── routes/             # Express route definitions
    ├── schemas/            # Zod validation schemas
    ├── services/           # Core business services (RuleEngine, SessionManager)
    ├── workers/            # BullMQ worker execution logic (DLQ, handlers)
    └── __tests__/          # Global and integration test suites
```

- **`src/workers/`**: BullMQ job execution (The heart of async processing). Contains the DLQ (Dead Letter Queue) handler for failed jobs.
- **`src/middleware/`**: Express middlewares (Auth, Quota, Rate Limit, Tenant context).
- **`src/errors/codes.ts`**: Global error dictionary. Use these constant codes instead of raw string errors.
- **`src/__tests__/setup.ts`**: Global Vitest mocking environment. It fully mocks Prisma, Clerk, and BullMQ so unit tests don't hit real infrastructure.

## 7. Next Steps for AI Agents
If you are modifying a specific domain (e.g., authentication, AI orchestration, frontend layout), reference the deeper map documents located in `.planning/codebase/`:
- `ARCHITECTURE.md`
- `STRUCTURE.md`
- `CONCERNS.md`
- `TESTING.md`
