# Roadmap

**Project:** CrmV2 — Multi-Platform AI CRM Bot SaaS
**Created:** 2026-05-19
**Mode:** default

---

## Phase 1: Foundation Hardening
**Goal:** Secure, testable, properly isolated backend

**Why first:** The existing code has hardcoded secrets, unauthenticated routes, broken multi-tenancy, and zero tests. Nothing else can be built safely on this foundation.

**Scope:**
- Remove all hardcoded fallback secrets from source code
- Fix tenant middleware to reject unauthenticated requests (no silent skip)
- Remove hardcoded default tenant ID from workspaces and auth
- Apply auth middleware to all protected routes (workspaces, gateway)
- Implement JWT refresh token flow (1h access + 7d refresh)
- Add PostgreSQL RLS policies on all tables
- Set up test infrastructure (Vitest) and write tests for:
  - Auth middleware and JWT flow
  - Tenant isolation (cross-tenant access blocked)
  - WhatsApp webhook pipeline (gateway → normalize → queue → worker)
  - Intent classifier, rule engine, session manager, workflow engine
- Fix signature verification bypass (remove dev-mode skip)
- API key hashing on creation and verification

**Success Criteria:**
- [ ] Zero hardcoded secrets in src/
- [ ] Unauthenticated requests to protected routes return 401
- [ ] RLS policies active on all Prisma models
- [ ] JWT refresh tokens working
- [ ] Test suite passes with >80% coverage on services and middleware
- [ ] WhatsApp pipeline integration test passes end-to-end

**Plans:** 8 plans across 6 waves
- [x] P01 — Test Infrastructure Setup (Wave 1)
- [x] P02 — Remove Hardcoded Secrets (Wave 1)
- [x] P03 — Tenant & Auth Middleware Fixes (Wave 2)
- [x] P04 — Workspaces Auth Wiring (Wave 3)
- [x] P05 — JWT Refresh Tokens (Wave 4)
- [x] P06 — PostgreSQL Row-Level Security (Wave 4)
- [x] P07 — Middleware & Auth Tests (Wave 5)
- [x] P08 — Service & Integration Tests (Wave 6)

---

## Phase 2: Observability & Reliability
**Goal:** Production-grade monitoring, logging, and error recovery

**Why second:** Can't operate in production without visibility. Builds on Phase 1's test infrastructure.

**Scope:**
- Replace console.log wrapper with Pino structured JSON logging
- Add correlation ID (requestId) propagation through all layers
- PII redaction in logs (phone, email, API keys)
- Prometheus metrics: counters (messages_received, messages_sent, errors_total), histograms (http_request_duration, queue_processing_time), gauges (queue_depth)
- Health check endpoints (/health, /ready)
- Sentry error tracking integration
- DLQ replay mechanism (admin endpoint to retry failed jobs)
- Per-tenant daily quota with plan-based limits (free/pro/enterprise)
- Rate limiter expansion: per-platform token buckets
- Docker Compose: add Prometheus + Grafana services
- GitHub Actions CI pipeline: lint, typecheck, test, build

**Success Criteria:**
- [x] All logs are structured JSON with correlation IDs
- [x] Prometheus scraping /metrics endpoint
- [x] Sentry capturing unhandled exceptions
- [x] DLQ replay endpoint working
- [x] CI pipeline green on every PR
- [x] Grafana dashboard showing message throughput and queue depth

---

## Phase 3: Platform Expansion & Product UI
**Goal:** Telegram adapter, real dashboard, lead management, billing tracking

**Why third:** Core is now solid and observable. Can safely add platforms and build the product layer.

**Scope:**
- Telegram adapter: webhook handler, normalizer, queue, worker integration
- Unified response router (decouple send logic from worker)
- Frontend: lead management page (list, view, filter by status)
- Frontend: conversation inbox (message history per lead)
- Frontend: bot management improvements (configure, status monitoring)
- Frontend: analytics page (message volume chart, conversion funnel, AI usage)
- Billing usage tracking: messages and AI tokens logged per tenant
- Frontend: billing/usage dashboard for tenant admins
- Onboarding flow: tenant creation, first bot setup wizard

