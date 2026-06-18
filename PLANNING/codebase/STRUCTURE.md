# STRUCTURE.md — Directory Layout & Organization

**Project:** CrmV2 — Multi-Platform AI CRM Bot SaaS  
**Date:** 2026-06-15  
**Root:** `/home/clutch/Desktop/Whatsie`

---

## Top-Level Directory Structure

```
/home/clutch/Desktop/Whatsie/
├── src/                          # Application source code
│   ├── index.ts                  # Express server entry point (452 lines)
│   ├── adapters/                 # External API adapters
│   │   ├── evolutionApi.ts       #   Evolution API v2.3 client (642 lines)
│   │   └── whatsapp.adapter.ts   #   WhatsApp adapter interface (1.6KB)
│   ├── ai/                       # AI / LLM integration
│   │   ├── orchestrator.ts       #   AI response generation (6.4KB)
│   │   ├── structuralizer.ts     #   Structured output parsing (4.6KB)
│   │   └── leadPromotion.ts      #   Lead scoring/promotion (1.6KB)
│   ├── AiInteg/                  # AI Bridge API (legacy naming)
│   │   └── endpoints.ts          #   AI endpoints (/api/ai/*)
│   ├── api/                      # Legacy API directory (mostly empty)
│   ├── billing/                  # Billing & usage tracking
│   │   └── recordUsage.ts        #   BillingUsage recording
│   ├── config/                   # Application configuration
│   │   ├── logger.ts             #   Pino logger setup with PII redaction (74 lines)
│   │   └── logger.test.ts        #   Logger tests
│   ├── crm/                      # CRM business logic
│   │   └── crmService.ts         #   Lead/conversation DB operations
│   ├── db/                       # Database setup
│   │   └── prisma.ts             #   Prisma client initialization (2 clients)
│   ├── debug/                    # Debug server + tooling
│   │   ├── server.ts             #   Debug HTTP server (port 9222)
│   │   ├── dockerLogs.ts         #   Docker log streaming
│   │   └── ...
│   ├── errors/                   # Error handling
│   │   └── recovery.ts           #   enrichError() utility
│   ├── jobs/                     # Scheduled / recurring jobs
│   │   └── stalledConversations.ts #   Conversation health check
│   ├── metrics/                  # Prometheus metrics
│   │   └── index.ts              #   prom-client metric definitions
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts               #   authenticateToken (108 lines)
│   │   ├── tenant.ts             #   AsyncLocalStorage context
│   │   ├── rateLimit.ts          #   Rate limiter setup
│   │   ├── validate.ts           #   Zod validation middleware
│   │   ├── quota.ts              #   Plan quota enforcement
│   │   ├── requestId.ts          #   X-Request-Id generation
│   │   ├── requestLogger.ts      #   Request response logging
│   │   ├── httpProxy.ts          #   Proxy wrapper for external APIs
│   │   └── quota.test.ts         #   Quota tests
│   ├── normalizer/               # Message normalization
│   │   └── types.ts              #   NormalizedMessage type definition
│   ├── queue/                    # Queue infrastructure
│   │   └── setup.ts              #   Redis + BullMQ queue (30 lines)
│   ├── rateLimiter/              # Rate limiter configs
│   ├── router/                   # Response routing
│   │   └── index.ts              #   ResponseRouter.dispatch()
│   ├── routes/                   # API route handlers
│   │   ├── workspaces.ts         #   Bot CRUD + instance management (17.9KB)
│   │   ├── whatsapp-chat.ts      #   WhatsApp messages (10.6KB)
│   │   ├── conversations.ts      #   Conversation management (12.4KB)
│   │   ├── leads.ts              #   Lead management (5.4KB)
│   │   ├── analytics.ts          #   Analytics queries (4.4KB)
│   │   ├── billing.ts            #   Billing data (3.3KB)
│   │   ├── credentials.ts        #   User credential storage (5.3KB)
│   │   ├── webhooks.ts           #   Clerk + Evolution webhooks (4.9KB)
│   │   └── gateway.ts            #   Internal gateway router (7.8KB)
│   ├── schemas/                  # Zod validation schemas
│   ├── services/                 # Business logic services
│   │   ├── intentClassifier.ts   #   Rule-based intent detection (1.1KB)
│   │   ├── ruleEngine.ts         #   Declarative rule evaluation (2KB)
│   │   ├── workflowEngine.ts     #   Workflow execution (3.6KB)
│   │   ├── sessionManager.ts     #   Conversation state management (1.8KB)
│   │   ├── intentClassifier.test.ts
│   │   ├── ruleEngine.test.ts
│   │   ├── workflowEngine.test.ts
│   │   └── sessionManager.test.ts
│   ├── utils/                    # Shared utilities
│   ├── workers/                  # Background job processors
│   │   ├── index.ts              #   Main BullMQ worker (274 lines)
│   │   ├── dlq.ts                #   Dead letter queue monitor
│   │   └── handlers/             #   (empty — handler registration directory)
│   └── __tests__/                # Test infrastructure + API tests
│       ├── setup.ts              #   Global test setup (156 lines, mocks)
│       ├── helpers.ts            #   Test helper utilities
│       ├── smoke.test.ts         #   Health check smoke test
│       ├── ai-api.test.ts        #   AI endpoint integration tests
│       ├── analytics-api.test.ts #   Analytics endpoint tests
│       ├── billing-usage.test.ts #   Billing endpoint tests
│       ├── conversations-api.test.ts
│       ├── leads-api.test.ts     #   Lead endpoint tests
│       ├── normalizer.test.ts    #   Message normalizer tests
│       ├── schemas.test.ts       #   Zod schema validation tests
│       ├── utils.test.ts         #   Utility function tests
│       ├── validate-middleware.test.ts
│       ├── integration/          #   Integration test suites
│       └── utils/                #   Test utility helpers
│
├── prisma/                       # Database schema + migrations
│   ├── schema.prisma             #   DB schema (14 models, 250 lines)
│   ├── migrations/               #   Prisma migration history
│   └── seed.ts                   #   Database seeder (31KB)
│
├── dist/                         # Compiled JS output
├── node_modules/                 # Dependencies
├── platforms/                    # Platform submodules
│   └── evolution-api/            #   Evolution API platform (full sub-repo)
│
├── docker/                       # Docker support files
│   └── init-evolution-db.sql     #   Evolution DB init script
│
├── monitoring/                   # Observability configs
│   └── prometheus.yml            #   Prometheus scrape configuration
│
├── docker-compose.yml            # Local infrastructure (Postgres, Redis, Evolution, Prometheus, Grafana)
├── Dockerfile                    # App Docker build
├── .dockerignore                 # Docker ignore rules
├── .env                          # Environment variables (local dev)
├── .env.example                  # Environment template
├── package.json                  # Dependencies + scripts
├── tsconfig.json                 # TypeScript config (strict, CommonJS, ES2022)
├── vitest.config.ts              # Vitest config
└── package-lock.json             # Lock file
```

