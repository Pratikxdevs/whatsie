# CrmV2 Directory Structure

*Last updated: 2026-06-10 — reflects WhatsApp-only cleanup state*

## Top-Level Layout

```
CrmV2/
├── .env                        # Environment variables (secrets)
├── .env.example                # Environment variable template
├── .gitignore
├── .github/                    # GitHub Actions workflows
├── .openclaude/                # Claude AI config
├── .planning/                  # Project planning artifacts
├── ARCHITECTURE.txt            # Legacy architecture notes
├── DB_SCHEMA.md                # Database schema documentation
├── docker-compose.yml          # Infrastructure services
├── docker/                     # Docker init scripts
├── masterdoc.md                # Master project documentation
├── monitoring/                 # Prometheus + Grafana config
├── package.json                # Backend dependencies & scripts
├── package-lock.json
├── tsconfig.json               # TypeScript config (backend)
├── vitest.config.ts            # Test configuration
├── prisma/                     # Database schema & migrations
├── src/                        # Backend source (Express + TS)
├── frontend/                   # Frontend SPA (React + Vite)
├── platforms/                  # Platform-specific configs (Evolution API)
├── phases.prompt/              # Development phase prompts
├── coverage/                   # Test coverage reports
├── dist/                       # Compiled backend output
└── whatsie/                    # (Empty/placeholder)
```

## Backend (`src/`)

