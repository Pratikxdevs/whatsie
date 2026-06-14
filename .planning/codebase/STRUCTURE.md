# Directory Structure

_Last updated: 2026-06-14_

## Root Layout

```
CrmV2/
├── src/                    # Backend source (Node.js/TypeScript)
├── frontend/               # Frontend source (React/Vite)
├── prisma/                 # Database schema + migrations + seed
├── .planning/              # GSD project planning artifacts
├── package.json            # Backend deps (Express, Prisma, BullMQ...)
├── tsconfig.json           # Backend TypeScript config
├── vitest.config.ts        # Backend test runner config
└── .env                    # Environment variables (not committed)
```

## Backend (/src)

```
src/
├── index.ts                # Entry point — Express app, Socket.IO, startup sync, route mounting
│
├── adapters/
│   ├── evolutionApi.ts     # Full Evolution API v2.3 adapter (624 lines, 40+ typed functions)
│   └── whatsapp.adapter.ts # Thin wrapper — WhatsAppAdapter.sendMessage() + healthCheck()
│
├── AiInteg/
│   ├── bridge.ts           # AI bridge service logic
│   ├── config.ts           # AI config resolution helpers
│   └── endpoints.ts        # /api/ai router (health, verify, generate)
│
├── ai/
│   ├── orchestrator.ts     # generateAiResponse() — OpenRouter chat completion + JSON parse
│   ├── leadPromotion.ts    # Lead qualification logic
│   └── structuralizer.ts   # Message structuring helpers
│
├── api/
│   ├── auth.ts             # /api/auth router (login, register, refresh)
│   └── auth.test.ts        # Auth endpoint tests
│
├── billing/
│   └── recordUsage.ts      # recordBillingUsage(), recordAiUsage() — write to BillingUsage/AiLog
│
├── config/
│   ├── logger.ts           # Pino logger + PII redaction + getContextLogger()
│   └── logger.test.ts      # Logger tests
│
├── crm/
│   └── crmService.ts       # processInboundMessageDbUpdates(), logEvent() — DB write layer
│
├── db/
│   └── prisma.ts           # Dual client: prisma (tenant-filtered) + prismaUnfiltered (bypass)
│
├── debug/
│   ├── server.ts           # Debug HTTP server (port 9222) — ring buffer log viewer
│   └── dockerLogs.ts       # Docker log streaming for debug panel
│
├── errors/
│   └── codes.ts            # ErrorCode registry + ERROR_DESCRIPTIONS + createAppError()
│
├── jobs/
│   └── stalledConversations.ts  # Cron job — close stalled open conversations
│
├── metrics/
│   ├── index.ts            # Prometheus counters/histograms (messages, errors, latency)
│   └── metrics.test.ts     # Metrics tests
│
├── middleware/
│   ├── auth.ts             # authenticateToken() — Clerk JWT or X-API-KEY dual-mode auth + JIT sync
│   ├── httpProxy.ts        # createProxiedClient() — axios factory with retry + cache
│   ├── quota.ts            # Per-tenant quota enforcement
│   ├── quota.test.ts
│   ├── rateLimit.ts        # authRateLimiter + apiRateLimiter (Redis-backed)
│   ├── requestId.ts        # X-Request-ID header injection
│   ├── requestLogger.ts    # Pino request/response logging middleware
│   ├── tenant.ts           # AsyncLocalStorage tenantContext + tenantAuthMiddleware
│   ├── tenant.test.ts
│   └── validate.ts         # validateBody(zodSchema) middleware factory
│
├── normalizer/
│   ├── types.ts            # NormalizedMessage type definition
│   ├── whatsapp.ts         # Map Evolution API webhook payload → NormalizedMessage
│   └── whatsapp.test.ts
│
├── queue/
│   └── setup.ts            # IORedis connection + whatsappQueue BullMQ Queue instance
│
├── rateLimiter/
│   └── index.ts            # sendWithRateLimit() — 1 msg/sec per platform bucket
│
├── router/
│   └── index.ts            # ResponseRouter.dispatch() — routes NormalizedMessage to adapter
│
├── routes/
│   ├── analytics.ts        # /api/analytics — message volume, conversion funnel, dashboard stats
│   ├── billing.ts          # /api/billing — usage records, AI logs
│   ├── conversations.ts    # /api/conversations — list, messages, send text/media (full WA dispatch)
│   ├── credentials.ts      # /api/credentials — per-user AI key vault CRUD
│   ├── gateway.ts          # /gateway/whatsapp/:tenantId — Evolution webhook receiver + HMAC validation
│   ├── gateway.test.ts
│   ├── leads.ts            # /api/leads — CRUD, search, update status
│   ├── webhooks.ts         # /api/webhooks/clerk — Clerk user lifecycle (svix-verified)
│   ├── whatsapp-chat.ts    # /api/whatsapp — chat/contacts/messages proxy to Evolution
│   ├── whatsapp.routes.ts  # /api/whatsapp/instance/* — LEGACY bot proxy (hardcodes instance name)
│   └── workspaces.ts       # /api/workspaces — workspace/bot CRUD + connection management
│
├── schemas/                # Zod validation schemas
│   ├── index.ts            # Barrel export
│   ├── auth/               # Login, register, refresh, logout schemas
│   ├── bots/               # Bot create/update schemas
│   ├── credentials/        # Credential create/update schemas
│   ├── leads/              # Lead create/update schemas
│   ├── messages/           # Send message, media schemas
│   └── __tests__/          # Schema validation tests
│
├── services/
│   ├── intentClassifier.ts # Rule-based intent classifier (keyword matching)
│   ├── intentClassifier.test.ts
│   ├── ruleEngine.ts       # Evaluate tenant rules against intent
│   ├── ruleEngine.test.ts
│   ├── sessionManager.ts   # Redis-backed conversation context + workflow state
│   ├── sessionManager.test.ts
│   ├── workflowEngine.ts   # Multi-step workflow execution engine
│   └── workflowEngine.test.ts
│
├── utils/
│   ├── crypto.ts           # Cryptographic helpers
│   ├── dates.ts            # Date formatting utilities
│   ├── email.ts            # Email validation
│   ├── env.ts              # Environment variable access helpers
│   ├── fileUpload.ts       # Base64 file validation (MIME type, size limits)
│   ├── httpProxy.ts        # HTTP proxy utilities
│   ├── index.ts            # Barrel export
│   ├── phone.ts            # Phone number normalization (libphonenumber-js)
│   ├── sanitize.ts         # Input sanitization (DOMPurify)
│   ├── url.ts              # URL utilities
│   └── __tests__/          # Unit tests for all utils
│
├── workers/
│   ├── index.ts            # BullMQ Worker — 13-step message pipeline (whatsapp-messages queue)
│   └── dlq.ts              # Dead Letter Queue monitor
│
└── __tests__/              # Integration + API endpoint tests
    ├── setup.ts             # Test bootstrap
    ├── helpers.ts           # Test helpers
    ├── smoke.test.ts
    ├── ai-api.test.ts
    ├── analytics-api.test.ts
    ├── billing-usage.test.ts
    ├── conversations-api.test.ts
    ├── leads-api.test.ts
    ├── validate-middleware.test.ts
    ├── schemas/             # Schema tests (duplicated — see Concerns)
    ├── utils/               # Utility tests (duplicated — see Concerns)
    └── integration/
        ├── tenant-isolation.test.ts
        └── whatsapp-pipeline.test.ts
```

