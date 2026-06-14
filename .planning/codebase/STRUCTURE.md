# STRUCTURE.md — Directory Layout
**Last mapped:** 2026-06-14

---

## Root

```
CrmV2/
├── src/                     ← Backend (Node/Express/TypeScript)
├── frontend/                ← Frontend (React/Vite)
├── prisma/                  ← DB schema + migrations
├── docker/                  ← Docker init SQL
├── monitoring/              ← Prometheus config
├── docker-compose.yml       ← Infra services
├── .env.example             ← Environment template (safe to commit)
├── .env                     ← Real secrets (gitignored ✅)
├── apikeys.txt              ← Keys file (gitignored ✅)
├── .gitignore               ← Hardened (2026-06-14)
├── .planning/               ← GSD planning artifacts
│   ├── codebase/            ← These docs
│   ├── milestones/
│   │   └── v1.0-phases/     ← Archived phase plans (26 dirs)
│   ├── MILESTONES.md
│   ├── ROADMAP.md
│   └── STATE.md
└── Evolution API - v2.3.-.postman_collection.json  ⚠️ Should be gitignored
```

---

## Backend (`src/`)

```
src/
├── index.ts                 ← Entry point, Express + Socket.IO + startup
├── adapters/
│   ├── evolutionApi.ts      ← Full EvoAPI client (628 lines)
│   └── whatsapp.adapter.ts  ← Outbound WhatsApp send
├── ai/
│   └── orchestrator.ts      ← Multi-provider AI dispatch
├── AiInteg/
│   ├── bridge.ts            ← AI response → Evolution API send
│   ├── config.ts            ← AI provider config resolver
│   └── endpoints.ts         ← /api/ai/* routes
├── api/
│   └── auth.ts              ⚠️ DEAD — register/login (superseded by Clerk)
├── billing/
│   └── recordUsage.ts       ← BillingUsage metric recorder
├── config/
│   └── logger.ts            ← Pino logger singleton
├── crm/
│   └── crmService.ts        ← Lead/conversation DB operations
├── db/
│   └── prisma.ts            ← Prisma client singleton
├── debug/
│   └── server.ts            ← Debug HTTP server (port 9222)
├── errors/
│   └── codes.ts             ← Error code constants
├── jobs/
│   └── stalledConversations.ts  ← Cron: close stale conversations
├── metrics/
│   └── index.ts             ← Prometheus metric definitions
├── middleware/
│   ├── auth.ts              ← Dual-strategy auth (Clerk JWT + API key)
│   ├── httpProxy.ts         ← Axios + circuit breaker + retry + cache
│   ├── rateLimit.ts         ← Rate limiter setup
│   ├── requestId.ts         ← X-Request-Id injection
│   ├── requestLogger.ts     ← Pino HTTP request logging
│   ├── tenant.ts            ⚠️ DEAD — not imported anywhere
│   └── validate.ts          ← Zod request body validation
├── normalizer/
│   ├── types.ts             ← NormalizedMessage interface
│   ├── whatsapp.ts          ← WhatsApp webhook → NormalizedMessage
│   └── whatsapp.test.ts     ⚠️ Test in non-test dir
├── platforms/               ⚠️ EMPTY directory
├── queue/
│   └── setup.ts             ← Redis + BullMQ setup
├── rateLimiter/
│   └── index.ts             ← Rate limiter (may duplicate middleware/rateLimit.ts)
├── router/
│   └── index.ts             ← ResponseRouter (platform dispatch)
├── routes/
│   ├── analytics.ts         ← GET /api/analytics/*
│   ├── billing.ts           ← GET /api/billing/*
│   ├── conversations.ts     ← /api/conversations/*
│   ├── credentials.ts       ← /api/credentials/*
│   ├── gateway.ts           ← POST /gateway/whatsapp/:tenantId
│   ├── leads.ts             ← /api/leads/*
│   ├── webhooks.ts          ← POST /webhooks/clerk
│   ├── whatsapp-chat.ts     ← /api/whatsapp/*
│   └── workspaces.ts        ← /api/workspaces/*
├── schemas/
│   └── bots/create.ts       ← Zod schema for bot creation
├── services/
│   ├── intentClassifier.ts  ← Message intent detection
│   ├── ruleEngine.ts        ← Workflow rule evaluation
│   ├── sessionManager.ts    ← Conversation session state
│   └── workflowEngine.ts    ← Multi-step workflow execution
├── utils/
│   └── crypto.ts            ← AES-256-GCM credential encryption
├── workers/
│   ├── dlq.ts               ← Dead letter queue handler
│   ├── handlers/            ← Worker step handlers
│   └── index.ts             ← BullMQ consumer
└── __tests__/               ← Vitest test suite
```

---

## Frontend (`frontend/src/`)

```
frontend/src/
├── App.tsx                  ← Routes + Clerk provider
├── main.tsx                 ← Vite entry
├── assets/                  ← Static images
├── components/
│   ├── auth/                ← ProtectedRoute
│   ├── billing/             ← PlanCard, UsageMeter, UsageChart, InvoiceTable
│   ├── analytics/           ← ChartCard
│   ├── layout/              ← AppLayout, Navbar
│   ├── settings/            ← GeneralTab, ProfileTab, TeamTab, etc.
│   └── ErrorBoundary.tsx
├── contexts/
│   └── AuthContext.tsx      ← useAuth hook, Clerk bridge
├── lib/
│   └── clerk-bridge.ts      ← Token fetch for API calls
├── pages/
│   ├── DashboardPage.tsx
│   ├── BotsPage.tsx
│   ├── LeadsPage.tsx
│   ├── ConversationsPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── BillingPage.tsx
│   ├── SettingsPage.tsx
│   └── NotFoundPage.tsx
├── services/
│   ├── api.ts               ← Axios API client + all API methods
│   └── socketManager.ts     ← Socket.IO singleton
└── utils/
    └── errors.ts            ← Global axios error interceptor
```

---

## ⚠️ Files/Dirs That Should Be Gitignored or Deleted

| Path | Reason |
|------|--------|
| `coverage/` | Test coverage output — gitignored but dir exists |
| `Evolution API - v2.3.-.postman_collection.json` | Dev tooling artifact — not needed in repo |
| `src/platforms/` | Empty directory |
| `src/api/auth.ts` | Dead code — superseded by Clerk |
| `src/middleware/tenant.ts` | Dead code — not imported anywhere |
| `src/rateLimiter/index.ts` | Potentially duplicate of `src/middleware/rateLimit.ts` |