```
src/
├── index.ts                    # Entry point — Express app, route mounting, Socket.IO, shutdown
│
├── api/                        # Auth API handlers
│   ├── auth.ts                 # Register, login, refresh, logout endpoints
│   └── auth.test.ts
│
├── routes/                     # Express route definitions
│   ├── gateway.ts              # POST /gateway/whatsapp/:tenantId — webhook receiver
│   ├── whatsapp.routes.ts      # /api/whatsapp — Evolution API proxy (create/connect/logout)
│   ├── whatsapp-chat.ts        # /api/whatsapp — chat/contacts/messages/send endpoints
│   ├── workspaces.ts           # /api/workspaces — workspace management
│   ├── webhooks.ts             # /api/webhooks/clerk — Clerk user sync
│   ├── admin.ts                # /admin — DLQ replay, queue management
│   ├── analytics.ts            # /api/analytics — dashboard analytics
│   ├── billing.ts              # /api/billing — usage & billing info
│   ├── conversations.ts        # /api/conversations — message history
│   ├── leads.ts                # /api/leads — lead CRUD
│   ├── credentials.ts          # /api/credentials — user AI/platform keys
│   ├── workflows.ts            # /api/workflows — workflow CRUD
│   ├── apiKeys.ts              # /api/api-keys — API key management
│   ├── team.ts                 # /api/team — team member management
│   ├── events.ts               # /api/events — audit log (read-only)
│   ├── gateway.test.ts
│   └── admin.test.ts
│
├── middleware/                  # Express middleware
│   ├── auth.ts                 # Dual-mode auth (JWT + API key + Clerk + dev bypass)
│   ├── tenant.ts               # Tenant context via AsyncLocalStorage + RLS
│   ├── validate.ts             # Zod schema validation (body, query, params)
│   ├── rateLimit.ts            # Auth & API rate limiters (Redis-backed)
│   ├── requestId.ts            # Request ID generation
│   ├── requestLogger.ts        # Request logging (feeds debug dashboard)
│   ├── quota.ts                # Quota enforcement
│   ├── httpProxy.ts            # HTTP proxy with retry, caching, circuit breaker
│   ├── auth.test.ts
│   ├── tenant.test.ts
│   └── quota.test.ts
│
├── services/                   # Business logic layer
│   ├── intentClassifier.ts     # Regex/keyword intent matching (HUMAN_ESCALATION, PRICING, etc.)
│   ├── ruleEngine.ts           # Hard rules that bypass AI (escalation, pricing, opt-out)
│   ├── workflowEngine.ts       # Multi-step workflow execution (stateful data collection)
│   ├── sessionManager.ts       # Redis-backed context window + workflow state
│   ├── intentClassifier.test.ts
│   ├── ruleEngine.test.ts
│   ├── sessionManager.test.ts
│   └── workflowEngine.test.ts
│
├── ai/                         # AI integration layer
│   ├── orchestrator.ts         # Multi-provider LLM dispatch (config resolution, generation)
│   └── providers/              # 14 AI provider adapters
│       ├── index.ts            # Provider registry + validation API
│       ├── types.ts            # AIProvider, ProviderConfig, ValidationResult interfaces
│       ├── utils.ts            # Shared provider utilities
│       ├── openai.ts
│       ├── anthropic.ts
│       ├── gemini.ts
│       ├── groq.ts
│       ├── mistral.ts
│       ├── cohere.ts
│       ├── xai.ts
│       ├── together.ts
│       ├── fireworks.ts
│       ├── bedrock.ts
│       ├── ollama.ts
│       ├── openrouter.ts
│       ├── cerebras.ts
│       └── deepseek.ts
│
├── AiInteg/                    # AI Bridge — end-to-end message processing
│   ├── bridge.ts               # Full pipeline: inbound → lead → AI → send → persist
│   ├── config.ts               # AI config resolution + validation
│   └── endpoints.ts            # GET /health, POST /test, GET /config, POST /generate
│
├── crm/                        # CRM persistence layer
│   └── crmService.ts           # Lead/conversation/message CRUD, event audit log
│
├── normalizer/                 # Platform message normalization
│   ├── types.ts                # NormalizedMessage interface (unified format)
│   ├── whatsapp.ts             # Evolution API webhook → NormalizedMessage
│   └── whatsapp.test.ts
│
├── adapters/                   # Platform send adapters
│   ├── evolutionApi.ts         # Evolution API v2.3 — full typed client (620+ lines)
│   └── whatsapp.adapter.ts     # Thin wrapper used by worker (rate-limited send)
│
├── router/                     # Outbound dispatch
│   └── index.ts                # ResponseRouter — platform-agnostic send + persist
│
├── queue/                      # Message queue
│   └── setup.ts                # BullMQ queue + Redis connection
│
├── workers/                    # Background job processing
│   ├── index.ts                # Main worker — 13-step message pipeline
│   ├── dlq.ts                  # Dead Letter Queue monitor
│   └── handlers/               # (empty — future handler extraction)
│
├── schemas/                    # Zod validation schemas
│   ├── index.ts                # Re-exports all schemas
│   ├── auth/                   # register, login, refresh, logout
│   ├── bots/                   # create, update
│   ├── leads/                  # create, update
│   ├── messages/               # send, media
│   ├── credentials/            # create, update
│   └── __tests__/
│
├── db/                         # Database
│   └── prisma.ts               # Prisma singleton with RLS middleware
│
├── config/                     # Configuration
│   ├── logger.ts               # Pino logger with PII redaction
│   └── logger.test.ts
│
├── errors/                     # Error handling
│   └── codes.ts                # Typed error code registry (API, DB, AUTH, WA, TG, TW, Q, WS, SYS)
│
├── metrics/                    # Observability
│   ├── index.ts                # Prometheus counters, histograms, gauges
│   └── metrics.test.ts
│
├── billing/                    # Billing
│   └── recordUsage.ts          # Usage recording with monthly bucketing (messages, AI tokens)
│
├── debug/                      # Debug tooling
│   └── server.ts               # Debug dashboard (port 9222), log buffer, SSE, health checks
│
├── rateLimiter/                # Rate limiting
│   └── index.ts                # Redis-based distributed rate limiter (1 msg/sec outbound)
│
├── utils/                      # Shared utilities
│   ├── index.ts
│   ├── crypto.ts               # AES-256-GCM encryption/decryption
│   ├── dates.ts
│   ├── email.ts
│   ├── env.ts
│   ├── fileUpload.ts
│   ├── httpProxy.ts
│   ├── phone.ts
│   ├── sanitize.ts
│   ├── url.ts
│   └── __tests__/
│
└── __tests__/                  # Backend integration tests
    ├── analytics-api.test.ts
    ├── billing-usage.test.ts
    ├── conversations-api.test.ts
    ├── leads-api.test.ts
    ├── response-router.test.ts
    ├── smoke.test.ts
    ├── validate-middleware.test.ts
    ├── setup.ts
    └── helpers.ts
```

