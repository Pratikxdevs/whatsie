---
title: Directory Structure
last_mapped_commit: f683cc9578043d8141583bd2d2d84c7ebcaea9d4
last_updated: 2026-06-09
---

# Directory Structure

## Top Level

```
CrmV2/
├── src/                    # Backend (Express.js + TypeScript)
├── frontend/               # Frontend (React + Vite + TailwindCSS)
├── prisma/                 # Database schema + migrations + seeds
├── docker/                 # Docker init scripts
├── platforms/              # External platform integrations (Evolution API, Telegram API, Twitter API)
├── monitoring/             # Prometheus/Grafana config
├── coverage/               # Test coverage output
├── dist/                   # Compiled backend output
├── .planning/              # Planning docs, phase artifacts, knowledge graph
├── docker-compose.yml      # Infrastructure orchestration (Postgres, Redis, Evolution, etc.)
├── package.json            # Backend dependencies + scripts
├── tsconfig.json           # TypeScript config
├── vitest.config.ts        # Test runner config
└── DB_SCHEMA.md            # Database documentation
```

## Key Locations

### Backend (`src/`)

| Directory | Contents |
|-----------|----------|
| `src/index.ts` | Main entry — Express server, Socket.IO, route wiring, graceful shutdown |
| `src/api/` | Auth endpoints (login/register) |
| `src/routes/` | Express routers — one file per domain (webhooks, whatsapp, workspaces, admin, analytics, billing, conversations, leads, credentials, workflows, apiKeys, team, events) |
| `src/middleware/` | Auth, tenant context, rate limiting, request validation, request logging |
| `src/services/` | Business logic — sessionManager, intentClassifier, ruleEngine, workflowEngine, twitterSyncManager |
| `src/adapters/` | Platform API clients — whatsapp, telegram, discord, twitter, evolutionApi |
| `src/normalizer/` | Message normalization — one file per platform + shared types |
| `src/router/` | ResponseRouter — outbound message dispatch to correct adapter |
| `src/ai/` | AI orchestrator + provider configs (16 providers in `providers/`) |
| `src/AiInteg/` | AI bridge endpoints + config for external AI integration |
| `src/crm/` | CRM service — lead/conversation/message persistence |
| `src/billing/` | Usage tracking and billing record creation |
| `src/queue/` | BullMQ queue setup — queues for each platform |
| `src/workers/` | BullMQ workers — main pipeline, DLQ, Twitter workers |
| `src/db/` | Prisma singleton with RLS context injection |
| `src/config/` | Logger configuration (Pino) |
| `src/schemas/` | Zod validation schemas (auth, bots, credentials, leads, messages) |
| `src/utils/` | Utilities — crypto, dates, email, env, fileUpload, phone, sanitize, url |
| `src/metrics/` | Prometheus metrics registration |
| `src/debug/` | Debug server (port 9222) for development dashboard |
| `src/errors/` | Error code definitions |
| `src/rateLimiter/` | Rate limiter abstraction |
| `src/__tests__/` | Backend test files |

### Frontend (`frontend/src/`)

| Directory | Contents |
|-----------|----------|
| `frontend/src/pages/` | 16 page components — Dashboard, Conversations, Contacts, Leads, Bots, Analytics, Billing, Workflows, Settings, Team, etc. |
| `frontend/src/components/` | Reusable UI components organized by domain (analytics, auth, billing, bots, campaigns, contacts, conversations, dashboard, integrations, layout, leads, onboarding, reports, settings, team, ui, workflows) |
| `frontend/src/contexts/` | React context providers (auth state) |
| `frontend/src/hooks/` | Custom React hooks |
| `frontend/src/services/` | API client functions for backend communication |
| `frontend/src/lib/` | Library utilities |
| `frontend/src/schemas/` | Frontend validation schemas |
| `frontend/src/utils/` | Utility functions |

### Database (`prisma/`)

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | 11 models — Tenant, User, Bot, Lead, Conversation, Message, Workflow, WorkflowExecution, ApiKey, Event, BillingUsage, AiLog, RefreshToken, UserCredential |
| `prisma/migrations/` | Migration history |
| `prisma/seed.ts` | Database seeding script |

## Naming Conventions

### Files
- **Backend routes**: `camelCase.ts` (e.g., `webhooks.ts`, `whatsapp.routes.ts`)
- **Backend services**: `camelCase.ts` (e.g., `sessionManager.ts`, `intentClassifier.ts`)
- **Backend adapters**: `camelCase.ts` or `camelCase.adapter.ts` (e.g., `discordAdapter.ts`, `telegram.adapter.ts`)
- **Frontend pages**: `PascalCasePage.tsx` (e.g., `DashboardPage.tsx`, `ConversationsPage.tsx`)
- **Frontend components**: `PascalCase.tsx` (e.g., `BotCard.tsx`, `NavBar.tsx`)
- **Tests**: `*.test.ts` co-located with source files
- **Schemas**: Directory-based grouping under `src/schemas/`

### Directories
- **Backend**: `camelCase` (e.g., `rateLimiter`, `normalizer`)
- **Frontend**: `camelCase` (e.g., `components`, `pages`, `contexts`)
- **Config**: `kebab-case` (e.g., `.github/`)

### Code Conventions
- TypeScript strict mode
- Zod for request/response validation
- Prisma Client for database access
- BullMQ for job queues
- Express Router for route organization
- Single-tenant context propagation via AsyncLocalStorage

## Module Organization

### Backend Modules
- **Domain-driven**: Routes, services, and schemas grouped by business domain (auth, billing, conversations, leads, workflows)
- **Platform adapters**: Each messaging platform has its own adapter file + normalizer
- **AI providers**: Each LLM provider has its own file in `ai/providers/` with a shared interface
- **Shared infrastructure**: Queue setup, Prisma client, logger, metrics are singletons imported across modules

### Frontend Modules
- **Page-based routing**: One component per route, lazy-loaded via React Router
- **Component co-location**: Domain-specific components in subdirectories under `components/`
- **Shared UI primitives**: `components/ui/` for reusable design system components
- **Service layer**: API client functions abstracted from components

### Infrastructure
- **Docker Compose**: 8 services — Postgres, Redis, Prometheus, Grafana, Evolution API, Telegram API, Twitter API, Hydrogram API, Obscura
- **Environment config**: `.env` for runtime secrets, `.env.example` for documentation
- **Monitoring**: Prometheus metrics at `/metrics`, Grafana dashboards on port 3001