**Success Criteria:**
- [ ] Telegram bot can receive and reply to messages
- [ ] Response router dispatches to correct platform adapter
- [ ] Lead list page with filtering and status updates
- [ ] Conversation inbox showing message history
- [ ] Analytics charts rendering real data
- [ ] Billing usage table populated from message/AI events

**Plans:** 14 plans across 5 waves
- [ ] P01 — Telegram Adapter & Normalizer (Wave 1)
- [ ] P02 — Response Router (Wave 1)
- [ ] P03 — Billing Usage Recording (Wave 1)
- [ ] P04 — Lead Management API (Wave 2)
- [ ] P05 — Conversation & Message API (Wave 2)
- [ ] P06 — Analytics & Billing API (Wave 2)
- [ ] P07 — App Shell & Navigation (Wave 3)
- [ ] P08 — Leads Page (Wave 4)
- [ ] P09 — Conversations Page (Wave 4)
- [ ] P10 — Analytics Page (Wave 4)
- [ ] P11 — Billing Page (Wave 4)
- [ ] P12 — Onboarding Flow (Wave 5)
- [ ] P13 — Frontend-to-Backend Integration (Wave 5)
- [ ] P14 — Tests (Wave 5)

---

## Phase 4: Production Readiness & Growth
**Goal:** Deploy, scale, and prepare for multi-platform expansion

**Why last:** Product is functional and observable. Now harden for production traffic and lay groundwork for growth.

**Scope:**
- Discord adapter (discord.js WebSocket gateway)
- Meta adapter (FB Messenger + Instagram via Graph API)
- Kubernetes deployment manifests (API, Worker, Evolution API)
- Auto-scaling: HPA based on CPU + queue depth
- Database: PgBouncer connection pooling, partitioning strategy for messages table
- Redis: cluster mode configuration
- Backup strategy: automated PostgreSQL backups, Redis RDB + AOF
- Security hardening: CSP headers, rate limiting on login (5 attempts/15min), npm audit in CI
- GDPR compliance: data export, deletion, retention policy
- Stripe billing integration (webhooks, invoices, plan management)
- API documentation: Swagger/OpenAPI for all public endpoints

**Success Criteria:**
- [ ] Discord bot can receive and reply to messages
- [ ] Meta Messenger bot can receive and reply to messages
- [ ] Kubernetes manifests deploy successfully
- [ ] HPA scales workers based on queue depth
- [ ] Stripe webhooks processing subscription events
- [ ] API docs auto-generated and accessible at /docs

---

## Phase 6: Database Schema Perfection
**Goal:** Align Prisma schema with architecture document Layer 7 data models

**Why:** Current schema has missing fields, inconsistent enums, lacks critical indexes, and doesn't match the architecture spec. Blocks multi-platform expansion and production readiness.

**Scope:**
- Standardize Bot status enum (connected/disconnected/starting/error/pending_qr/suspended)
- Add missing fields: Lead.assignedTo, Message.sentAt/deliveredAt/readAt/attachments, Conversation.platformConversationId
- Fix Workflow/WorkflowExecution (add tenantId, status, trigger, startedAt/completedAt)
- Fix ApiKey (add permissions, lastUsedAt, expiresAt, createdBy)
- Replace Event model with AuditLog (action, resourceType, resourceId, ipAddress, userAgent)
- Add critical indexes: (tenantId, status), (conversationId, sentAt), (tenantId, platformUserId)
- Backfill existing data (sentAt, platformConversationId, bot statuses)
- Update all code references to use new fields/enums

**Success Criteria:**
- [ ] Prisma validate + generate + tsc all pass
- [ ] Migration applies cleanly on existing data
- [ ] Bot statuses standardized across codebase
- [ ] All messages have sentAt populated
- [ ] AuditLog replaces Event model
- [ ] All new indexes created
- [ ] All existing tests pass
- [ ] RLS policies updated for AuditLog

