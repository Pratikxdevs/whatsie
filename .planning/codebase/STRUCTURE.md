# STRUCTURE
**Updated:** 2026-06-15
**Project:** CrmV2 — Whatsie WhatsApp AI CRM

## Top-Level Layout
```
CrmV2/
├── src/                     # Backend TypeScript source
├── frontend/                # React/Vite frontend
├── prisma/                  # Schema + migrations
├── platforms/               # Evolution API (vendored)
├── docker/                  # Docker init scripts
├── monitoring/              # Prometheus config
├── .planning/               # GSD planning artifacts
│   ├── codebase/            # This map
│   ├── phases/              # Phase plans
│   └── milestones/          # Archived milestone artifacts
├── docker-compose.yml       # postgres, redis, prometheus, grafana, evolution-api
├── tsconfig.json            # Backend TS config (strict, ES2022, CommonJS)
└── package.json             # Backend deps + scripts
```

## Backend: `src/`
```
src/
├── index.ts                 # Server entrypoint: Express, Socket.IO, middleware, startup sync
│
├── AiInteg/                 # AI integration layer
│   ├── bridge.ts            # Main AI pipeline: normalize → persist → generate → dispatch
│   ├── config.ts            # Resolve AI config per tenant (model, apiKey, systemPrompt)
│   └── endpoints.ts         # /api/ai/* routes (verify, config, test, generate)
│
├── adapters/                # External service HTTP clients
│   ├── evolutionApi.ts      # Evolution API client (createInstance, sendText, connectionState, etc.)
│   └── whatsapp.adapter.ts  # Adapter wrapper for dispatching outbound messages
│
├── ai/                      # AI intelligence layers
│   ├── orchestrator.ts      # generateAiResponse() — calls OpenRouter, manages context
│   ├── structuralizer.ts    # Extracts structured lead data from conversation
│   └── leadPromotion.ts     # Promotes leads based on conversation stage
│
├── billing/
│   └── recordUsage.ts       # Track message/AI token usage per tenant
│
├── config/
│   ├── logger.ts            # Pino logger config, PII redaction, ring-buffer integration
│   └── logger.test.ts       # Logger unit tests
│
├── crm/
│   └── crmService.ts        # Core CRM operations (lead/conversation/message CRUD)
│
├── db/
│   └── prisma.ts            # Prisma singleton + tenant-isolation $extends + DB event logging
│
├── debug/                   # Debug observability layer
│   ├── server.ts            # Port 9222 debug server: ring buffer, SSE, NPM-style dashboard
│   ├── prismaLogger.ts      # Prisma query extension (write to ring buffer)
│   └── dockerLogs.ts        # Stream Docker container logs to ring buffer
│
├── errors/                  # Error system
│   ├── codes.ts             # 32 error codes (AUTH/WA/API/DB/Q/WS/SYS) + createAppError()
│   └── recovery.ts          # RecoveryAction map for all 32 codes + enrichError()
│
├── jobs/
│   └── stalledConversations.ts  # Periodic job to close stale conversations
│
├── metrics/
│   └── index.ts             # Prometheus metrics (counters, histograms, gauges)
│
├── middleware/
│   ├── auth.ts              # authenticateToken() — API key + Clerk JWT + JIT sync
│   ├── httpProxy.ts         # Proxy middleware (legacy)
│   ├── quota.ts             # Per-tenant daily quota enforcement
│   ├── rateLimit.ts         # express-rate-limit config (Redis store)
│   ├── requestId.ts         # X-Request-ID header injection
│   ├── requestLogger.ts     # 100x request logger (START + FINISH + auth method)
│   ├── tenant.ts            # AsyncLocalStorage tenantContext
│   └── validate.ts          # Zod schema validation middleware
│
├── normalizer/
│   ├── types.ts             # NormalizedMessage interface
│   └── whatsapp.ts          # Evolution API webhook → NormalizedMessage
│
├── queue/
│   └── setup.ts             # BullMQ queue "whatsapp-messages" + Redis connection
│
├── rateLimiter/
│   └── index.ts             # Platform-level rate limiting (per-bot token buckets)
│
├── router/
│   └── index.ts             # ResponseRouter.dispatch() — routes outbound to correct adapter
│
├── routes/                  # Express route handlers
│   ├── analytics.ts         # /api/analytics/* — dashboard stats, message volume, funnel
│   ├── billing.ts           # /api/billing/* — usage records, AI logs
│   ├── conversations.ts     # /api/conversations/* — fetch, send message, send media, close
│   ├── credentials.ts       # /api/credentials/* — per-tenant platform/AI credentials
│   ├── gateway.ts           # /api/gateway/webhook/whatsapp — inbound webhook handler
│   ├── leads.ts             # /api/leads/* — CRUD, Kanban status update
│   ├── webhooks.ts          # /api/webhooks/clerk — Clerk user sync events
│   ├── whatsapp-chat.ts     # /api/chats/* — multi-bot chat aggregation
│   └── workspaces.ts        # /api/workspaces/* — bot CRUD, start/stop, QR, AI key verify
│
├── schemas/                 # Zod validation schemas
│   ├── auth/                # login, logout, register, refresh
│   ├── bots/                # create, update
│   ├── credentials/         # create, update
│   ├── leads/               # create, update
│   └── messages/            # send, media
│
├── services/                # Domain service layer
│   ├── intentClassifier.ts  # Classify message intent from NLP rules
│   ├── ruleEngine.ts        # Evaluate bot rules against incoming messages
│   ├── sessionManager.ts    # Manage per-contact conversation sessions
│   └── workflowEngine.ts    # Execute workflow steps for matched rules
│
├── utils/                   # Pure utility functions
│   ├── crypto.ts, dates.ts, email.ts, env.ts
│   ├── fileUpload.ts, phone.ts, sanitize.ts, url.ts
│   └── index.ts             # Re-exports
│
├── workers/
│   ├── index.ts             # WhatsApp message worker (BullMQ processor)
│   └── dlq.ts               # Dead letter queue handler
│
└── __tests__/               # Integration + API test suite (18 test files)
    ├── setup.ts             # Test environment setup
    ├── helpers.ts           # Shared test helpers
    ├── integration/         # Tenant isolation + WhatsApp pipeline E2E tests
    └── utils/               # Utility unit tests
```