## Frontend (/frontend/src)

```
frontend/src/
├── main.tsx                # React app mount point
├── App.tsx                 # ClerkProvider, Router, route definitions
├── App.css                 # Global app styles
├── index.css               # Tailwind base + CSS variables
│
├── pages/                  # Top-level route components
│   ├── DashboardPage.tsx
│   ├── BotsPage.tsx
│   ├── LeadsPage.tsx
│   ├── ConversationsPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── BillingPage.tsx
│   ├── SettingsPage.tsx
│   ├── LoginPage.tsx       # (superseded by Clerk hosted UI in App.tsx)
│   └── RegisterPage.tsx    # (superseded by Clerk hosted UI)
│
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx   # Wraps routes requiring isSignedIn
│   ├── layout/
│   │   ├── AppLayout.tsx        # Sidebar + Navbar + Outlet wrapper
│   │   └── Navbar.tsx           # Top navigation bar
│   ├── bots/
│   │   ├── AddBotModal.tsx      # Bot creation + QR flow (consolidated)
│   │   ├── BotCard.tsx          # Bot display card with state-aware buttons
│   │   ├── BotGrid.tsx          # Grid layout for bots
│   │   ├── BotConfigForm.tsx    # Bot settings form
│   │   ├── BotConnectionStatus.tsx
│   │   ├── BotDetailPanel.tsx
│   │   ├── BulkActions.tsx
│   │   ├── PlatformIcon.tsx
│   │   ├── QRCodeModal.tsx      # QR display (may be legacy — see AddBotModal)
│   │   └── types.ts             # Bot-related TypeScript types
│   ├── conversations/
│   │   ├── ConversationList.tsx
│   │   ├── ConversationListItem.tsx
│   │   ├── MessageThread.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── ContactSidebar.tsx
│   │   ├── TypingIndicator.tsx
│   │   ├── QuickReplyPicker.tsx
│   │   └── PlatformBadge.tsx
│   ├── leads/
│   │   ├── LeadKanban.tsx
│   │   ├── LeadTable.tsx
│   │   ├── KanbanCard.tsx, KanbanColumn.tsx
│   │   ├── LeadDetail.tsx, LeadDetailTabs.tsx
│   │   ├── AddLeadModal.tsx, LeadImportModal.tsx
│   │   ├── LeadFilters.tsx, LeadExportButton.tsx
│   │   └── BulkActions.tsx
│   ├── dashboard/
│   │   ├── ActivityFeed.tsx
│   │   ├── BotHealthGrid.tsx
│   │   ├── LeadPipelineFunnel.tsx
│   │   └── MessagesOverTimeChart.tsx
│   ├── analytics/
│   │   ├── AIPerformance.tsx, BotPerformance.tsx
│   │   ├── ChartCard.tsx, HeatmapChart.tsx
│   │   ├── ConversionFunnel.tsx, LeadMetrics.tsx
│   │   ├── MessageVolumeChart.tsx, MessagingMetrics.tsx
│   │   └── DateRangePicker.tsx
│   ├── billing/
│   │   ├── PlanCard.tsx, InvoiceTable.tsx
│   │   ├── UsageChart.tsx, UsageMeter.tsx, UsageTable.tsx
│   ├── settings/
│   │   ├── GeneralTab.tsx, ProfileTab.tsx, TeamTab.tsx
│   │   ├── APIKeysTab.tsx, BillingTab.tsx, DangerZoneTab.tsx
│   ├── team/
│   │   ├── MemberCard.tsx, InviteModal.tsx
│   ├── ui/                      # Reusable primitive components (shadcn-style)
│   │   ├── button.tsx, dialog.tsx, avatar.tsx, command.tsx
│   │   ├── dropdown-menu.tsx, popover.tsx, separator.tsx
│   │   ├── DataStates.tsx       # Loading/empty/error state components
│   │   ├── NoBotGate.tsx        # Guard for pages requiring a connected bot
│   │   ├── AiKeyMissingBanner.tsx
│   │   ├── stats-card.tsx, brand-logo.tsx, cursor-cards.tsx
│   │   └── PhoneInput.tsx
│   ├── ErrorBoundary.tsx
│   └── ProviderAuth.tsx
│
├── contexts/
│   └── AuthContext.tsx      # Bridges Clerk → app User interface; exposes __clerkGetToken
│
├── hooks/
│   ├── useAiKeyStatus.ts    # Check if AI key is configured
│   ├── useKeyVault.ts       # Credentials API hook
│   ├── use-mobile.tsx       # Responsive breakpoint hook
│   └── use-toast.ts         # Toast notification hook
│
├── services/
│   ├── api.ts               # Axios instance + all API namespaces (botApi, leadApi, etc.)
│   ├── socketManager.ts     # Singleton Socket.IO client manager
│   └── errorLog.ts          # Client-side error logging
│
├── schemas/                 # Frontend Zod schemas (auth, bots, leads, credentials, contacts)
│
├── lib/
│   ├── utils.ts             # cn() — clsx + tailwind-merge helper
│   ├── brand-resolver.ts    # Platform brand colors/icons resolver
│   └── vault.ts             # Credential vault helpers
│
└── utils/
    ├── index.ts
    └── errors.ts            # setupErrorToasts() — global error event listeners
```

