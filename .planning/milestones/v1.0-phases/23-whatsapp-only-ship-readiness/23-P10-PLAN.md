---
plan_id: P10
phase: 23
objective: Fix WhatsApp callback/outbound (Evolution API message sending)
wave: 3
depends_on: [P09]
files_modified:
  - src/router/index.ts
  - src/adapters/whatsapp.adapter.ts
  - src/adapters/evolutionApi.ts
  - src/rateLimiter/index.ts
requirements: [P09]
autonomous: true
---

# Plan P10: Fix WhatsApp Callback/Outbound

## Tasks

### Task 1: Simplify ResponseRouter to WhatsApp-only
**read_first:**
- `src/router/index.ts`

**acceptance_criteria:**
- `ResponseRouter.dispatch` only handles WhatsApp platform
- No switch/case for telegram, discord, twitter
- Imports only WhatsAppAdapter

**action:**
- In `src/router/index.ts`:
  - Remove `import { TelegramAdapter } from '../adapters/telegram.adapter';` (line 14)
  - Remove `import * as DiscordAdapter from '../adapters/discordAdapter';` (line 15)
  - Remove `import { TwitterAdapter } from '../adapters/twitter.adapter';` (line 16)
  - Remove `import { sendWithRateLimit } from '../rateLimiter';` (line 17) — no longer needed (WhatsAppAdapter handles rate limiting)
  - Simplify `dispatch` method:
    - Remove the `switch (msg.platform)` block
    - Replace with direct WhatsApp logic:
      ```typescript
      // Find connected WhatsApp bot
      const bot = await prisma.bot.findFirst({
        where: { tenantId: msg.tenantId, status: 'connected', platform: 'whatsapp' },
      });
      if (!bot?.sessionName) {
        throw new Error(`No connected WhatsApp bot found for tenant ${msg.tenantId}`);
      }
      await WhatsAppAdapter.sendMessage(bot.sessionName, msg.userId, responseText);
      messagesSentTotal.inc({ platform: 'whatsapp', tenantId: msg.tenantId });
      ```
  - Keep steps 1 (session push), 2 (persist outbound), 4 (delivery status)

### Task 2: Verify WhatsAppAdapter.sendMessage works
**read_first:**
- `src/adapters/whatsapp.adapter.ts`

**acceptance_criteria:**
- `WhatsAppAdapter.sendMessage(sessionName, remoteJid, text)` sends via Evolution API
- Rate limiting is applied (1 msg/sec)
- Message is sent with delay for natural feel

**action:**
- Verify `WhatsAppAdapter.sendMessage` in `src/adapters/whatsapp.adapter.ts`:
  - Calls `sendWithRateLimit('whatsapp', ...)` for rate limiting
  - Inside rate limiter, calls `sendText(sessionName, { number: remoteJid, text, delay: 1200 })`
  - `sendText` is imported from `./evolutionApi`

### Task 3: Verify Evolution API sendText works
**read_first:**
- `src/adapters/evolutionApi.ts` lines 332-335 (sendText)

**acceptance_criteria:**
- `sendText(instanceName, opts)` calls `POST /message/sendText/{instanceName}`
- Payload includes `number`, `text`, `delay`

**action:**
- Verify `sendText` in `src/adapters/evolutionApi.ts`:
  - Calls `evo.post('/message/sendText/${instanceName}', opts)`
  - `opts` contains `number` (remote JID), `text` (message body), `delay` (typing simulation)

### Task 4: Verify rate limiter for WhatsApp
**read_first:**
- `src/rateLimiter/index.ts`

**acceptance_criteria:**
- `whatsappLimiter` enforces 1 message per second (1000ms)
- `sendWithRateLimit('whatsapp', fn)` works correctly

**action:**
- Verify `whatsappLimiter` in `src/rateLimiter/index.ts`:
  - `new RedisRateLimiter('whatsapp', 1000)`
  - Uses Redis INCR for distributed rate limiting
  - `limiters` object has `whatsapp` key

### Task 5: Verify outbound message persistence
**read_first:**
- `src/router/index.ts` lines 38-47 (persist outbound)

**acceptance_criteria:**
- Outbound message is saved to PostgreSQL with `direction: 'out'`
- Message has `tenantId`, `conversationId`, `content`, `messageType`
- Delivery status is updated after send

**action:**
- Verify `ResponseRouter.dispatch`:
  - Creates message: `prisma.message.create({ data: { tenantId, conversationId, direction: 'out', content: responseText, messageType: 'text' } })`
  - After send: `prisma.message.update({ where: { id: outboundMessage.id }, data: { metadata: { systemDispatched: true, deliveredAt: ... } } })`

### Task 6: Verify session context window update
**read_first:**
- `src/router/index.ts` lines 32-35 (push assistant reply)
- `src/services/sessionManager.ts`

**acceptance_criteria:**
- Assistant reply is pushed to session context window
- `SessionManager.pushMessage(tenantId, userId, { role: 'assistant', content: responseText })`

**action:**
- Verify `SessionManager.pushMessage` is called with:
  - `role: 'assistant'`
  - `content: responseText`
- This ensures AI responses are included in conversation context

### Task 7: Verify real-time outbound delivery to frontend
**read_first:**
- `src/workers/index.ts` lines 52-64 (executeOutbound emit)

**acceptance_criteria:**
- `new_message` event emitted via Socket.IO after outbound send
- Event includes `conversationId`, message `id`, `direction: 'out'`, `content`, `createdAt`

**action:**
- Verify `executeOutbound` emits:
  ```typescript
  io.to(msg.tenantId).emit('new_message', {
    conversationId,
    message: {
      id: result.messageId,
      direction: 'out',
      content: responseText,
      createdAt: new Date().toISOString(),
    },
  });
  ```

## Verification

**must_haves:**
- [ ] `ResponseRouter.dispatch` only handles WhatsApp
- [ ] `WhatsAppAdapter.sendMessage` sends via Evolution API with rate limiting
- [ ] `sendText` calls correct Evolution API endpoint
- [ ] Rate limiter enforces 1 msg/sec for WhatsApp
- [ ] Outbound message persisted to PostgreSQL
- [ ] Delivery status updated after send
- [ ] Session context window updated with assistant reply
- [ ] Real-time `new_message` event emitted to frontend
- [ ] End-to-end: AI response → rate limit → send → persist → emit works