**Plans:** 19 plans across 4 waves
- [ ] P01 — Fix Bot Status Enum (Wave 1)
- [ ] P02 — Add Missing Fields to Lead (Wave 1)
- [ ] P03 — Add Missing Fields to Message (Wave 1)
- [ ] P04 — Add Missing Fields to Conversation (Wave 1)
- [ ] P05 — Fix Workflow Model (Wave 1)
- [ ] P06 — Fix WorkflowExecution Model (Wave 1)
- [ ] P07 — Fix ApiKey Model (Wave 1)
- [ ] P08 — Replace Event with AuditLog (Wave 1)
- [ ] P09 — Add Lead.assignedTo Relation (Wave 1)
- [ ] P10 — Update Bot Status References (Wave 2)
- [ ] P11 — Update crmService.ts for AuditLog (Wave 2)
- [ ] P12 — Update Message Creation (Wave 2)
- [ ] P13 — Update Conversation Creation (Wave 2)
- [ ] P14 — Update Workflow Queries (Wave 2)
- [ ] P15 — Generate Prisma Migration (Wave 3)
- [ ] P16 — Backfill Existing Data (Wave 3)
- [ ] P17 — Schema Verification (Wave 4)
- [ ] P18 — Data Integrity Checks (Wave 4)
- [ ] P19 — Index Verification (Wave 4)

---

## Phase 8: Frontend-to-Backend API Wiring
**Goal:** Wire all frontend pages to the real backend API. Eliminate mock data. Enable full E2E flow.

**Why now:** Backend is fully functional (all routes query Prisma DB, Evolution API pipeline works). Frontend pages bypass api.ts and use mock data directly. The product cannot be demoed or tested end-to-end until the frontend talks to the real backend.

**Scope:**
- Remove silent mock fallback from api.ts (errors must be visible)
- Wire DashboardPage to analyticsApi.getDashboardStats, getMessageVolume, getConversionFunnel
- Wire LeadsPage to leadApi.getLeads, updateLead, getLead
- Wire ConversationsPage to conversationApi.getConversations, getMessages, sendMessage
- Fix send message dispatch: POST /api/conversations/:id/messages must send via Evolution API
- Fix WhatsAppAdapter instanceName mismatch (hardcoded tenant_{tenantId}_bot vs actual bot_{botIdNoDashes})
- Fix api.ts endpoint path mismatch (/connection-status vs /waha-status)
- Wire AnalyticsPage to analyticsApi.getMessageVolume, getConversionFunnel
- Wire BillingPage to billingApi.getUsage, getAiLogs
- Add Socket.IO real-time message updates to ConversationsPage
- Add start/stop bot endpoints and wire BotsPage
- E2E integration test: create bot -> scan QR -> receive message -> reply -> bot responds

**Success Criteria:**
- [ ] Dashboard shows real stats from database
- [ ] BotsPage creates real Evolution API bots with QR code
- [ ] LeadsPage loads and updates real leads
- [ ] ConversationsPage loads real conversations and messages
- [ ] Sending a message dispatches via Evolution API to WhatsApp
- [ ] Inbound messages appear in real-time via Socket.IO
- [ ] AnalyticsPage shows real message volume and conversion data
- [ ] BillingPage shows real usage data
- [ ] Full E2E flow works end-to-end

**Plans:**
- [ ] P00 — Remove silent mock fallback from api.ts (prerequisite)
- [ ] P01 — Wire DashboardPage to real API
- [ ] P02 — Wire LeadsPage to real API
- [ ] P03 — Wire ConversationsPage to real API
- [ ] P04 — Fix send message dispatch via Evolution API
- [ ] P05 — Wire AnalyticsPage to real API
- [ ] P06 — Wire BillingPage to real API
- [ ] P07 — Add Socket.IO real-time message updates
- [ ] P08 — Fix BotsPage connection status + start/stop
- [ ] P09 — E2E integration test

---

