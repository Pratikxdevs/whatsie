# Phase 8: Frontend-to-Backend API Wiring

## Goal
Wire all frontend pages to the real backend API. Eliminate mock data. Enable full end-to-end flow: create bot → scan QR → receive messages → view in conversations → send reply → bot responds via Evolution API.

## Context
- **Backend**: All routes query real Prisma DB. Full message pipeline exists (bot creation → QR → connection → inbound webhook → BullMQ worker → AI response → outbound via Evolution API adapter).
- **Frontend**: Only BotsPage calls `api.ts`. 14 other pages bypass it, using mock data directly. `api.ts` has 10 endpoint functions defined but never called by pages.
- **Infrastructure**: All services running — Postgres (7777), Redis (6379), Evolution API (8081), Backend (3000), Frontend (5173). Vite proxy is live.
- **Key gap**: `POST /api/conversations/:id/messages` only creates a DB record — does NOT send via Evolution API. Need to add actual send dispatch.
- **Instance naming**: Backend creates instances as `bot_{botIdNoDashes}` (workspaces.ts:71) but WhatsAppAdapter hardcodes `tenant_{tenantId}_bot` — must be unified.

## Success Criteria
- [ ] Dashboard shows real stats from `/api/analytics/dashboard-stats`
- [ ] BotsPage creates real Evolution API bots, shows QR code, connects
- [ ] LeadsPage loads real leads from `/api/leads`
- [ ] ConversationsPage loads real conversations and messages
- [ ] Sending a message in ConversationsPage dispatches via Evolution API
- [ ] Inbound WhatsApp messages appear in ConversationsPage (via polling or Socket.IO)
- [ ] AnalyticsPage loads real message volume and conversion funnel
- [ ] BillingPage loads real usage data
- [ ] Full E2E flow works: create bot → scan QR → receive WhatsApp message → see in UI → reply → bot responds

## Precondition
- `VITE_USE_MOCK` must NOT be set to `true` (proxy must be live)

## Tasks

### Task 0: Remove silent mock fallback from api.ts
**Files:** `frontend/src/services/api.ts`
- Remove all `catch { return mockXxxApi.xxx() }` fallback blocks
- Let errors propagate to pages so they show real error states
- Keep `VITE_USE_MOCK` flag for explicit mock mode, but when live mode is on, API failures must be visible
- This is required for the goal "eliminate mock data" to be verifiable

### Task 1: Wire DashboardPage to real API
**Files:** `frontend/src/pages/DashboardPage.tsx`, `frontend/src/components/dashboard/*.tsx`
- Replace hardcoded `StatsCard` values with `analyticsApi.getDashboardStats()`
- Replace inline chart data with `analyticsApi.getMessageVolume(7)`
- Replace inline pipeline data with `analyticsApi.getConversionFunnel()`
- Replace inline bot health data with `botApi.getWorkspaces()`
- Keep activity feed and platform breakdown as mock (no backend endpoints exist yet)
- Add loading states and error handling

### Task 2: Wire LeadsPage to real API
**Files:** `frontend/src/pages/LeadsPage.tsx`
- Replace `mockLeads` import with `leadApi.getLeads()` call on mount
- Wire `leadApi.updateLead()` to status/attribute changes
- Wire `leadApi.getLead()` for detail panel
- Add loading states and error handling
- Keep client-side filtering (search, status filter) — just operate on real data

### Task 3: Wire ConversationsPage to real API
**Files:** `frontend/src/pages/ConversationsPage.tsx`
- Replace inline mock data with `conversationApi.getConversations()` on mount
- Wire `conversationApi.getMessages(conversationId)` for message thread
- Wire `conversationApi.sendMessage(conversationId, content)` for send
- Add loading states and error handling

### Task 4: Fix send message to dispatch via Evolution API
**Files:** `src/routes/conversations.ts`, `src/adapters/whatsapp.adapter.ts`
- **Fix instanceName mismatch**: Update `WhatsAppAdapter.sendMessage()` to accept `sessionName` as parameter instead of hardcoding `tenant_{tenantId}_bot`
- Update `POST /api/conversations/:id/messages` to:
  1. Create the outbound message record (existing)
  2. Look up the conversation's bot via `Conversation → Lead → Bot` chain (relations exist in Prisma schema)
  3. Pass `bot.sessionName` to `WhatsAppAdapter.sendMessage()`
  4. Update message status to 'sent' on success
- This closes the loop: frontend send → backend → Evolution API → WhatsApp

### Task 5: Wire AnalyticsPage to real API
**Files:** `frontend/src/components/analytics/MessagingMetrics.tsx`, `LeadMetrics.tsx`
- Replace `mockMessageVolume` with `analyticsApi.getMessageVolume(30)`
- Replace `mockLeadPipeline` with `analyticsApi.getConversionFunnel()`
- Keep other charts (heatmap, messagesByBot, tokenUsage, costByModel) as mock — no backend endpoints exist
- Add loading states

### Task 6: Wire BillingPage to real API
**Files:** `frontend/src/pages/BillingPage.tsx`, `frontend/src/components/billing/*.tsx`
- Replace `mockUsageMeters` with `billingApi.getUsage()`
- Replace `mockInvoices` with `billingApi.getAiLogs()`
- Keep plans and usage-over-time chart as mock — no backend endpoints
- Add loading states

### Task 7: Add real-time message updates via Socket.IO
**Files:** `frontend/src/pages/ConversationsPage.tsx`, `src/routes/gateway.ts`, `src/workers/index.ts`
- Connect frontend to Socket.IO on conversations page
- Join tenant room on mount
- In worker `executeOutbound`: emit `new_message` event to tenant room after dispatching
- Gateway already broadcasts connection events; add message broadcast for new inbound messages after CRM upsert
- Update conversation list and message thread in real-time

### Task 8: Fix BotsPage connection status + start/stop
**Files:** `frontend/src/pages/BotsPage.tsx`, `frontend/src/services/api.ts`, `src/routes/workspaces.ts`
- **Fix endpoint path**: `api.ts` calls `/connection-status` but backend serves `/waha-status`. Update api.ts to call `/waha-status`
- Add `POST /api/workspaces/:id/start` and `POST /api/workspaces/:id/stop` endpoints (call EvoApi.connectInstance / EvoApi.logoutInstance)
- Wire BotsPage handleStartStop to call real API instead of local setTimeout
- Update bot status from API response

### Task 9: E2E integration test
**Files:** manual testing
- Start Docker services
- Create a bot via BotsPage
- Scan QR code with WhatsApp
- Send a WhatsApp message to the bot
- Verify message appears in ConversationsPage
- Send a reply from ConversationsPage
- Verify bot responds on WhatsApp
- Verify dashboard stats update
- Verify leads are created from WhatsApp contacts

## Dependencies
- Task 0 must complete first (removes mock fallback so errors are visible)
- Task 1-3, 5-6, 8 are independent (Wave 1, after Task 0)
- Task 4 depends on Task 3 (conversations need to work first)
- Task 7 depends on Task 3 (conversations page needs to exist)
- Task 9 depends on all others

## Out of Scope
- Campaigns, Contacts, Reports, Team, Integrations, Workflows, Settings pages — no backend endpoints exist
- New backend endpoints for missing data (activity feed, platform breakdown, lead timeline, etc.)
- Clerk auth re-enablement
- Multi-platform support beyond WhatsApp