### Stale test files (pre-cleanup, should be removed)

These test files reference deleted platform code and will fail:

```
src/__tests__/discord-adapter.test.ts
src/__tests__/discord-normalizer.test.ts
src/__tests__/discord-rate-limit.test.ts
src/__tests__/discord-startup.test.ts
src/__tests__/discord-worker.test.ts
src/__tests__/discord-workspace.test.ts
src/__tests__/telegram-webhook.test.ts
src/__tests__/integration/tenant-isolation.test.ts
src/__tests__/integration/whatsapp-pipeline.test.ts
```

## Frontend (`frontend/`)

```
frontend/
├── index.html                  # HTML entry point
├── package.json                # Frontend dependencies (React, Radix, Tailwind, etc.)
├── vite.config.ts              # Vite build config
├── tailwind.config.js          # Tailwind CSS config
├── postcss.config.js
├── tsconfig.json
├── eslint.config.js
│
├── public/                     # Static assets
│
└── src/
    ├── main.tsx                # React root mount
    ├── App.tsx                 # Router + auth guard + all page routes
    ├── App.css
    ├── index.css               # Global styles (Tailwind)
    │
    ├── pages/                  # Route-level page components (10 pages)
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── BotsPage.tsx
    │   ├── LeadsPage.tsx
    │   ├── ConversationsPage.tsx
    │   ├── AnalyticsPage.tsx
    │   ├── BillingPage.tsx
    │   ├── TeamPage.tsx
    │   └── SettingsPage.tsx
    │
    ├── components/             # Reusable UI components
    │   ├── ui/                 # Base UI primitives (Radix + shadcn/ui)
    │   │   ├── avatar.tsx
    │   │   ├── button.tsx
    │   │   ├── command.tsx
    │   │   ├── cursor-cards.tsx
    │   │   ├── dialog.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── menubar.tsx
    │   │   ├── navbar.tsx
    │   │   ├── navigation-menu.tsx
    │   │   ├── PhoneInput.tsx
    │   │   ├── popover.tsx
    │   │   ├── separator.tsx
    │   │   ├── stats-card.tsx
    │   │   └── app-menu-bar.tsx
    │   ├── layout/             # App layout
    │   │   ├── AppLayout.tsx
    │   │   └── Navbar.tsx
    │   ├── auth/               # Auth guard
    │   │   └── ProtectedRoute.tsx
    │   ├── bots/               # Bot management
    │   │   ├── AddBotModal.tsx
    │   │   ├── BotCard.tsx
    │   │   ├── BotConfigForm.tsx
    │   │   ├── BotConnectionStatus.tsx
    │   │   ├── BotDetailPanel.tsx
    │   │   ├── BotGrid.tsx
    │   │   ├── BulkActions.tsx
    │   │   ├── PlatformIcon.tsx
    │   │   └── QRCodeModal.tsx
    │   ├── conversations/      # Chat/conversation view
    │   │   ├── ContactSidebar.tsx
    │   │   ├── ConversationList.tsx
    │   │   ├── ConversationListItem.tsx
    │   │   ├── MessageBubble.tsx
    │   │   ├── MessageInput.tsx
    │   │   ├── MessageThread.tsx
    │   │   ├── PlatformBadge.tsx
    │   │   ├── QuickReplyPicker.tsx
    │   │   └── TypingIndicator.tsx
    │   ├── contacts/           # Contact management
    │   │   ├── AddContactModal.tsx
    │   │   ├── ContactDetail.tsx
    │   │   ├── ContactImportModal.tsx
    │   │   ├── ContactTable.tsx
    │   │   └── TagBadge.tsx
    │   ├── dashboard/          # Dashboard widgets
    │   │   ├── ActivityFeed.tsx
    │   │   ├── BotHealthGrid.tsx
    │   │   ├── LeadPipelineFunnel.tsx
    │   │   ├── MessagesOverTimeChart.tsx
    │   │   └── PlatformBreakdown.tsx
    │   ├── leads/              # Lead management
    │   │   ├── AddLeadModal.tsx
    │   │   ├── BulkActions.tsx
    │   │   ├── KanbanCard.tsx
    │   │   ├── KanbanColumn.tsx
    │   │   ├── LeadDetail.tsx
    │   │   ├── LeadDetailTabs.tsx
    │   │   ├── LeadExportButton.tsx
    │   │   ├── LeadFilters.tsx
    │   │   ├── LeadImportModal.tsx
    │   │   ├── LeadKanban.tsx
    │   │   └── LeadTable.tsx
    │   ├── analytics/          # Analytics widgets
    │   │   ├── AIPerformance.tsx
    │   │   ├── BotPerformance.tsx
    │   │   ├── ChartCard.tsx
    │   │   ├── ConversionFunnel.tsx
    │   │   ├── DateRangePicker.tsx
    │   │   ├── HeatmapChart.tsx
    │   │   ├── LeadMetrics.tsx
    │   │   ├── MessageVolumeChart.tsx
    │   │   └── MessagingMetrics.tsx
    │   ├── billing/            # Billing widgets
    │   │   ├── InvoiceTable.tsx
    │   │   ├── PlanCard.tsx
    │   │   ├── UsageChart.tsx
    │   │   ├── UsageMeter.tsx
    │   │   └── UsageTable.tsx
    │   ├── campaigns/          # Campaign management (stale — page deleted)
    │   │   ├── CampaignBuilder.tsx
    │   │   └── CampaignCard.tsx
    │   ├── integrations/       # Integration cards (stale — page deleted)
    │   │   └── PlatformCard.tsx
    │   ├── onboarding/         # Onboarding wizard (stale — page deleted)
    │   │   ├── BotStep.tsx
    │   │   ├── CompleteStep.tsx
    │   │   ├── OnboardingWizard.tsx
    │   │   ├── PlatformStep.tsx
    │   │   └── WelcomeStep.tsx
    │   ├── reports/            # Reports (stale — page deleted)
    │   │   ├── GeneratedReportCard.tsx
    │   │   └── ReportTemplateCard.tsx
    │   ├── settings/           # Settings tabs
    │   │   ├── GeneralTab.tsx
    │   │   ├── ProfileTab.tsx
    │   │   ├── TeamTab.tsx
    │   │   ├── APIKeysTab.tsx
    │   │   ├── BillingTab.tsx
    │   │   └── DangerZoneTab.tsx
    │   ├── team/               # Team management
    │   │   ├── InviteModal.tsx
    │   │   └── MemberCard.tsx
    │   ├── workflows/          # Workflow builder (stale — page deleted)
    │   │   ├── ExecutionMonitor.tsx
    │   │   ├── WorkflowBuilder.tsx
    │   │   ├── WorkflowCard.tsx
    │   │   ├── WorkflowStepEditor.tsx
    │   │   └── WorkflowTriggerConfig.tsx
    │   └── ProviderAuth.tsx    # Universal provider auth component
    │
    ├── contexts/               # React contexts
    │   └── AuthContext.tsx      # Clerk auth state
    │
    ├── hooks/                  # Custom React hooks
    │   ├── use-mobile.tsx
    │   └── use-toast.ts
    │
    ├── services/               # API client layer
    │   ├── api.ts              # Axios wrapper with auth
    │   └── errorLog.ts         # Frontend error logging to debug server
    │
    ├── schemas/                # Frontend Zod schemas
    │
    ├── lib/                    # Shared library code
    │
    ├── utils/                  # Frontend utilities
    │   └── errors.ts           # Error toast setup
    │
    └── assets/                 # Images, icons, etc.
```