## Phase 13: Telegram API Standalone Integration
**Goal:** Wire the standalone Telegram API (Hydrogram MTProto) into the CRM as a fully independent platform adapter — completely separate from Evolution API.

**Why now:** The Telegram API server (`platforms/telegram-api/`) already exists in Docker with auth, messaging, and SSE endpoints. The CRM has a Telegram gateway, normalizer, BullMQ queue, and worker. The missing piece is the bridge: a Node.js adapter + webhook callback.

**Scope:**
- Add webhook push support to the Telegram API `on_message` handler
- Add session status endpoint to the Telegram API
- Create Node.js Telegram adapter (HTTP client to Hydrogram API)
- Update ResponseRouter to dispatch via Hydrogram adapter
- Update workspace routes for Telegram platform (create/start/stop/delete)
- Startup status sync for Telegram bots
- Docker Compose and env config
- E2E connection verification

**Success Criteria:**
- [ ] Telegram API health endpoint responds on port 8082
- [ ] Bot created via API connects and receives messages
- [ ] Inbound Telegram messages flow through the CRM pipeline (gateway -> worker -> DB)
- [ ] Outbound responses dispatch via Hydrogram API
- [ ] Bot status syncs on startup and on status check
- [ ] Telegram and WhatsApp bots are completely independent code paths
- [ ] All existing tests pass

**Plans:** 9 plans across 5 waves
- [ ] P01 — Hydrogram API webhook push + status endpoint (Wave 1)
- [ ] P02 — Node.js Telegram adapter HTTP client (Wave 2)
- [ ] P03 — ResponseRouter Hydrogram dispatch (Wave 3)
- [ ] P04 — Workspace routes Telegram branching (Wave 3)
- [ ] P05 — Startup status sync for Telegram (Wave 3)
- [ ] P06 — Docker Compose verification (Wave 4)
- [ ] P07 — Environment config (Wave 4)
- [ ] P08 — E2E connection verification (Wave 5)

---

## Phase 14: Full Telegram UI Integration + Universal Logger
**Goal:** Wire Telegram fully into the frontend bot management UI — every button functional. Add comprehensive logging to 9222 debug server.

**Why now:** Phase 13 wired the backend adapter. The frontend still assumes WhatsApp-only flows (QR codes, WhatsApp text). The debug server on 9222 exists but doesn't log system events (auth, messages, API calls).

**Scope:**
- AddBotModal: Telegram bot_token input + connect flow (no QR)
- QRCodeModal: Platform-aware messaging
- BotsPage: Telegram start/stop awareness
- Debug server: Telegram health check + universal request logging
- Telegram API: Log all events to 9222 debug server
- Remove hardcoded "WhatsApp" text from all bot components

**Success Criteria:**
- [x] Can create Telegram bot from UI with bot_token
- [x] All start/stop/restart/delete buttons work for Telegram bots
- [x] QRCodeModal shows correct messaging for Telegram (no QR)
- [x] 9222 debug server shows all HTTP requests, auth events, message sends
- [x] 9222 health check includes Telegram API
- [x] Telegram API logs auth/message events to 9222

---

## Phase 11: Security, Bot States, Multi-User Platform
**Goal:** Remove all hardcoded values, fix bot state machine, make platform multi-user ready.

**Why now:** Hardcoded secrets are security risks. Bot states are broken (wrong buttons, QR glitches). Platform needs per-user API keys for production use.

**Scope:**
- Remove all hardcoded secrets, tenant IDs, localhost fallbacks
- Fix bot state machine: correct buttons for every state, reliable QR flow
- Add userId to Bot model for user-owned bots
- Add per-user credential storage (platform + AI keys)
- Backend status sync on startup
- Webhook connection.update handler for real-time status

