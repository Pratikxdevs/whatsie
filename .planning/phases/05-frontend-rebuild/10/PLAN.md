# Phase 10: Bot Management + Conversations Production Fix

## Goal
Fix all BotsPage bugs (34 found), make ConversationsPage fully functional with real-time messages and media support, and remove all remaining mock data.

## Success Criteria
- [ ] Bot creation persists platform, API key, and AI engine to DB
- [ ] Connected bots show Configure/Edit button, not Start
- [ ] QR code flow works end-to-end without glitches
- [ ] Bulk delete actually calls the backend
- [ ] Detail panel buttons (Start/Stop/Restart/Save) all work
- [ ] ConversationsPage shows real messages from DB
- [ ] Sending a message from ConversationsPage sends to WhatsApp
- [ ] Media upload (image, audio, document) works from ConversationsPage
- [ ] Inbound media messages display correctly
- [ ] No mock data remains in either page
- [ ] Socket.IO works without reconnection on conversation select

## Tasks

### Task 1: Fix BotsPage creation flow (Critical)
**Files:** `frontend/src/pages/BotsPage.tsx`, `src/routes/workspaces.ts`

1. **BotsPage `onComplete` handler:** Pass all fields from AddBotModal to the backend:
   - `name`, `platform`, `system_prompt`, `ai_engine`, `apiKey` (as `api_key`)
2. **Backend POST `/api/workspaces`:** Accept and store `platform`, `api_key`, `ai_engine` in the bot config JSON
3. **Backend PUT `/api/workspaces/:id`:** Accept `ai_engine`, `api_key` (not just `groq_api_key`)
4. **`mapWorkspaceToBot`:** Read `platform` from `workspace.platform` instead of hardcoding `'whatsapp'`
5. After creation, immediately refresh the bot list (don't wait for 2-3 second delay)

### Task 2: Fix BotsPage connection flow
**Files:** `frontend/src/pages/BotsPage.tsx`, `frontend/src/components/bots/QRCodeModal.tsx`

1. **Guard against duplicate starts:** Check `bot.status !== 'starting'` before allowing start
2. **Clean up polling on unmount:** Store interval/timeout IDs in refs, clear on unmount
3. **QRCodeModal:** Add retry button on error state
4. **QRCodeModal:** Add confirmation before dismissing during active connection
5. **Status mapping:** Show "Connected" bots with Configure/Edit button instead of Start

### Task 3: Fix BotsPage bulk actions + detail panel
**Files:** `frontend/src/pages/BotsPage.tsx`, `frontend/src/components/bots/BotDetailPanel.tsx`

1. **Delete All:** Call `botApi.deleteWorkspace()` for each selected bot before removing from state
2. **Stop All:** Only stop bots that are connected (filter before iterating)
3. **Detail panel Start/Stop/Restart:** Wire to `botApi.startWorkspace()` / `botApi.stopWorkspace()`
4. **Detail panel Save:** Wire to `botApi.updateWorkspace()` with all config fields
5. **Error handling:** Add try/catch with user-visible error messages for all operations

### Task 4: Fix backend adapter config safety
**Files:** `src/adapters/evolutionApi.ts`

1. **`setSettings`:** Merge settings into existing config instead of replacing: `config: { ...existingConfig, ...settings }`
2. **`createInstance`:** Don't overwrite config on upsert — only set status
3. **`getConnectionState`:** Only write to DB if status actually changed
4. **`mapBotToWorkspace`:** Mask API keys in response (show `***` instead of plaintext)

### Task 5: Remove all mock data from BotsPage
**Files:** `frontend/src/pages/BotsPage.tsx`, `frontend/src/components/bots/BotDetailPanel.tsx`

1. **BotDetailPanel Analytics tab:** Fetch real data from `analyticsApi` or show "No analytics yet"
2. **BotDetailPanel Conversations tab:** Fetch real conversations filtered by bot
3. **BotDetailPanel Leads tab:** Fetch real leads filtered by bot
4. **BotsPage `activeLeads`/`messagesToday`:** Remove hardcoded zeros, show "—" until real data available

### Task 6: Fix ConversationsPage Socket.IO
**Files:** `frontend/src/pages/ConversationsPage.tsx`

1. **Move socket connection to a ref:** Don't depend on `selectedId` in the useEffect
2. **Single socket connection:** Connect once on mount, leave room/join room on conversation select
3. **Error handling:** Show error message when send fails (not just console.error)
4. **Fix TypingIndicator:** Change "AI is typing" to "Sending..." for human messages

### Task 7: Add media upload to ConversationsPage
**Files:** `frontend/src/components/conversations/MessageInput.tsx`, `src/routes/conversations.ts`, `src/AiInteg/endpoints.ts`

1. **Frontend:** Wire attachment buttons to file input (image, audio, document)
2. **Frontend:** Upload file to backend, get URL, send as media message
3. **Backend:** Add `POST /api/conversations/:id/media` endpoint that:
   - Accepts multipart form data
   - Uploads to a temp directory or base64 encodes
   - Calls `EvolutionApi.sendMedia()` with the file
   - Saves message with `messageType: 'image'|'audio'|'document'`
4. **Frontend MessageInput:** Show selected file preview before sending
5. **Frontend MessageBubble:** Load and display actual media (not placeholder)

### Task 8: Fix inbound media display
**Files:** `frontend/src/components/conversations/MessageBubble.tsx`, `src/normalizer/whatsapp.ts`

1. **Normalizer:** Handle `videoMessage`, `audioMessage`, `documentMessage`, `locationMessage`, `stickerMessage` in addition to `imageMessage`
2. **MessageBubble:** Render actual `<img>`, `<audio>`, `<a>` elements instead of placeholders
3. **Media URL extraction:** Extract media URLs from `message.imageMessage.url` etc. and store in message metadata
4. **Backend crmService:** Store media URL in message metadata for frontend to render

### Task 9: Backend endpoint cleanup
**Files:** `src/routes/conversations.ts`, `src/routes/workspaces.ts`

1. **Conversations POST send:** Return error status when Evolution API send fails (don't save with pending status silently)
2. **Conversations POST send:** Add `messageType` parameter support (text, image, audio, document)
3. **Workspaces connection-status:** Remove side effect (don't call `connectInstance` from a GET endpoint)
4. **Workspaces stop:** Return error status when Evolution API logout fails
5. **Workspaces delete:** Ensure DB record is deleted even if Evolution API call fails

### Task 10: E2E verification
**Files:** manual testing

1. Create bot → bot appears instantly in list
2. Click Connect → QR appears → scan → bot connects → Start button changes to Configure
3. Click Configure → edit system prompt → save → persists
4. Go to ConversationsPage → see real messages from WhatsApp
5. Send text message → appears on WhatsApp
6. Send image → appears on WhatsApp
7. Receive image on WhatsApp → shows in ConversationsPage
8. Bulk delete bots → both UI and DB cleaned
9. Debug dashboard at http://localhost:9222 shows all logs

## Dependencies
- Tasks 1-4 are backend fixes (can be parallelized)
- Tasks 5-6 are frontend fixes (can be parallelized, independent of 1-4)
- Task 7 depends on Task 9 (backend media endpoint needed)
- Task 8 depends on Task 7 (normalizer + display need to align)
- Task 10 depends on all others

## Out of Scope
- Campaigns, Contacts, Reports, Team, Integrations, Workflows pages
- Multi-platform bot support beyond WhatsApp
- Clerk auth re-enablement
