# Phase 11: Security, Bot States, Multi-User Platform

## Goal
Remove all hardcoded values, fix bot state machine so every button/state is correct, and make the platform multi-user ready with per-user API keys and per-user bots.

## Success Criteria
- [ ] Zero hardcoded secrets/API keys in source code
- [ ] Bot state machine correct: right button for every state, no glitches
- [ ] QR code appears reliably when clicking Start
- [ ] Connected bots show Configure button, not Start
- [ ] Error status persisted to backend (survives page refresh)
- [ ] Each user has their own API keys (platform + AI provider)
- [ ] Each user owns their bots (not shared across tenant)
- [ ] No hardcoded tenant IDs anywhere
- [ ] Real auth working (Clerk or JWT)

## Waves

---

### Wave 1: Remove Hardcoded Values + Security (Critical)

#### Task 1.1: Remove hardcoded secrets from source code
**Files:** `.env`, `docker-compose.yml`, `frontend/.env`, `platforms/evolution-api/.env`, `frontend/src/pages/LoginPage.tsx`

1. Remove demo credentials display from LoginPage.tsx (line 168: "Demo: admin@acmecorp.com / admin123")
2. In `.env`: replace weak secrets with placeholder comments:
   - `GROQ_API_KEY=your_groq_api_key_here`
   - `CLERK_SECRET_KEY=your_clerk_secret_key_here`
   - `JWT_SECRET=your_64_char_random_secret_here`
   - `EVOLUTION_API_KEY=your_random_api_key_here`
   - `EVOLUTION_API_SECRET=your_random_secret_here`
   - `GATEWAY_SECURITY_TOKEN=your_random_32_byte_token_here`
3. In `docker-compose.yml`: replace hardcoded passwords with env vars:
   - `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}`
   - `GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}`
   - Remove duplicate Evolution API key, reference `.env`
4. In `frontend/.env`: clear Clerk key, reference env var
5. In `platforms/evolution-api/.env`: replace hardcoded passwords with env vars

#### Task 1.2: Remove hardcoded tenant IDs
**Files:** `src/middleware/auth.ts`, `frontend/src/contexts/AuthContext.tsx`, `src/AiInteg/bridge.ts`, `src/AiInteg/test-ai.ts`

1. `auth.ts` line 16: Remove UUID fallback, fail fast if `DEFAULT_TENANT_ID` not set
2. `AuthContext.tsx` lines 23-29: Remove `DEV_USER` with hardcoded tenant. Accept `tenantId` as prop or from JWT
3. `bridge.ts` line 173: Use actual tenant ID from context, not hardcoded
4. `test-ai.ts` line 14: Remove hardcoded UUID, require env var

#### Task 1.3: Remove hardcoded localhost fallbacks
**Files:** `src/adapters/evolutionApi.ts`, `src/queue/setup.ts`, `src/routes/whatsapp.routes.ts`, `src/debug/server.ts`

1. Replace `|| 'http://localhost:8081'` with `|| (() => { throw new Error('EVOLUTION_API_URL not set'); })()` or just let the undefined propagate
2. Same for Redis URL and other localhost fallbacks
3. In production, fail fast if env vars are missing

---

### Wave 2: Fix Bot State Machine

#### Task 2.1: Add `error` status to backend
**Files:** `src/routes/workspaces.ts`, `prisma/schema.prisma`

1. Add `'error'` to the valid status values in workspaces routes
2. When Evolution API connection fails (POST /:id/start catches error), set bot status to 'error' in DB
3. When polling detects connection lost (connection.update webhook), set status to 'error'

#### Task 2.2: Fix BotCard button visibility per state
**Files:** `frontend/src/components/bots/BotCard.tsx`, `frontend/src/pages/BotsPage.tsx`

1. `BotCard`: Show different icons based on state:
   - `connected` → Show Stop button (amber square icon)
   - `disconnected` → Show Start button (green play icon)
   - `starting` → Show spinner icon (not clickable)
   - `error` → Show Restart button (yellow refresh icon)
2. `BotsPage mapWorkspaceToBot`: Don't map `pending_qr` to `starting` — add `pending_qr` as a distinct state
3. Fix the BotStatus type to include all valid states

#### Task 2.3: Fix QR code flow
**Files:** `frontend/src/pages/BotsPage.tsx`, `src/routes/workspaces.ts`

1. When clicking Start on a disconnected bot:
   - Immediately show QR modal with "loading" state
   - Backend POST /:id/start calls Evolution API connectInstance
   - If QR returned → update modal with QR image, status = 'pending_qr'
   - If already connected → close modal, show connected state
   - If error → show error state with retry button
2. Fix the QR modal flickering: debounce the status updates, don't close/reopen on rapid state changes
3. Ensure the QR modal stays open until user clicks Done or Cancel

#### Task 2.4: Fix Configure panel Start button
**Files:** `frontend/src/components/bots/BotDetailPanel.tsx`

