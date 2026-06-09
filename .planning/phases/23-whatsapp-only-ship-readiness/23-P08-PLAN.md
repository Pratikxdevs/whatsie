---
plan_id: P08
phase: 23
objective: Fix WhatsApp message pipeline (webhook → normalize → queue → worker)
wave: 3
depends_on: [P07]
files_modified:
  - src/routes/gateway.ts
  - src/normalizer/whatsapp.ts
  - src/queue/setup.ts
  - src/workers/index.ts
requirements: [P07]
autonomous: true
---

# Plan P08: Fix WhatsApp Message Pipeline

## Tasks

### Task 1: Verify WhatsApp webhook handler processes inbound messages
**read_first:**
- `src/routes/gateway.ts` lines 84-187 (WhatsApp webhook handler)

**acceptance_criteria:**
- Webhook handler returns 200 OK within 3 seconds
- Only processes `messages.upsert` events
- Idempotency check via Redis works
- Normalizes message and adds to `whatsappQueue`

**action:**
- Verify the WhatsApp webhook handler in `src/routes/gateway.ts`:
  - Returns `res.status(200).send('OK')` immediately
  - Filters for `eventType === "messages.upsert"`
  - Uses Redis idempotency check with `messageId`
  - Calls `normalizeWhatsAppWebhook(tenantId, rawPayload)`
  - Adds normalized message to `whatsappQueue`
  - Emits early `new_message` Socket.IO event

### Task 2: Verify WhatsApp normalizer produces correct output
**read_first:**
- `src/normalizer/whatsapp.ts`
- `src/normalizer/types.ts`

**acceptance_criteria:**
- `normalizeWhatsAppWebhook` returns a `NormalizedMessage` with correct fields
- `platform` is set to `'whatsapp'`
- `tenantId` is passed through
- `userId` is extracted from message key (remoteJid)
- Message text is extracted from `data.message.conversation` or `data.message.extendedTextMessage.text`

**action:**
- Read `src/normalizer/whatsapp.ts` and verify:
  - Returns `NormalizedMessage` interface
  - `platform: 'whatsapp'`
  - `tenantId` from parameter
  - `userId` from `rawPayload.data?.key?.remoteJid` (the phone number JID)
  - `message.text` from the message content
  - `timestamp` from `rawPayload.data?.messageTimestamp`
  - `metadata.raw` contains the full payload

### Task 3: Verify WhatsApp queue setup
**read_first:**
- `src/queue/setup.ts`

**acceptance_criteria:**
- `whatsappQueue` is the only queue
- Queue name is `'whatsapp-messages'`
- Retry attempts: 5
- Backoff: exponential, 60s delay
- removeOnComplete: 24 hours
- removeOnFail: 7 days

**action:**
- In `src/queue/setup.ts`:
  - Verify `whatsappQueue` configuration matches the spec
  - After P01/P02/P03, only `whatsappQueue` should remain
  - Verify `redisConnection` is properly exported

### Task 4: Verify WhatsApp worker picks up jobs
**read_first:**
- `src/workers/index.ts` lines 89-199 (whatsappWorker)

**acceptance_criteria:**
- Worker listens on `'whatsapp-messages'` queue
- Concurrency is set (currently 5)
- Worker processes jobs through the 10-step pipeline
- Worker calls `ResponseRouter.dispatch` for outbound

**action:**
- Verify `whatsappWorker` in `src/workers/index.ts`:
  - `new Worker('whatsapp-messages', ...)` 
  - Concurrency: 5
  - Pipeline steps: session load → DB updates → intent → workflow → rules → AI → outbound
  - Error handling: throws for BullMQ retry

### Task 5: Verify real-time message delivery via Socket.IO
**read_first:**
- `src/routes/gateway.ts` lines 168-176 (early emit)
- `src/workers/index.ts` lines 114-126 (worker emit)

**acceptance_criteria:**
- Early `new_message` event emitted from webhook handler (before worker processes)
- Full `new_message` event emitted from worker with `conversationId`
- Both events go to `tenantId` room

**action:**
- Verify the webhook handler emits:
  ```typescript
  io.to(tenantId).emit('new_message', {
    conversationId: null,
    message: { direction: 'in', content: ..., platform: 'whatsapp', createdAt: ... }
  });
  ```
- Verify the worker emits:
  ```typescript
  io.to(msg.tenantId).emit('new_message', {
    conversationId: dbRecords.conversation.id,
    message: { id: ..., direction: 'in', content: ..., createdAt: ... }
  });
  ```

### Task 6: Verify inbound message processing
**read_first:**
- `src/workers/index.ts` lines 99-132 (steps 1, 8, 9)

**acceptance_criteria:**
- Session state loaded from Redis
- Lead, conversation, and message persisted to PostgreSQL
- Billing usage recorded
- Event logged
- Message pushed to session context window

**action:**
- Verify the worker pipeline:
  1. `SessionManager.getWorkflowState(tenantId, userId)` loads session
  2. `processInboundMessageDbUpdates(msg)` persists to DB
  3. `recordBillingUsage(tenantId, 'messages_received', 1)` records billing
  4. `logEvent(tenantId, leadId, 'message_received', ...)` logs event
  5. `SessionManager.pushMessage(tenantId, userId, { role: 'user', content: ... })` updates context

## Verification

**must_haves:**
- [ ] Webhook handler returns 200 OK immediately
- [ ] Webhook handler filters for `messages.upsert` events
- [ ] Redis idempotency check prevents duplicate processing
- [ ] `normalizeWhatsAppWebhook` produces valid `NormalizedMessage`
- [ ] Normalized message is added to `whatsappQueue`
- [ ] Worker picks up jobs from `whatsapp-messages` queue
- [ ] Worker processes through full pipeline (session → DB → intent → workflow → rules → AI)
- [ ] Real-time `new_message` events emitted via Socket.IO
- [ ] Inbound messages persisted to PostgreSQL
- [ ] End-to-end: webhook → normalize → queue → worker → DB works