### Deleted frontend files (WhatsApp-only cleanup)

The following were removed in commit `4bf057d`:

```
frontend/src/pages/CampaignsPage.tsx      DELETED
frontend/src/pages/ContactsPage.tsx       DELETED
frontend/src/pages/IntegrationsPage.tsx   DELETED
frontend/src/pages/OnboardingPage.tsx     DELETED
frontend/src/pages/ReportsPage.tsx        DELETED
frontend/src/pages/WorkflowsPage.tsx      DELETED
frontend/src/components/BotCard.tsx       DELETED (replaced by bots/BotCard.tsx)
frontend/src/components/BotSetupModal.tsx DELETED
frontend/src/components/NavBar.tsx        DELETED
frontend/src/components/TopBar.tsx        DELETED
frontend/src/components/TopNav.tsx        DELETED
frontend/src/components/settings/CredentialsTab.tsx  DELETED
frontend/src/components/settings/IntegrationsTab.tsx DELETED
```

## Infrastructure

```
docker/
└── init-evolution-db.sql       # Evolution API database initialization

platforms/
├── evolution-api/              # Evolution API source (git submodule)
│   ├── manager/                # Evolution API admin panel
│   ├── src/                    # Evolution API source
│   └── node_modules/
└── platform-add/               # Future platform additions

monitoring/
├── prometheus.yml              # Prometheus scrape config
└── grafana/                    # Grafana dashboards

phases.prompt/                  # AI-assisted development phase prompts
```

