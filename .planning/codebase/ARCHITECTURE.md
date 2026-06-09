---
title: Architecture
last_mapped_commit: f683cc9578043d8141583bd2d2d84c7ebcaea9d4
last_updated: 2026-06-09
---

# Architecture

## Pattern
Multi-tenant SaaS platform with event-driven message processing pipeline. Backend is an Express.js monolith with BullMQ job queues for async message handling. Frontend is a React SPA with Vite. Database isolation enforced via PostgreSQL Row-Level Security (RLS) policies.

## Layers

| Layer | Responsibility |
|-------|----------------|
| **API/Route Layer** | Express routers handle HTTP requests, webhook verification, auth gating, rate limiting |
| **Middleware Layer** | Authentication (JWT/Clerk/API Key), tenant context propagation (AsyncLocalStorage), request validation, rate limiting |
| **Service Layer** | Business logic — session management, intent classification, rule engine, workflow engine, AI orchestration |
| **CRM Layer** | PostgreSQL persistence for leads, conversations, messages, events via Prisma |
| **Queue Layer** | BullMQ workers process inbound messages through a 10-step pipeline; separate queues per platform (WhatsApp, Telegram, Discord, Twitter) |
| **Adapter Layer** | Platform-specific API integrations (Evolution API for WhatsApp, Telegram Bot API, Discord.js, Twitter/twikit) |
| **Normalizer Layer** | Converts platform-specific message formats into a unified `NormalizedMessage` schema |
| **AI Layer** | Multi-provider LLM orchestration (Groq, OpenAI, OpenRouter, Gemini, Anthropic, Bedrock, etc.) with per-tenant config resolution |
| **Infra Layer** | Redis (caching/session/queue), PostgreSQL (persistent storage), Prometheus/Grafana (monitoring), Sentry (error tracking) |

## Data Flow

### Inbound Message Flow (10-step pipeline)
1. Platform webhook/adapter receives message → normalizes to `NormalizedMessage`
2. Message enqueued to platform-specific BullMQ queue
3. Worker picks up job → loads session state from Redis (SessionManager)
4. Persists lead, conversation, message to PostgreSQL (CRM service)
5. SessionManager pushes message to Redis context window (last 10 messages)
6. WorkflowEngine checks if user is mid-flow → processes step if active
7. IntentClassifier classifies message intent
8. WorkflowEngine checks if intent triggers a new workflow
9. RuleEngine evaluates rules against intent + lead state
10. If no rule matches → AI Orchestrator generates response via configured LLM provider

### Outbound Response Flow
1. ResponseRouter dispatches to platform adapter
2. Adapter sends message via platform API
3. Outbound message persisted to PostgreSQL
4. Socket.IO emits `new_message` event to frontend for real-time updates
5. Billing usage recorded

### Auth Flow
- Clerk webhooks sync users/tenants on signup (svix signature verification)
- Dual-mode auth: API Key header (X-API-KEY) or Bearer JWT
- Dev bypass mode available (DEV_AUTH_BYPASS=true)
- Tenant context propagated via AsyncLocalStorage for RLS enforcement

## Key Abstractions

- **`NormalizedMessage`** — Platform-agnostic message schema (`src/normalizer/types.ts`)
- **`SessionManager`** — Redis-backed conversation context + workflow state (`src/services/sessionManager.ts`)
- **`IntentClassifier`** — Keyword/pattern-based intent classification (`src/services/intentClassifier.ts`)
- **`RuleEngine`** — Tenant-configurable rule matching (`src/services/ruleEngine.ts`)
- **`WorkflowEngine`** — Multi-step data collection workflows (`src/services/workflowEngine.ts`)
- **`ResponseRouter`** — Platform-agnostic outbound dispatch (`src/router/index.ts`)
- **`prisma` (extended)** — PrismaClient with RLS context injection via `set_config` (`src/db/prisma.ts`)
- **`tenantContext`** — AsyncLocalStorage for tenant-scoped operations (`src/middleware/tenant.ts`)

## Entry Points

| Entry Point | Path | Purpose |
|-------------|------|---------|
| Backend main | `src/index.ts` | Express server, Socket.IO, route registration, bot status sync |
| BullMQ workers | `src/workers/index.ts` | WhatsApp/Telegram/Discord message processing pipelines |
| Twitter worker | `src/workers/twitterWorker.ts` | Twitter/X message processing |
| Twitter sync | `src/workers/twitterSync.ts` | Twitter/X sync operations |
| DLQ monitor | `src/workers/dlq.ts` | Dead-letter queue monitoring |
| Webhook receiver | `src/routes/webhooks.ts` | Clerk user sync webhooks |
| Health checks | `src/index.ts:190-217` | `/health` (liveness), `/ready` (readiness) |
| Metrics endpoint | `src/index.ts:102-105` | Prometheus metrics at `/metrics` |
| Frontend main | `frontend/src/main.tsx` | React SPA entry point |
| Frontend app | `frontend/src/App.tsx` | Route definitions, auth context |