**Plans:**
- [ ] P00 — Remove hardcoded secrets + tenant IDs (Wave 1)
- [ ] P01 — Add error status to backend + fix seed data (Wave 2)
- [ ] P02 — Fix BotCard buttons + status type (Wave 2)
- [ ] P03 — Fix QR code flow + modal (Wave 2)
- [ ] P04 — Fix Configure panel + restart race (Wave 2)
- [ ] P05 — Add userId to Bot + credential storage (Wave 3)
- [ ] P06 — Multi-user bot queries + credential endpoints (Wave 3)
- [ ] P07 — Frontend credential management UI (Wave 3)
- [ ] P08 — Webhook handler + startup sync + auto-refresh (Wave 4)

---

## Phase 16: Discord Platform Integration
**Goal:** Full Discord adapter integration — discord.js WebSocket gateway, adapter, normalizer, queue, worker, workspace routes, ResponseRouter dispatch, and frontend wiring. Mirror the Telegram integration pattern (bot token auth, in-process client lifecycle, platform-aware UI).

**Why now:** WhatsApp and Telegram are fully wired. Discord is the next platform in ARCHITECTURE.txt and the frontend already has `'discord'` in the Platform union with `supported: false`. Discord uses discord.js in-process (no Docker container), making it simpler to integrate than WhatsApp/Evolution API.

**Scope:**
- Install discord.js and register it as a dependency
- Create Discord adapter (`src/adapters/discordAdapter.ts`) — manages Client instances, connect/disconnect lifecycle, message send/receive
- Create Discord normalizer (`src/normalizer/discord.ts`) — maps Discord message events to NormalizedMessage
- Add `discord-messages` BullMQ queue and worker integration
- Update ResponseRouter to dispatch via Discord adapter
- Update workspace routes for Discord platform (create/start/stop/delete/connection-status)
- Startup status sync for Discord bots (reconnect on server restart)
- Rate limiting: 5 req/sec per bot, 50 msgs/min per channel (per ARCHITECTURE.txt Layer 8)
- Frontend: set `discord.supported = true`, add Discord bot_token input to AddBotModal
- Frontend: platform-aware status, start/stop/delete for Discord bots
- Debug server: Discord health check integration
- Signature verification (Ed25519) for webhook endpoint (future-proofing)
- Bot auto-generation flow: OAuth2 user auth -> internal bot creation -> store token -> create DB record (like Telegram userbot flow)
- E2E connection verification

**Success Criteria:**
- [ ] Discord bot created via UI with bot token connects and receives messages
- [ ] Inbound Discord messages flow through CRM pipeline (gateway -> worker -> DB)
- [ ] Outbound responses dispatch via Discord adapter
- [ ] Bot status syncs on startup and on status check
- [ ] Start/stop/restart/delete work for Discord bots
- [ ] Rate limiter enforces Discord platform limits
- [ ] Discord and other platforms are completely independent code paths
- [ ] All existing tests pass

**Plans:** 7/7 plans complete
- [ ] P01 — Discord Adapter + Client Lifecycle (Wave 1)
- [ ] P02 — Discord Normalizer + Queue (Wave 1)
- [ ] P03 — ResponseRouter + Workspace Routes + Rate Limiting (Wave 2)
- [ ] P04 — Startup Sync + Debug Health (Wave 2)
- [ ] P05 — Frontend Wiring (Wave 3)
- [ ] P06 — Bot Auto-Generation OAuth2 Flow (Wave 4)
- [ ] P07 — Tests + E2E Verification (Wave 5)

---

## Phase 17: Twitter/X Platform Integration
**Goal:** Wire a standalone Twitter/X platform layer into the CRM using `twikit` (Python) — fully isolated from other platforms, integrated into shared infrastructure. Python FastAPI service container (like Hydrogram/Telegram) with HTTP bridge to Node.js CRM. Supports DM sending, built-in rate limits, username+password auth.

**Why now:** WhatsApp and Telegram are fully wired. Discord integration is in progress (Phase 16). Twitter/X is the next platform in ARCHITECTURE.txt. `twikit` (4.4k GitHub stars, Python async) provides full tweet/DM/user/media operations including DM sending — unlike `rettiwt-api` which was read-only for DMs.