1. When user clicks Start in the Configure panel, open the QR modal (same flow as card)
2. Pass the `onStart` handler from BotsPage to BotDetailPanel
3. The `onStart` in detail panel should trigger the same `handleStartStop` flow

#### Task 2.5: Fix restart flow race condition
**Files:** `frontend/src/pages/BotsPage.tsx`

1. Replace the `setTimeout(1000)` in restart with proper await:
   ```typescript
   await botApi.stopWorkspace(id);
   // Wait for actual disconnect
   let retries = 0;
   while (retries < 10) {
     const status = await botApi.getConnectionStatus(id);
     if (status.sessionInfo.status !== 'connected') break;
     await new Promise(r => setTimeout(r, 500));
     retries++;
   }
   await botApi.startWorkspace(id);
   ```

#### Task 2.6: Fix seed data statuses
**Files:** `prisma/seed.ts`

1. Replace `WORKING` → `connected`
2. Replace `STOPPED` → `disconnected`
3. Replace `SCAN_QR_CODE` → `pending_qr`
4. Replace `STARTING` → `starting`

---

### Wave 3: Multi-User Architecture

#### Task 3.1: Add userId to Bot model
**Files:** `prisma/schema.prisma`

1. Add `userId String?` field to Bot model
2. Add `user User? @relation(fields: [userId], references: [id])` relation
3. Add `@@index([userId])` index
4. Create Prisma migration

#### Task 3.2: Add per-user credential storage
**Files:** `prisma/schema.prisma`

1. Create new model:
```prisma
model UserCredential {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  provider  String   // 'groq', 'openai', 'evolution', 'telegram', etc.
  keyName   String   // display name like "My Groq Key"
  keyValue  String   // encrypted value
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, provider, keyName])
  @@index([userId])
}
```
2. Add `credentials UserCredential[]` relation to User model
3. Create Prisma migration

#### Task 3.3: Update bot creation to use user's credentials
**Files:** `src/routes/workspaces.ts`, `src/AiInteg/config.ts`

1. POST /api/workspaces: When creating a bot, if user provides `ai_engine` but no `api_key`, look up the user's default credential for that provider
2. `resolveAiConfig`: Add `userId` parameter. Priority: bot config → user credential → env var

#### Task 3.4: Update bot queries to filter by userId
**Files:** `src/routes/workspaces.ts`

1. GET /api/workspaces: Add optional `userId` query param. If user is not admin, only show their bots
2. POST /api/workspaces: Set `userId` from `req.user.id` when creating
3. All bot operations: verify bot belongs to user (or user is admin)

#### Task 3.5: Add credential management endpoints
**Files:** New file `src/routes/credentials.ts`

1. `GET /api/credentials` — List user's credentials (mask values)
2. `POST /api/credentials` — Add new credential (encrypt value)
3. `DELETE /api/credentials/:id` — Remove credential
4. `PUT /api/credentials/:id/default` — Set as default for provider

#### Task 3.6: Frontend credential management
**Files:** `frontend/src/pages/SettingsPage.tsx`, new component `frontend/src/components/settings/CredentialsTab.tsx`

1. Add "API Keys" tab to Settings page
2. Show list of user's credentials with provider, name, masked value
3. Add "Add Key" form: select provider, enter name, enter key
4. Set default key per provider

---

### Wave 4: Bot Lifecycle Hardening

#### Task 4.1: Webhook connection.update handler
**Files:** `src/routes/gateway.ts`

1. When `connection.update` event arrives with `state: 'close'`, update bot status to 'error' in DB
2. Emit Socket.IO event so frontend updates in real-time
3. This ensures status is accurate even if user isn't polling

#### Task 4.2: Backend status sync on startup
**Files:** `src/index.ts`

1. On server start, fetch all bots with status `starting` or `pending_qr`
2. For each, check Evolution API connection state
3. Update DB status to match actual state
4. This fixes the "page refresh shows wrong status" issue

#### Task 4.3: Frontend auto-refresh
**Files:** `frontend/src/pages/BotsPage.tsx`

1. Already has 30-second auto-refresh (from Phase 10)
2. Add Socket.IO listener for `bot_status_changed` events
3. When status changes (connected/disconnected/error), update bot in real-time without waiting for refresh

#### Task 4.4: Remove hardcoded platform in createInstance
**Files:** `src/adapters/evolutionApi.ts`

1. Line 188: `platform: 'whatsapp'` is hardcoded in the upsert create
2. Change to `platform: opts.platform || 'whatsapp'` so multi-platform bots work

---

## Dependencies

- Wave 1 is independent (security fixes)
- Wave 2 depends on Wave 1 (tenant IDs must be clean first)
- Wave 3 depends on Wave 2 (bot states must work before adding userId)
- Wave 4 depends on Wave 2 and 3

## Out of Scope
- Implementing Discord/Meta/Teams/Twitch/Twitter adapters (post-MVP)
- RAG engine, guardrails, content moderation
- Kubernetes deployment
- OpenTelemetry tracing