## Frontend: `frontend/src/`
```
frontend/src/
├── App.tsx                  # Router + auth guard (Clerk SignedIn/SignedOut)
│
├── components/
│   ├── analytics/           # Chart components (MessageVolume, ConversionFunnel, etc.)
│   ├── auth/                # ProtectedRoute.tsx
│   ├── billing/             # Usage charts, invoice table, plan card
│   ├── bots/                # BotCard, BotGrid, AddBotModal, QRCodeModal, BotConfigForm
│   ├── conversations/       # ConversationList, MessageThread, MessageInput, ContactSidebar
│   ├── dashboard/           # ActivityFeed, BotHealthGrid, LeadPipelineFunnel
│   ├── layout/              # AppLayout, Navbar
│   ├── leads/               # KanbanBoard, LeadTable, LeadDetail, filters, bulk actions
│   ├── settings/            # GeneralTab, APIKeysTab, BillingTab, TeamTab, ProfileTab
│   ├── team/                # InviteModal, MemberCard
│   ├── ui/                  # Shadcn/Radix primitives + custom (PhoneInput, DataStates, NoBotGate)
│   ├── ErrorBoundary.tsx    # Global React error boundary
│   └── ProviderAuth.tsx     # Clerk auth context wrapper
│
├── pages/
│   ├── DashboardPage.tsx
│   ├── BotsPage.tsx         # Bot management (create, start/stop, QR scan, configure)
│   ├── ConversationsPage.tsx
│   ├── LeadsPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── BillingPage.tsx
│   ├── SettingsPage.tsx
│   └── LoginPage.tsx
│
├── services/
│   ├── api.ts               # Axios instance + interceptors (auth, activity logging, recovery)
│   ├── errorLog.ts          # Error logger: 32 codes, activityLog(), sendToDebug()
│   ├── errorRecovery.ts     # ErrorRecoveryHandler: per-code UI dispatch (QR modal, settings, etc.)
│   └── socketManager.ts     # Socket.IO singleton with tenant room + event logging
│
├── lib/
│   ├── clerk-bridge.ts      # Non-React Clerk token + signOut bridge
│   └── utils.ts             # cn() tailwind merge utility
│
└── hooks/                   # Custom React hooks
```

## Key File Relationships
```
Request → auth.ts → tenantContext → prisma (filtered)
                 → enrichError() → recovery.ts → {code, recovery}

Inbound WA → gateway.ts → whatsapp normalizer → queue/setup.ts
          → workers/index.ts → bridge.ts → orchestrator.ts → OpenRouter
                            → evolutionApi.ts → WA response

Any error → addLog() → debug/server.ts ring buffer → SSE → 9222 dashboard
Frontend error → errorLog.activityLog() → POST /api/log on 9222
               → errorRecovery.handleEnrichedError() → toast/modal/redirect
```