**Scope:**
- Create Python FastAPI service at `platforms/twitter-api/` using `twikit`
- Create Node.js Twitter adapter (HTTP client to Python service)
- Create Twitter normalizer (DM/tweet/notifications → NormalizedMessage)
- Add `twitter-messages` and `twitter-sync` BullMQ queues
- Create Twitter message worker (same 13-step pipeline as other platforms)
- Create Twitter sync workers — polling DMs, timeline, notifications on configurable intervals
- Rate limiting: 50 DMs/day, 300 tweets/3hrs (per ARCHITECTURE.txt Layer 8)
- ResponseRouter dispatch for Twitter (DM + tweet reply — both supported)
- Workspace routes for Twitter platform (create/start/stop/delete/status)
- Sync lifecycle management (start/stop sync per account, reconnect on restart)
- Startup status sync for Twitter bots
- Docker Compose config for `twitter-api` service container
- Frontend: set `twitter.supported = true`, add username+email+password inputs
- Frontend: sync status display, rate limit awareness
- Prometheus metrics for Twitter sync and API calls
- Debug server Twitter health check
- DLQ monitor for Twitter queues
- E2E verification

**Success Criteria:**
- [x] Twitter Python service starts in Docker container on port 8083
- [x] Twitter bot created via UI with username+email+password connects and shows `connected`
- [x] Session cookies persist across container restarts
- [x] Inbound DMs flow through CRM pipeline (sync → normalize → worker → DB)
- [x] Inbound mentions/replies flow through CRM pipeline
- [x] Outbound DMs dispatch via twikit (Python service)
- [x] Outbound tweet replies dispatch via twikit (Python service)
- [x] Bot status syncs on startup and on status check
- [x] Start/stop/delete work for Twitter bots
- [x] Rate limiter enforces Twitter platform limits (50 DMs/day, 300 tweets/3hrs)
- [x] Sync workers poll on configurable intervals with cursor tracking
- [x] Rate limit awareness pauses sync before hitting limits
- [x] Twitter and other platforms are completely independent code paths
- [x] Reconnect after server restart resumes all Twitter sync
- [x] All existing tests pass (no regressions)

**Plans:** 15 plans across 5 waves — ALL COMPLETE
- [x] P01 — Create Twitter Python Service (FastAPI + twikit) (Wave 1)
- [x] P02 — Node.js Twitter Adapter (HTTP Client to Python Service) (Wave 1)
- [x] P03 — Twitter Normalizer (Wave 1)
- [x] P04 — Twitter Queue + Rate Limiter + Error Codes (Wave 1)
- [x] P05 — Twitter Message Worker (Wave 2)
- [x] P06 — Twitter Sync Workers (Polling) (Wave 2)
- [x] P07 — Twitter ResponseRouter Integration (Wave 2)
- [x] P08 — Twitter Workspace Routes (Wave 3)
- [x] P09 — Twitter Sync Lifecycle Management (Wave 3)
- [x] P10 — Startup Status Sync + Docker Compose + Health (Wave 3)
- [x] P11 — Frontend Twitter Support (Wave 4)
- [x] P12 — Twitter Sync Status UI (Wave 4)
- [x] P13 — Twitter Metrics + Debug Server + DLQ (Wave 5)
- [x] P14 — Twitter Scheduled Posting (Wave 5) [OPTIONAL/STRETCH] — SKIPPED
- [x] P15 — E2E Verification + Test Suite (Wave 5)

---

## Phase 21: /bots Page Bug Fixes
**Goal:** Fix all 33 bugs from comprehensive live testing + code audit of the /bots page.

**Why now:** The /bots page has critical crash bugs (scanned status, null config), broken core flows (PhoneInput country reversion, model selector no-op), and dozens of UX issues. Must be fixed before any new platform work.

**Scope:**
- Fix BotConnectionStatus crash on scanned status
- Fix PhoneInput country reversion and formatting bugs
- Fix model selector no-op in BotConfigForm
- Fix API key clearing after save
- Fix all input validation (maxLength, min/max, show/hide toggles)
- Fix UX issues (dropdown outside click, mobile buttons, form reset, validation feedback)
- Fix state management (per-bot polling, stale closure, bulk delete rollback, modal abort)
- Fix detail panel (restart in error state)
- Fix inconsistencies (field order, temperature labels)

