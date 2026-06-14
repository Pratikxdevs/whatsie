# Research: Conversations Page Multi-Bot Aggregation

## Findings

### 1. The Core Bug: JID vs UUID Confusion
The `ConversationsPage` is currently completely broken because of a mismatch between the frontend state and the backend routes:
- **Fetching:** The frontend uses `conversationApi.getChats()`, which hits `/api/whatsapp/chats`. This bypasses the internal CRM database and fetches live WhatsApp chats directly from Evolution API. These chats are identified by a WhatsApp JID (e.g., `123456789@s.whatsapp.net`).
- **Sending:** When a user types a message and clicks send, the frontend calls `conversationApi.sendMessage(selectedJid, text)`. This hits `POST /api/conversations/:id/messages`.
- **The Crash:** The backend route `conversations.ts` expects `:id` to be a valid PostgreSQL UUID from the `Conversation` table. It looks up `prisma.conversation.findFirst({ where: { id: "123456789@s.whatsapp.net" } })`, fails to find it, and returns `404 Conversation not found` or crashes.

### 2. The Single Bot Hardcoding
Both `/api/whatsapp/chats` and the media dispatch in `conversations.ts` contain the following hardcoded logic:
```typescript
const bot = await prisma.bot.findFirst({
  where: { tenantId, status: 'connected', platform: 'whatsapp' },
});
```
This forces the system to only ever fetch chats or send media for the **very first bot** created in the database. All other connected bots are ignored, making multi-bot scaling impossible.

### 3. Media Upload Routing
The Evolution API adapter exposes `sendMedia(instanceName, opts)`. The `SendMediaOptions` requires:
- `number` (JID)
- `mediatype` ('image' | 'video' | 'audio' | 'document')
- `mimetype`
- `media` (Base64 string or URL)
Currently, the frontend's `api.sendMedia` route mistakenly points to `/api/conversations/:id/media` (the internal CRM DB route) instead of a direct Evolution API proxy route. Like sending texts, this fails because of the JID vs UUID mismatch.

### 4. Required Data Shapes for Multi-Bot Support
If we are bypassing the CRM database to fetch live conversations directly from the bots (which matches your requirement: *"We only fetch those conversations in which our bot is involved"*), we must:
1. Fetch all bots via `prisma.bot.findMany`.
2. Map over each bot and call `EvoApi.findChats(bot.sessionName)`.
3. Inject the `sessionName` property into the returned chat objects.
4. Pass that `sessionName` property back from the frontend on every request (fetching messages, sending texts, sending media, typing indicators) so the backend knows *which* Evolution API instance to target.

## Conclusion
To make the Conversations Page function perfectly in dev-mode for all bots:
1. We must create dedicated `/whatsapp/send` and `/whatsapp/media` endpoints in `whatsapp-chat.ts` that accept a `sessionName` and `jid`, entirely bypassing the broken CRM DB lookup.
2. The UI's `api.ts` file must be re-wired to point `sendMessage` and `sendMedia` to these new WhatsApp-specific endpoints.
3. The frontend interfaces (`ChatItem`, `ChatMessage`) must track `sessionName`.