## Database (/prisma)

```
prisma/
├── schema.prisma            # 15 models, PostgreSQL, RLS-ready
├── migrations/              # Prisma migration history
└── seed.ts                  # Development seed data
```

## Configuration Files

| File                    | Purpose                                 |
|-------------------------|-----------------------------------------|
| package.json            | Backend deps + scripts                  |
| tsconfig.json           | Backend TS config (target ES2020)        |
| vitest.config.ts        | Test runner (Vitest, node env, coverage) |
| frontend/package.json   | Frontend deps + scripts                  |
| frontend/tsconfig.json  | Frontend TS config                       |
| frontend/vite.config.ts | Vite + proxy config (mock mode toggle)   |
| frontend/.eslintrc      | ESLint config                            |
| .env                    | Runtime secrets (not committed)          |
| prisma/schema.prisma    | Database schema source of truth          |

## Key Files at a Glance

| File                            | Role                                               |
|---------------------------------|----------------------------------------------------|
| src/index.ts                    | Server bootstrap — everything wired here           |
| src/adapters/evolutionApi.ts    | Complete Evolution API v2.3 typed adapter          |
| src/db/prisma.ts                | Zero-trust tenant-filtered Prisma client           |
| src/middleware/auth.ts          | Dual-mode auth (Clerk + API key) with JIT sync     |
| src/workers/index.ts            | 13-step BullMQ message processing pipeline         |
| src/ai/orchestrator.ts          | OpenRouter LLM integration + response parsing      |
| src/routes/conversations.ts     | Conversations + message send (real WA dispatch)    |
| src/routes/webhooks.ts          | Clerk webhook handler (svix-verified)              |
| src/routes/gateway.ts           | Evolution API webhook receiver + HMAC validation   |
| src/errors/codes.ts             | Structured error code registry                     |
| frontend/src/services/api.ts    | All frontend API calls (437 lines)                 |
| frontend/src/services/socketManager.ts | Singleton Socket.IO client               |
| frontend/src/contexts/AuthContext.tsx  | Clerk → app auth bridge                   |
| frontend/src/App.tsx            | Route definitions + Clerk provider                 |