**Success Criteria:**
- [ ] No runtime crashes for any BotStatus value
- [ ] PhoneInput preserves selected country across re-renders
- [ ] Model selector saves selected model
- [ ] API key shows "saved" status after save
- [ ] All inputs have proper validation with user-visible error messages
- [ ] Mobile action buttons are always visible
- [ ] Cancel resets form state
- [ ] Polling is per-bot, not global
- [ ] Bulk delete rolls back on failure
- [ ] Restart works in error state

**Plans:** 1 plan (this document), 8 waves
- [ ] Wave 1 — Crash Fixes (3 bugs)
- [ ] Wave 2 — PhoneInput Overhaul (3 bugs)
- [ ] Wave 3 — Core Form Fixes (4 bugs)
- [ ] Wave 4 — Input Validation (3 bugs)
- [ ] Wave 5 — UX Fixes (8 bugs)
- [ ] Wave 6 — State Management (5 bugs)
- [ ] Wave 7 — Detail Panel (1 bug)
- [ ] Wave 8 — Inconsistencies (1 bug)

---

## Phase 22: Telegram Auth & Scraper Flow Fix
**Goal:** Fix the broken Telegram phone authentication flow end-to-end.

**Why now:** The entire Telegram phone auth flow is broken — PhoneInput adds leading zero, scraper times out due to 15s frontend timeout, OTP verification fails silently, and scraper logs don't appear on the debug page.

**Scope:**
- Fix PhoneInput display (no leading zero, no reformatting on country change)
- Fix PhoneInput re-mount resets
- Fix scraper API timeout (15s → 120s)
- Fix scraper error messages (specific, actionable)
- Fix scraper logging to debug server

**Success Criteria:**
- [ ] Phone number shows exactly what user typed, no leading zero
- [ ] Country selection doesn't reformat existing input
- [ ] Scraper OTP verification waits up to 120s
- [ ] Clear error messages for each failure mode
- [ ] Scraper logs visible on debug page

**Plans:** 1 plan, 4 fixes
- [ ] Fix 1 — PhoneInput display value
- [ ] Fix 2 — Scraper timeout
- [ ] Fix 3 — Error messages
- [ ] Fix 4 — Logging

---

## Phase 23: WhatsApp-Only Ship Readiness
**Goal:** Remove all non-WhatsApp platforms from codebase. Make WhatsApp integration production-ready with working connect, fetch, AI, and callback. Change git repo.

**Why now:** The product needs to ship with WhatsApp only. Multi-platform support adds complexity that blocks shipping. WhatsApp is the primary channel and must work end-to-end reliably.

**Scope:**
- Remove Telegram adapter, normalizer, workers, routes, Docker services, platform source
- Remove Discord adapter, normalizer, workers, routes, startup sync
- Remove Twitter adapter, normalizer, workers, routes, Docker services, platform source
- Remove all platform selector UI (auto-select WhatsApp)
- Simplify frontend to WhatsApp-only flows (no platform selection, no Telegram OTP, no Discord OAuth, no Twitter login)
- Fix WhatsApp connect flow (QR code generation and scanning)
- Fix WhatsApp message fetch (inbound webhook → normalize → queue → worker)
- Fix WhatsApp AI integration (worker calls AI service correctly)
- Fix WhatsApp callback (outbound response via Evolution API)
- Remove platform-specific env vars, rate limiters, metrics
- Clean up docker-compose.yml (remove non-WhatsApp services)
- Change git remote to new repository
- E2E verification: create bot → scan QR → receive message → AI processes → reply sent

