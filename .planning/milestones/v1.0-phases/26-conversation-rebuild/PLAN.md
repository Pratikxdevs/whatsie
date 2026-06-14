# Phase 26: Conversations Page & Multi-Bot Chat Rebuild

## Goal
Rebuild the conversation fetching logic so the `ConversationsPage` correctly aggregates and displays chats from **all connected bots** under the tenant. Update the backend Evolution API proxy routes to require specific `sessionName` routing, allowing users to fetch exact DP/numbers per bot and reliably upload/send media.

## Context
- **Current Limitation:** `src/routes/whatsapp-chat.ts` calls `prisma.bot.findFirst()` to find a session name. If a workspace has 3 bots, only the conversations of the first bot are fetched. Subsequent operations (send, block, read) implicitly target this single bot.
- **Requirement:** The UI must display every active conversation across all bots in one unified inbox. Operations inside the chat must be routed back to the exact bot instance that owns the conversation. Media uploads must be fully supported.

## Success Criteria
- [ ] Backend `/chats` route queries all connected bots in the DB and aggregates their conversations from Evolution API, tagging each with its `sessionName`.
- [ ] Backend routes (`/messages/:jid`, `/profile/:jid`, `/read`, `/typing`, etc.) accept a `sessionName` query parameter or body payload to target the correct bot instance.
- [ ] Frontend `ChatItem` interface updated to track `sessionName`.
- [ ] Frontend API calls correctly pass `sessionName` when opening a chat or sending a message.
- [ ] Media upload endpoint (`/media` or `/send`) handles base64 or multipart file forwarding to Evolution API `sendMedia()`.
- [ ] DP (profile picture), phone numbers, and unread counts render perfectly for all bots in dev-mode bypass.

## Tasks

### Task 1: Backend Chat Aggregation (`src/routes/whatsapp-chat.ts`)
- Refactor the `findSessionName` logic. Instead of finding the first bot, query `prisma.bot.findMany({ where: { tenantId, platform: 'whatsapp' } })`.
- Update `GET /chats`: Loop through all found bots, call `EvoApi.findChats(bot.sessionName)`. Inject the `sessionName` into each returned chat object so the frontend knows which bot owns it. Aggregate and return the unified array.

### Task 2: Targeted Bot Operations (`whatsapp-chat.ts`)
- Update `GET /contacts`: Iterate and aggregate contacts across all bots.
- Update `GET /messages/:jid`: Require `sessionName` in `req.query`. Pass it to `EvoApi.findMessages`.
- Update `GET /profile/:jid`: Require `sessionName` in `req.query`.
- Update POST endpoints (`/read`, `/typing`, `/block`, `/archive`, `DELETE /message`): Extract `sessionName` from `req.body` and route the Evolution API call accordingly.

### Task 3: Implement Media Uploads
- Create or verify a `POST /media` or `POST /send-media` endpoint in `whatsapp-chat.ts`.
- Accept payload: `{ sessionName, jid, base64, fileName, mimeType, messageType }`.
- Route the request to Evolution API's media sending endpoint using the specified `sessionName`.

### Task 4: Frontend API Interface Wiring (`frontend/src/services/api.ts`)
- Update `conversationApi.getChatMessages`: Pass `sessionName` as a query param.
- Update `conversationApi.getProfilePicture`: Pass `sessionName` as a query param.
- Update `conversationApi.sendMedia`: Include `sessionName` and target `jid` in the payload.
- Update `conversationApi` state modifiers (mark read, typing, archive) to include `sessionName`.

### Task 5: UI State Management (`frontend/src/pages/ConversationsPage.tsx`)
- Update `ChatItem` and `ChatMessage` interfaces in the frontend to include `sessionName: string`.
- When a user selects a chat in the sidebar, store the active `sessionName` in the component state (`selectedSessionName`).
- Update the `MessageInput` component to trigger media uploads with the active `selectedSessionName`.
- Ensure Profile Picture (DP) fetching correctly references the specific bot's session.

## Dependencies
- Tasks 1 & 2 must be completed simultaneously so the backend doesn't crash existing frontend queries during the transition.
- Dev-mode bypass (`DEV_AUTH_BYPASS`) should remain active for seamless local testing.