## Naming Conventions

### Files & Directories

| Category | Convention | Examples |
|----------|-----------|----------|
| Routes | `camelCase.ts` | `whatsapp.routes.ts`, `whatsapp-chat.ts`, `apiKeys.ts` |
| Services | `camelCase.ts` | `intentClassifier.ts`, `sessionManager.ts` |
| Components | `PascalCase.tsx` | `BotCard.tsx`, `ProtectedRoute.tsx` |
| Pages | `PascalCasePage.tsx` | `DashboardPage.tsx`, `BotsPage.tsx` |
| Schemas | `camelCase.ts` | `register.ts`, `createBot.ts` |
| Tests | `*.test.ts` (co-located) | `auth.test.ts`, `gateway.test.ts` |
| Utils | `camelCase.ts` | `sanitize.ts`, `phone.ts` |
| Config | `camelCase.ts` | `logger.ts`, `setup.ts` |

### Code Conventions

| Pattern | Convention |
|---------|-----------|
| Exports | Named exports for services/utilities, default exports for routers and React components |
| Types | TypeScript interfaces in same file or `types.ts` barrel |
| Validation | Zod schemas in `src/schemas/`, co-located by domain |
| Errors | Typed error codes (`AUTH_001`, `WA_004`) via `src/errors/codes.ts` |
| Logging | Pino with PII redaction, child loggers with `tenantId` + `module` |
| DB access | Always through `src/db/prisma.ts` singleton (never raw `new PrismaClient()`) |

## Entry Points

| Entry Point | Path | Purpose |
|-------------|------|---------|
| Backend API | `src/index.ts` | Express server on port 3000 |
| Debug Server | `src/debug/server.ts` | Debug dashboard on port 9222 |
| Frontend SPA | `frontend/src/main.tsx` | React root mount |
| Frontend Entry | `frontend/index.html` | Vite HTML entry |
| Worker | `src/workers/index.ts` | BullMQ worker (imported by `src/index.ts`) |
| DB Migrations | `prisma/migrations/` | Prisma migration files |
| DB Seed | `prisma/seed.ts` | Database seeding script |
| Docker | `docker-compose.yml` | Infrastructure services |