**Success Criteria:**
- [ ] Zero non-WhatsApp platform code in src/ (no telegram, discord, twitter adapters/normalizers/workers)
- [ ] Frontend has no platform selection UI (WhatsApp is the only option)
- [ ] WhatsApp bot creation flow works: QR code generated, scanned, connected
- [ ] Inbound WhatsApp messages flow through pipeline: webhook → normalize → queue → worker → AI → response
- [ ] Outbound WhatsApp messages send via Evolution API
- [ ] AI integration works: worker calls AI service, gets response, sends reply
- [ ] Callback/webhook flow works end-to-end
- [ ] Docker compose only has WhatsApp-related services
- [ ] All env vars cleaned up (no TELEGRAM_*, DISCORD_*, TWITTER_*)
- [ ] Git repo changed to new remote
- [ ] All tests pass
- [ ] E2E flow works: create bot → scan QR → receive message → AI responds → message sent

**Plans:** TBD (to be determined during planning)

---

## Phase 25: Whatsie AI Engine Integration
**Goal:** Eliminate hardcoded models and pricing with dynamic OpenRouter metadata and live brand assets.

**Why:** Whatsie needs to dynamically scale its supported AI models and present clear, up-to-date pricing to users without manually updating codebase maps when providers change.

**Scope:**
- Implement dynamic OpenRouter verification endpoint `POST /api/ai/verify` to validate keys and fetch/normalize models in parallel.
- Create `/frontend/src/lib/brand-resolver.ts` to map provider slugs to official domains for logo CDN integration.
- Implement LocalStorage `whatsie_vault` key vault for client credentials with auto-completing dropdowns and status health cards.
- Design searchable Radix Command model selector grouped by provider with interactive spec sheet drawer.
- Add robust rate limiting (429) cool-down visual timers and zero-balance wallet warnings.

**Success Criteria:**
- [ ] Backend endpoint `/api/ai/verify` successfully returns credit balance and normalized model lists.
- [ ] Brand resolver returns img.logo.dev domains with icon.horse favicon fallbacks.
- [ ] Frontend saves validated credentials in key vault and renders selection lists.
- [ ] Command Selector groups and filters models dynamically.
- [ ] Zero-balance and rate limit errors show correct UX feedback without silent failures.

**Plans:** TBD

---

## Phase 26: Conversations Page & Multi-Bot Chat Rebuild
**Goal:** Completely decouple conversation fetching from internal CRM DB logic, enabling real-time aggregation across all connected bots simultaneously.

**Why:** The previous architecture queried `prisma.bot.findFirst`, forcing all texts and media uploads to route to a single bot, destroying multi-tenant capabilities.

**Scope:**
- Backend `/chats` route iterates across all bots to aggregate a unified inbox.
- Inject `sessionName` into all chats so frontend can route payloads precisely.
- Rebuild media uploads and message routing to target the exact Evolution API session.

**Success Criteria:**
- [x] Multi-bot chat fetching works instantly.
- [x] Frontend successfully displays visual indicator pills for bot names.
- [x] Media uploads strictly hit Evolution API instance without crashing the DB.

---

## Phase 27: Zero-Trust Production Architecture Mega-Refactor
**Goal:** Strip out all developmental bypasses, completely secure cryptographic keys, harden the tenant perimeter, decouple the AI integration to a single OpenRouter factory, and implement the high-end Bento Grid UI.

**Why:** The codebase is littered with `DEV_AUTH_BYPASS` and legacy platform endpoints that present critical security liabilities for a production deployment.

**Scope:**
- Security: Restore Clerk JWT verification, implement Tenant DB isolation, and AES-256-GCM encryption.
- AI: Build dynamic OpenRouter factory with localStorage obfuscation.
- UI: Bento grid scaling, Shadcn settings slide-overs, and maximum density UI mapping.
- Debt: Ruthless deletion of Telegram/Slack/Discord logic and all `as any` casting.

**Success Criteria:**
- [ ] Backend drops all connections lacking Clerk JWTs or `tenantId`.
- [ ] API keys encrypted at rest.
- [ ] All UI matches the requested Bento Grid layout.

**Plans:** See `.planning/phases/27-zero-trust-architecture/PLAN.md`