---

## Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| Source files | `camelCase.ts` | `sessionManager.ts`, `crmService.ts` |
| Route files | `kebab-case.ts` | `whatsapp-chat.ts` (mixed — historical) |
| Test files | `*.test.ts` co-located | `sessionManager.test.ts` |
| API test files | `*-api.test.ts` | `analytics-api.test.ts` |
| Database models | PascalCase | `Tenant`, `User`, `BillingUsage` |
| Database fields | camelCase | `tenantId`, `createdAt` |
| Express exports | `*Router` | `workspacesRouter`, `webhookRouter` |
| Interfaces | PascalCase with `Options`/`Props` suffix | `SendTextOptions`, `AuthenticatedRequest` |
| Services | PascalCase exports | `SessionManager`, `RuleEngine`, `WorkflowEngine` |

---

## Key File Locations

### Entry Points
- **Express Server**: `src/index.ts:405` — `server.listen(PORT)`
- **BullMQ Worker**: `src/workers/index.ts:139` — `new Worker('whatsapp-messages', ...)`
- **Debug Server**: `src/debug/server.ts` — port 9222
- **Database Seed**: `prisma/seed.ts`

### Configuration
- **Logger**: `src/config/logger.ts`
- **Prisma Client**: `src/db/prisma.ts`
- **BullMQ Queue**: `src/queue/setup.ts`
- **Redis Connection**: `src/queue/setup.ts:8` — shared `redisConnection` export

### Authentication
- **Express Middleware**: `src/middleware/auth.ts:34` — `authenticateToken`
- **Socket.IO Auth**: `src/index.ts:175` — `io.use()` middleware
- **Tenant Context**: `src/middleware/tenant.ts`

### Message Processing
- **Pipeline Controller**: `src/workers/index.ts:141` — worker processor function
- **Intent Classification**: `src/services/intentClassifier.ts:9` — `IntentClassifier.classify()`
- **Rule Engine**: `src/services/ruleEngine.ts:35` — `RuleEngine.evaluate()`
- **Workflow Engine**: `src/services/workflowEngine.ts` — `WorkflowEngine.checkTrigger()`, `processStep()`, `startWorkflow()`
- **Session Manager**: `src/services/sessionManager.ts` — `getWorkflowState()`, `pushMessage()`, `setWorkflowState()`

### AI Integration
- **ORCHESTRATOR**: `src/ai/orchestrator.ts`
- **Structuralizer**: `src/ai/structuralizer.ts`
- **Lead Promotion**: `src/ai/leadPromotion.ts`
- **AI Bridge Routes**: `src/AiInteg/endpoints.ts`

### External Integrations
- **Evolution API Client**: `src/adapters/evolutionApi.ts`
- **WhatsApp Adapter**: `src/adapters/whatsapp.adapter.ts`
- **Webhook Handler**: `src/routes/webhooks.ts`

### Monitoring
- **Metrics Definition**: `src/metrics/index.ts`
- **Health Check**: `src/index.ts:325` — `/health`, `src/index.ts:329` — `/ready`
- **Prometheus Endpoint**: `src/index.ts:143` — `/metrics`
- **Debug Logging**: `src/debug/server.ts`

---

## File Size Distribution (Key Files)

| File | Lines | Size |
|------|-------|------|
| `src/adapters/evolutionApi.ts` | 642 | 22.4KB |
| `src/index.ts` | 452 | 15.4KB |
| `src/routes/workspaces.ts` | 476 | 17.9KB |
| `src/routes/conversations.ts` | 344 | 12.4KB |
| `src/routes/whatsapp-chat.ts` | 294 | 10.6KB |
| `src/middleware/httpProxy.ts` | 316 | 11.6KB |
| `src/workers/index.ts` | 274 | 11.2KB |
| `src/__tests__/setup.ts` | 156 | 5.4KB |
| `src/middleware/auth.ts` | 108 | 4.1KB |
| `src/middleware/requestLogger.ts` | 106 | 4.1KB |
| `prisma/schema.prisma` | 250 | 7.5KB |
| `prisma/seed.ts` | 810 | 31KB |

---

## Module Aliases

Configured via `module-alias`:
```typescript
// Allows: import { foo } from '@/config/logger'
require('module-alias').addAlias('@', __dirname);
```
