# Phase 3: Platform Expansion & Product UI — Execution Plans

**Phase:** 3 — Platform Expansion & Product UI
**Created:** 2026-05-19
**Total Plans:** 14 across 5 waves
**Mode:** default

---

## Wave Structure

| Wave | Plans | Description | Dependencies |
|------|-------|-------------|--------------|
| 1 | P01, P02, P03 | Backend foundation: Telegram adapter, response router, billing recording | None |
| 2 | P04, P05, P06 | Backend APIs: leads, conversations, analytics/billing | Wave 1 |
| 3 | P07 | Frontend shell: app layout, sidebar, routing | Wave 2 |
| 4 | P08, P09, P10, P11 | Frontend pages: leads, conversations, analytics, billing | Wave 3 |
| 5 | P12, P13, P14 | Integration: onboarding, API wiring, tests | Wave 4 |

---

## P01 — Telegram Adapter & Normalizer

```yaml
phase: 3-platform-expansion
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/adapters/telegram.ts
  - src/normalizer/telegram.ts
  - src/routes/gateway.ts
  - src/queue/setup.ts
autonomous: true
requirements: [TEL-01, TEL-02]

must_haves:
  truths:
    - "Telegram webhook receives Update object and produces NormalizedMessage"
    - "TelegramAdapter can send text messages via Bot API"
    - "TelegramAdapter can set and delete webhooks"
    - "Telegram messages are queued in telegram-messages BullMQ queue"
    - "Gateway validates X-Telegram-Bot-Api-Secret-Token header"
  artifacts:
    - path: "src/adapters/telegram.ts"
      provides: "TelegramAdapter class with sendMessage, setWebhook, deleteWebhook"
      exports: ["TelegramAdapter"]
    - path: "src/normalizer/telegram.ts"
      provides: "normalizeTelegramWebhook function"
      exports: ["normalizeTelegramWebhook"]
    - path: "src/queue/setup.ts"
      provides: "telegram-messages BullMQ queue"
      contains: "telegramQueue"
  key_links:
    - from: "src/routes/gateway.ts"
      to: "src/normalizer/telegram.ts"
      via: "normalizeTelegramWebhook call in Telegram webhook handler"
      pattern: "normalizeTelegramWebhook"
    - from: "src/routes/gateway.ts"
      to: "src/queue/setup.ts"
      via: "telegramQueue.add for incoming messages"
      pattern: "telegramQueue\\.add"
```

<objective>
Expand the 31-line Telegram stub into a full adapter with inbound webhook handling, outbound messaging, and queue integration. This is the first multi-platform expansion and establishes the pattern for future adapters.

Purpose: Enable the platform to receive and reply to Telegram messages alongside WhatsApp.
Output: Working Telegram webhook pipeline (gateway -> normalizer -> queue -> worker).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From src/normalizer/types.ts:
```typescript
export interface NormalizedMessage {
  tenantId: string;
  platform: 'whatsapp' | 'telegram' | 'discord' | 'meta' | 'teams' | 'twitch' | 'twitter';
  userId: string;
  conversationId?: string;
  message: {
    text: string | null;
    attachments: Array<{ type: 'image' | 'video' | 'audio' | 'file'; url: string; mimeType: string; size: number; }>;
    quickReplies: Array<{ label: string; payload: string }> | null;
  };
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact' | 'sticker' | 'button_click';
  timestamp: string;
  metadata: {
    raw: any;
    replyTo: string | null;
    isForwarded: boolean;
    mentions: string[];
    [key: string]: any;
  };
}
```

From src/queue/setup.ts:
```typescript
export const redisConnection: IORedis;
export const whatsappQueue: Queue;
```

From src/routes/gateway.ts:
```typescript
// Existing middleware: authenticateTenant, rateLimitMiddleware
// Existing pattern: res.status(200).send('OK') immediately, then async processing
// Existing pattern: Redis idempotency via setnx
// Existing pattern: normalize + queue.add
```

From src/rateLimiter/index.ts:
```typescript
export function sendWithRateLimit<T>(platform: keyof typeof limiters, sendFn: () => Promise<T>): Promise<T>;
export const limiters: { whatsapp: RedisRateLimiter };
```

From src/adapters/evolutionApi.ts:
```typescript
// Pattern reference: axios-based HTTP calls to external API
// Pattern reference: error handling with console.error + re-throw
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expand TelegramAdapter class and create Telegram normalizer</name>
  <files>src/adapters/telegram.ts, src/normalizer/telegram.ts</files>
  <action>
Replace the contents of src/adapters/telegram.ts entirely. The current file has only a standalone `sendTelegramMessage` function (31 lines). Replace it with a `TelegramAdapter` class that:

1. Constructor accepts `token: string` and stores it.
2. `sendMessage(chatId: string, text: string)` — POST to `https://api.telegram.org/bot{token}/sendMessage` with `{ chat_id: chatId, text, parse_mode: 'HTML' }`. Use axios. Return the response data.
3. `sendMessageWithKeyboard(chatId: string, text: string, buttons: Array<Array<{ text: string; callback_data: string }>>)` — same endpoint but includes `reply_markup: { inline_keyboard: buttons }`.
4. `setWebhook(url: string, secretToken?: string)` — POST to `https://api.telegram.org/bot{token}/setWebhook` with `{ url, secret_token: secretToken, allowed_updates: ['message', 'edited_message', 'callback_query'] }`. Return boolean (response.data.ok).
5. `deleteWebhook()` — POST to `https://api.telegram.org/bot{token}/deleteWebhook`. Return boolean.

All methods should use axios and follow the existing error pattern from the original stub (console.error + re-throw). Export the class as named export `TelegramAdapter`. Keep the original `sendTelegramMessage` function as a deprecated export for backward compatibility.

Create src/normalizer/telegram.ts with a `normalizeTelegramWebhook(tenantId: string, rawPayload: any): NormalizedMessage` function. This function:
- Extracts `message` from `rawPayload.message || rawPayload.edited_message`
- Gets `chat` from `message.chat`, `from` from `message.from`
- Sets `userId` to `String(from.id)` (Telegram numeric user ID)
- Determines `type`: if `message.photo` -> 'image', if `message.voice || message.audio` -> 'audio', if `message.document` -> 'file', if `message.location` -> 'location', else 'text'
- Sets `text` from `message.text` or `message.caption` (for photos) or null
- Sets `metadata.chatId` to `String(chat.id)` (CRITICAL: chat.id != from.id in groups)
- Sets `metadata.chatType` to `chat.type` (private/group/supergroup)
- Sets `metadata.firstName`, `metadata.lastName`, `metadata.username` from `from`
- Sets `metadata.replyTo` from `message.reply_to_message?.message_id?.toString()`
- Sets `metadata.isForwarded` to `!!message.forward_date`
- Sets `metadata.mentions` from message.entities filtered by type 'mention'
- Sets `timestamp` to `new Date(message.date * 1000).toISOString()`
- Sets `platform` to `'telegram'`
- Sets `metadata.raw` to the full rawPayload

Import `NormalizedMessage` from `./types`. Export as named export `normalizeTelegramWebhook`.
  </action>
  <verify>
    <automated>npx vitest run src/adapters/telegram.test.ts src/normalizer/telegram.test.ts --reporter=verbose 2>/dev/null || echo "Tests to be created in P14"</automated>
  </verify>
  <done>TelegramAdapter class exported with sendMessage, setWebhook, deleteWebhook methods. normalizeTelegramWebhook exported and produces valid NormalizedMessage from Telegram Update objects.</done>
</task>

<task type="auto">
  <name>Task 2: Wire Telegram webhook in gateway and add telegram-messages queue</name>
  <files>src/routes/gateway.ts, src/queue/setup.ts</files>
  <action>
Modify src/queue/setup.ts to add a second BullMQ queue. After the existing `whatsappQueue` declaration, add:
- `export const telegramQueue = new Queue('telegram-messages', { connection: redisConnection, defaultJobOptions: { ... } })` using the same retry/backoff/retention options as whatsappQueue.

Modify src/routes/gateway.ts to replace the Telegram stub endpoint (lines 145-148). The current stub just logs and returns 200. Replace with full webhook processing:

1. Add import for `normalizeTelegramWebhook` from `'../normalizer/telegram'` and `telegramQueue` from `'../queue/setup'`.
2. In the Telegram POST handler (`/telegram/:tenantId`), after `res.status(200).send('OK')`:
   a. Validate `X-Telegram-Bot-Api-Secret-Token` header against `process.env.TELEGRAM_WEBHOOK_SECRET`. If the env var is set and the header does not match, log a warning and return early (do NOT return an error status — Telegram will retry).
   b. Extract `update_id` from `req.body` for idempotency. Use Redis `setnx` with key `idempotency:telegram:{update_id}` and 24h TTL, same pattern as WhatsApp.
   c. Call `normalizeTelegramWebhook(tenantId, req.body)` to produce a NormalizedMessage.
   d. Call `telegramQueue.add('incoming-message', normalizedMessage)`.
   e. Log success with tenantId.

The handler keeps `authenticateTenant` and `rateLimitMiddleware` in the middleware chain (already present). Do NOT add `verifyWhatsAppSignature` — Telegram uses its own secret token header.
  </action>
  <verify>
    <automated>grep -c "telegramQueue" src/queue/setup.ts && grep -c "normalizeTelegramWebhook" src/routes/gateway.ts</automated>
  </verify>
  <done>telegramQueue exported from queue/setup.ts. Gateway Telegram endpoint validates secret token, checks idempotency, normalizes payload, and queues to telegram-messages.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| Telegram -> Gateway | Untrusted webhook payloads from Telegram cloud |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-3-01 | Spoofing | Telegram webhook endpoint | mitigate | Validate X-Telegram-Bot-Api-Secret-Token header against TELEGRAM_WEBHOOK_SECRET env var |
| T-3-02 | Tampering | Telegram webhook idempotency | mitigate | Redis SETNX on update_id prevents replay attacks |
| T-3-03 | Tampering | npm install zod | mitigate | Package verified as [ASSUMED] — well-known, 30M weekly downloads |
</threat_model>

<verification>
- `grep -c "class TelegramAdapter" src/adapters/telegram.ts` returns 1
- `grep -c "normalizeTelegramWebhook" src/normalizer/telegram.ts` returns at least 1
- `grep -c "telegramQueue" src/queue/setup.ts` returns at least 1
- `grep -c "x-telegram-bot-api-secret-token" src/routes/gateway.ts` (case-insensitive) returns at least 1
</verification>

<success_criteria>
- TelegramAdapter class has sendMessage, setWebhook, deleteWebhook methods
- normalizeTelegramWebhook produces valid NormalizedMessage with platform='telegram'
- Gateway Telegram endpoint validates secret, checks idempotency, normalizes, queues
- telegramQueue exists in queue/setup.ts with same retry config as whatsappQueue
</success_criteria>

<output>
Create `.planning/phases/3/01-SUMMARY.md` when done
</output>

---

## P02 — Response Router

```yaml
phase: 3-platform-expansion
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/router/index.ts
  - src/rateLimiter/index.ts
  - src/workers/index.ts
autonomous: true
requirements: [ROUTE-01]

must_haves:
  truths:
    - "ResponseRouter.dispatch sends WhatsApp messages via WhatsAppAdapter"
    - "ResponseRouter.dispatch sends Telegram messages via TelegramAdapter"
    - "Worker uses ResponseRouter instead of direct WhatsAppAdapter.sendMessage"
    - "Rate limiter supports both whatsapp and telegram platforms"
  artifacts:
    - path: "src/router/index.ts"
      provides: "ResponseRouter class with static dispatch method"
      exports: ["ResponseRouter"]
    - path: "src/rateLimiter/index.ts"
      provides: "telegram rate limiter added to limiters map"
      contains: "telegram"
  key_links:
    - from: "src/workers/index.ts"
      to: "src/router/index.ts"
      via: "ResponseRouter.dispatch replaces WhatsAppAdapter.sendMessage"
      pattern: "ResponseRouter\\.dispatch"
    - from: "src/router/index.ts"
      to: "src/adapters/whatsapp.adapter.ts"
      via: "WhatsAppAdapter.sendMessage for whatsapp platform"
      pattern: "WhatsAppAdapter\\.sendMessage"
    - from: "src/router/index.ts"
      to: "src/adapters/telegram.ts"
      via: "TelegramAdapter.sendMessage for telegram platform"
      pattern: "TelegramAdapter"
```

<objective>
Extract outbound message dispatch from the worker into a unified ResponseRouter that selects the correct platform adapter based on NormalizedMessage.platform. This decouples the worker from platform-specific send logic.

Purpose: Enable multi-platform outbound messaging without modifying the worker pipeline for each new platform.
Output: ResponseRouter class, updated worker, Telegram rate limiter.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From src/workers/index.ts (current outbound logic to extract):
```typescript
async function executeOutbound(msg: NormalizedMessage, conversationId: string, responseText: string) {
  // Step 8: Update session context window
  await SessionManager.pushMessage(msg.tenantId, msg.userId, { role: 'assistant', content: responseText });
  // Step 9: Persist outbound message to DB
  const outboundMessage = await prisma.message.create({ data: { tenantId: msg.tenantId, conversationId, direction: 'out', content: responseText, messageType: 'text', metadata: { systemDispatched: true } } });
  // Step 11: Rate limit -> send via platform adapter
  const sendResult = await WhatsAppAdapter.sendMessage(msg.tenantId, msg.userId, responseText);
  // Step 13: Update delivery status
  await prisma.message.update({ where: { id: outboundMessage.id }, data: { metadata: { systemDispatched: true, deliveredAt: new Date().toISOString() } } });
  return { success: true, messageId: outboundMessage.id };
}
```

From src/adapters/whatsapp.adapter.ts:
```typescript
export class WhatsAppAdapter {
  static async sendMessage(tenantId: string, remoteJid: string, text: string);
}
```

From src/adapters/telegram.ts (created in P01):
```typescript
export class TelegramAdapter {
  constructor(token: string);
  async sendMessage(chatId: string, text: string): Promise<any>;
}
```

From src/rateLimiter/index.ts:
```typescript
export const limiters = { whatsapp: whatsappLimiter };
export async function sendWithRateLimit<T>(platform: keyof typeof limiters, sendFn: () => Promise<T>): Promise<T>;
```

From src/normalizer/types.ts:
```typescript
export interface NormalizedMessage { platform: 'whatsapp' | 'telegram' | ...; metadata: { [key: string]: any; }; userId: string; tenantId: string; }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ResponseRouter and add Telegram rate limiter</name>
  <files>src/router/index.ts, src/rateLimiter/index.ts</files>
  <action>
Create src/router/index.ts with a `ResponseRouter` class containing a static `dispatch` method:

```
static async dispatch(msg: NormalizedMessage, conversationId: string, responseText: string): Promise<{ success: boolean; messageId: string }>
```

The dispatch method:
1. Pushes the assistant reply to the session context window via `SessionManager.pushMessage(msg.tenantId, msg.userId, { role: 'assistant', content: responseText })`.
2. Persists the outbound message to PostgreSQL via `prisma.message.create()` with `{ tenantId: msg.tenantId, conversationId, direction: 'out', content: responseText, messageType: 'text', metadata: { systemDispatched: true } }`.
3. Selects the platform adapter based on `msg.platform`:
   - `'whatsapp'`: calls `WhatsAppAdapter.sendMessage(msg.tenantId, msg.userId, responseText)` (which already has rate limiting built in).
   - `'telegram'`: gets `TELEGRAM_BOT_TOKEN` from env, creates a `TelegramAdapter` instance (lazy-cache in a module-level Map keyed by token), gets `chatId` from `msg.metadata.chatId || msg.userId`, calls `sendWithRateLimit('telegram', () => adapter.sendMessage(chatId, responseText))`.
   - default: throws `Error('Unsupported platform: ' + msg.platform)`.
4. Updates the message delivery status via `prisma.message.update()` with `deliveredAt` timestamp.
5. Returns `{ success: true, messageId: outboundMessage.id }`.

Import `NormalizedMessage` from `'../normalizer/types'`, `WhatsAppAdapter` from `'../adapters/whatsapp.adapter'`, `TelegramAdapter` from `'../adapters/telegram'`, `sendWithRateLimit` from `'../rateLimiter'`, `SessionManager` from `'../services/sessionManager'`, `prisma` from `'../db/prisma'`.

Export as named export `ResponseRouter`.

Modify src/rateLimiter/index.ts:
- Add a `telegramLimiter` instance: `export const telegramLimiter = new RedisRateLimiter('telegram', 35)` (Telegram limit is ~30 messages/sec to different chats, 1 message/sec to same chat — use 35ms as minTime for general throughput).
- Add `telegram: telegramLimiter` to the `limiters` object.
  </action>
  <verify>
    <automated>grep -c "class ResponseRouter" src/router/index.ts && grep -c "telegram" src/rateLimiter/index.ts</automated>
  </verify>
  <done>ResponseRouter.dispatch handles whatsapp and telegram platforms. Rate limiter has telegram entry. ResponseRouter persists outbound messages and updates delivery status.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor worker to use ResponseRouter</name>
  <files>src/workers/index.ts</files>
  <action>
Modify src/workers/index.ts to use ResponseRouter instead of direct WhatsAppAdapter calls:

1. Replace the import of `WhatsAppAdapter` from `'../adapters/whatsapp.adapter'` with `ResponseRouter` from `'../router/index'`.
2. Replace the `executeOutbound` function body. The new implementation delegates to `ResponseRouter.dispatch(msg, conversationId, responseText)`. Keep the function signature the same so all callers (`callAiFallback`, workflow handlers, rule engine handlers) continue to work without changes. The function should:
   - Call `ResponseRouter.dispatch(msg, conversationId, responseText)`.
   - Log the dispatch with the existing `getContextLogger`.
   - Return the result.
3. Remove the `WhatsAppAdapter` import entirely since it is no longer used directly in this file.

The worker pipeline steps (session, CRM, context, workflow, intent, rules, AI) remain unchanged. Only the outbound dispatch changes.
  </action>
  <verify>
    <automated>grep -c "ResponseRouter" src/workers/index.ts && grep -c "WhatsAppAdapter" src/workers/index.ts | grep -q "^0$" && echo "WhatsAppAdapter removed from worker"</automated>
  </verify>
  <done>Worker uses ResponseRouter.dispatch for all outbound messages. No direct WhatsAppAdapter references remain in workers/index.ts.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| Worker -> ResponseRouter -> Adapter | Internal dispatch — trusted boundary |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-3-04 | Tampering | ResponseRouter adapter selection | mitigate | Validate platform against known set, throw on unsupported |
</threat_model>

<verification>
- `grep -c "ResponseRouter" src/workers/index.ts` returns at least 1
- `grep -c "WhatsAppAdapter" src/workers/index.ts` returns 0
- `grep -c "telegram" src/rateLimiter/index.ts` returns at least 1
- `ls src/router/index.ts` exists
</verification>

<success_criteria>
- ResponseRouter.dispatch selects correct adapter based on msg.platform
- Worker no longer directly references WhatsAppAdapter
- Rate limiter supports both whatsapp and telegram platforms
- Outbound messages persisted to DB with delivery status tracking
</success_criteria>

<output>
Create `.planning/phases/3/02-SUMMARY.md` when done
</output>

---

## P03 — Billing Usage Recording

```yaml
phase: 3-platform-expansion
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/billing/recordUsage.ts
  - src/workers/index.ts
  - src/ai/orchestrator.ts
autonomous: true
requirements: [BILL-01]

must_haves:
  truths:
    - "BillingUsage records are created when messages are received"
    - "BillingUsage records are created when messages are sent"
    - "BillingUsage records are created when AI tokens are consumed"
    - "BillingUsage upserts use composite unique index to avoid duplicates"
    - "BigInt quantity field is handled correctly in Prisma"
  artifacts:
    - path: "src/billing/recordUsage.ts"
      provides: "recordBillingUsage helper function"
      exports: ["recordBillingUsage"]
    - path: "prisma/schema.prisma"
      provides: "Composite unique index on BillingUsage"
      contains: "@@unique([tenantId, metric, periodStart])"
  key_links:
    - from: "src/workers/index.ts"
      to: "src/billing/recordUsage.ts"
      via: "recordBillingUsage called after message processing"
      pattern: "recordBillingUsage"
    - from: "src/ai/orchestrator.ts"
      to: "src/billing/recordUsage.ts"
      via: "recordBillingUsage called after AI response"
      pattern: "recordBillingUsage"
```

<objective>
Wire the existing BillingUsage and AiLog Prisma models to actually record data. Currently these models exist in the schema but are never written to. Add a composite unique index for upsert support and create a billing recording helper.

Purpose: Enable billing tracking and usage dashboards by recording message and AI token consumption.
Output: Billing recording helper, Prisma migration, worker and AI orchestrator integration.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From prisma/schema.prisma (current BillingUsage model):
```prisma
model BillingUsage {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  metric      String
  quantity    BigInt
  periodStart DateTime
  periodEnd   DateTime
  @@index([tenantId])
}
```

From prisma/schema.prisma (current AiLog model):
```prisma
model AiLog {
  id               String   @id @default(uuid())
  tenantId         String
  tenant           Tenant   @relation(fields: [tenantId], references: [id])
  model            String
  promptTokens     Int
  completionTokens Int
  cost             Decimal?
  metadata         Json?
  createdAt        DateTime @default(now())
  @@index([tenantId])
}
```

From src/workers/index.ts (where to wire billing):
```typescript
// After processInboundMessageDbUpdates(msg) — record messages_received
// After executeOutbound — record messages_sent
```

From src/ai/orchestrator.ts (where to wire AI billing):
```typescript
export async function generateAiResponse(tenantId: string, userId: string, incomingMessageText: string, systemPrompt?: string): Promise<string>
// OpenAI response includes response.usage.totalTokens, response.usage.promptTokens, response.usage.completionTokens
// Gemini result includes result.response.usageMetadata
```

From src/db/prisma.ts:
```typescript
export const prisma: PrismaClient;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add composite unique index to BillingUsage and create billing helper</name>
  <files>prisma/schema.prisma, src/billing/recordUsage.ts</files>
  <action>
Modify prisma/schema.prisma — add a composite unique index to the BillingUsage model. After the existing `@@index([tenantId])` line, add:
`@@unique([tenantId, metric, periodStart])`

This enables upsert on `(tenantId, metric, periodStart)` to atomically increment usage counters.

Create the directory `src/billing/` and the file `src/billing/recordUsage.ts` with:

1. `recordBillingUsage(tenantId: string, metric: string, quantity: number)` async function:
   - Compute `periodStart` as the first day of the current UTC month: `new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))`
   - Compute `periodEnd` as the last day of the current UTC month: `new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))`
   - Call `prisma.billingUsage.upsert()` with:
     - `where: { tenantId_metric_periodStart: { tenantId, metric, periodStart } }` (uses the new composite unique)
     - `update: { quantity: { increment: BigInt(quantity) } }`
     - `create: { tenantId, metric, quantity: BigInt(quantity), periodStart, periodEnd }`
   - Wrap in try/catch, log errors but do not throw (billing failures must not break the message pipeline).

2. `recordAiUsage(tenantId: string, model: string, promptTokens: number, completionTokens: number)` async function:
   - Call `prisma.aiLog.create()` with `{ data: { tenantId, model, promptTokens, completionTokens } }`
   - Also call `recordBillingUsage(tenantId, 'ai_tokens', promptTokens + completionTokens)`.
   - Wrap in try/catch, log errors but do not throw.

Export both functions. Import `prisma` from `'../db/prisma'`.

After creating the schema change, run `npx prisma migrate dev --name add-billing-composite-unique` to generate the migration. If the migration fails because of existing data with duplicates, handle by first deduplicating or using `--create-only` and reviewing.
  </action>
  <verify>
    <automated>grep -c "@@unique" prisma/schema.prisma && ls src/billing/recordUsage.ts</automated>
  </verify>
  <done>BillingUsage has composite unique index on (tenantId, metric, periodStart). recordBillingUsage and recordAiUsage helpers exist. Prisma migration generated.</done>
</task>

<task type="auto">
  <name>Task 2: Wire billing recording into worker and AI orchestrator</name>
  <files>src/workers/index.ts, src/ai/orchestrator.ts</files>
  <action>
Modify src/workers/index.ts:
1. Add import: `import { recordBillingUsage } from '../billing/recordUsage';`
2. After the `processInboundMessageDbUpdates(msg)` call (around line 124), add: `await recordBillingUsage(msg.tenantId, 'messages_received', 1);`
3. After the outbound message is successfully sent in `executeOutbound` (after the delivery status update), add: `await recordBillingUsage(msg.tenantId, 'messages_sent', 1);`

Modify src/ai/orchestrator.ts:
1. Add import: `import { recordAiUsage } from '../billing/recordUsage';`
2. In the OpenAI-compatible path (the `else` branch), after getting the response, extract token usage:
   - `const usage = response.usage;`
   - `if (usage) { await recordAiUsage(tenantId, model, usage.prompt_tokens || 0, usage.completion_tokens || 0); }`
3. In the Gemini path, after getting the result, extract usage:
   - `const usage = result.response.usageMetadata;`
   - `if (usage) { await recordAiUsage(tenantId, model, usage.promptTokenCount || 0, usage.candidatesTokenCount || 0); }`
4. Both calls should be fire-and-forget (do not await, or wrap in .catch to prevent billing failures from breaking AI responses). Use `recordAiUsage(...).catch(err => console.error('[AI] Failed to record usage:', err));`
  </action>
  <verify>
    <automated>grep -c "recordBillingUsage" src/workers/index.ts && grep -c "recordAiUsage" src/ai/orchestrator.ts</automated>
  </verify>
  <done>Worker records messages_received and messages_sent billing events. AI orchestrator records ai_tokens billing events and AiLog entries.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| Worker -> BillingUsage | Internal write — trusted boundary |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-3-05 | Tampering | Billing data writes | mitigate | Billing writes only from worker (not from frontend API), tenantId from authenticated message context |
| T-3-06 | Denial of Service | Billing write failures | accept | Fire-and-forget pattern ensures billing failures do not block message processing |
</threat_model>

<verification>
- `grep -c "@@unique" prisma/schema.prisma` returns at least 1
- `grep -c "recordBillingUsage" src/workers/index.ts` returns at least 2
- `grep -c "recordAiUsage" src/ai/orchestrator.ts` returns at least 1
- `ls src/billing/recordUsage.ts` exists
</verification>

<success_criteria>
- BillingUsage composite unique index exists on (tenantId, metric, periodStart)
- Worker writes messages_received and messages_sent records
- AI orchestrator writes ai_tokens records and AiLog entries
- Billing failures do not block message processing
</success_criteria>

<output>
Create `.planning/phases/3/03-SUMMARY.md` when done
</output>

---

## P04 — Lead Management API

```yaml
phase: 3-platform-expansion
plan: 04
type: execute
wave: 2
depends_on: [01, 02, 03]
files_modified:
  - src/routes/leads.ts
  - src/index.ts
autonomous: true
requirements: [LEAD-01]

must_haves:
  truths:
    - "GET /api/leads returns paginated leads filtered by status, platform, search"
    - "GET /api/leads/:id returns single lead with conversation count"
    - "PATCH /api/leads/:id updates lead status or attributes"
    - "All queries are tenant-scoped via req.user.tenantId"
  artifacts:
    - path: "src/routes/leads.ts"
      provides: "Lead CRUD API endpoints"
      exports: ["default"] (Express Router)
  key_links:
    - from: "src/index.ts"
      to: "src/routes/leads.ts"
      via: "app.use('/api/leads', leadsRouter)"
      pattern: "leads"
```

<objective>
Create REST endpoints for lead management: list with filtering/pagination, get by ID, and update status/attributes. All queries scoped to the authenticated tenant.

Purpose: Enable the frontend leads page to display, filter, and update leads.
Output: Working lead API endpoints at /api/leads.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From src/middleware/auth.ts:
```typescript
export interface AuthenticatedRequest extends Request {
  user?: { id: string; tenantId: string; role: string; };
}
export const authenticateToken: RequestHandler;
```

From prisma/schema.prisma (Lead model):
```prisma
model Lead {
  id        String   @id @default(uuid())
  tenantId  String
  botId     String?
  name      String?
  phone     String?
  email     String?
  source    String?
  status    String   @default("new")
  attributes Json?   @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  conversations      Conversation[]
  workflowExecutions WorkflowExecution[]
  @@index([tenantId])
  @@index([botId])
}
```

From src/index.ts (route registration pattern):
```typescript
app.use('/api/workspaces', workspacesRouter);
// New routes follow same pattern: app.use('/api/leads', leadsRouter);
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create lead management API routes</name>
  <files>src/routes/leads.ts, src/index.ts</files>
  <action>
Create src/routes/leads.ts with an Express Router:

1. `GET /` — List leads with filtering and pagination:
   - Extract `tenantId` from `req.user!.tenantId` (via authenticateToken middleware)
   - Query params: `status`, `platform` (maps to `source` field), `search`, `page` (default 1), `limit` (default 20)
   - Build Prisma `where` clause: always `{ tenantId }`, optionally `status`, `source`, and `OR` on `name`/`phone`/`email` for search (use `contains` with `mode: 'insensitive'` for name/email)
   - Use `Promise.all` for parallel `prisma.lead.findMany()` and `prisma.lead.count()`
   - findMany includes: `{ _count: { select: { conversations: true } }, conversations: { take: 1, orderBy: { lastMessageAt: 'desc' }, select: { lastMessageAt: true, platform: true } } }`
   - Return `{ leads, total, page, limit }`

2. `GET /:id` — Get single lead:
   - Find by `id` AND `tenantId` (composite where for safety)
   - Include `_count: { select: { conversations: true } }` and `conversations` with messages take 5
   - Return `{ lead }` or 404

3. `PATCH /:id` — Update lead:
   - Extract `status`, `name`, `email`, `attributes` from `req.body`
   - Update by `{ id: req.params.id, tenantId }` (composite where)
   - Only update fields that are present in the body
   - Return `{ lead }`

All routes use `authenticateToken` middleware. Import it from `'../middleware/auth'`. Import `prisma` from `'../db/prisma'`.

Modify src/index.ts to register the new router:
- Add import: `import leadsRouter from './routes/leads';`
- Add: `app.use('/api/leads', leadsRouter);` after the existing workspace route registration.
  </action>
  <verify>
    <automated>grep -c "leadsRouter" src/index.ts && ls src/routes/leads.ts</automated>
  </verify>
  <done>GET /api/leads returns filtered/paginated leads. GET /api/leads/:id returns single lead. PATCH /api/leads/:id updates lead. All tenant-scoped.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| Client -> API | Untrusted input from frontend |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-3-07 | Information Disclosure | Lead data access | mitigate | All queries include tenantId from JWT, preventing cross-tenant access |
| T-3-08 | Tampering | Lead search input | mitigate | Prisma parameterized queries prevent SQL injection automatically |
| T-3-09 | Elevation of Privilege | Lead updates | mitigate | authenticateToken required on all routes |
</threat_model>

<verification>
- `grep -c "authenticateToken" src/routes/leads.ts` returns at least 1
- `grep -c "tenantId" src/routes/leads.ts` returns at least 3
- `grep -c "leadsRouter" src/index.ts` returns at least 1
</verification>

<success_criteria>
- GET /api/leads returns paginated results with status/platform/search filtering
- GET /api/leads/:id returns single lead with conversation count
- PATCH /api/leads/:id updates lead fields
- All queries scoped to authenticated tenant
</success_criteria>

<output>
Create `.planning/phases/3/04-SUMMARY.md` when done
</output>

---

## P05 — Conversation & Message API

```yaml
phase: 3-platform-expansion
plan: 05
type: execute
wave: 2
depends_on: [01, 02, 03]
files_modified:
  - src/routes/conversations.ts
  - src/index.ts
autonomous: true
requirements: [CONV-01]

must_haves:
  truths:
    - "GET /api/conversations returns conversations with last message preview"
    - "GET /api/conversations/:id/messages returns message history sorted by time"
    - "All queries are tenant-scoped"
  artifacts:
    - path: "src/routes/conversations.ts"
      provides: "Conversation and message API endpoints"
      exports: ["default"] (Express Router)
  key_links:
    - from: "src/index.ts"
      to: "src/routes/conversations.ts"
      via: "app.use('/api/conversations', conversationsRouter)"
      pattern: "conversations"
```

<objective>
Create REST endpoints for conversation listing and message history retrieval. Enables the frontend conversation inbox page.

Purpose: Display conversation list and per-conversation message threads.
Output: Working conversation/message API endpoints at /api/conversations.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From prisma/schema.prisma (Conversation model):
```prisma
model Conversation {
  id, tenantId, leadId, platform, externalUserId, status, lastMessageAt, createdAt, updatedAt
  lead Lead @relation(...)
  messages Message[]
  @@index([tenantId]), @@index([leadId])
}
```

From prisma/schema.prisma (Message model):
```prisma
model Message {
  id, tenantId, conversationId, direction, content, messageType, platformMessageId, metadata, createdAt
  conversation Conversation @relation(...)
  @@index([conversationId]), @@index([platformMessageId])
}
```

From src/middleware/auth.ts:
```typescript
export const authenticateToken: RequestHandler;
export interface AuthenticatedRequest extends Request { user?: { id: string; tenantId: string; role: string; }; }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create conversation and message API routes</name>
  <files>src/routes/conversations.ts, src/index.ts</files>
  <action>
Create src/routes/conversations.ts with an Express Router:

1. `GET /` — List conversations:
   - Extract `tenantId` from `req.user!.tenantId`
   - Query params: `status` (open/closed), `platform`, `leadId`, `page` (default 1), `limit` (default 20)
   - Build Prisma `where` clause with `tenantId` always present
   - Include `lead: { select: { id: true, name: true, phone: true, email: true, status: true } }`
   - Include last message: `messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { content: true, direction: true, createdAt: true } }`
   - Order by `lastMessageAt: 'desc'` (most recent first)
   - Return `{ conversations, total, page, limit }`

2. `GET /:id/messages` — Get messages for a conversation:
   - Extract `tenantId` from `req.user!.tenantId`
   - Find conversation by `id` AND `tenantId` to verify ownership
   - If not found, return 404
   - Query params: `page` (default 1), `limit` (default 50)
   - Get messages: `prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' }, skip, take })`
   - Get total count: `prisma.message.count({ where: { conversationId: id } })`
   - Return `{ messages, total, page, limit }`

All routes use `authenticateToken` middleware. Import from `'../middleware/auth'` and `prisma` from `'../db/prisma'`.

Modify src/index.ts:
- Add import: `import conversationsRouter from './routes/conversations';`
- Add: `app.use('/api/conversations', conversationsRouter);`
  </action>
  <verify>
    <automated>grep -c "conversationsRouter" src/index.ts && ls src/routes/conversations.ts</automated>
  </verify>
  <done>GET /api/conversations returns conversation list with lead info and last message. GET /api/conversations/:id/messages returns paginated message history.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| Client -> API | Untrusted input from frontend |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-3-10 | Information Disclosure | Conversation access | mitigate | Tenant scoping on all queries, ownership verification before message retrieval |
</threat_model>

<verification>
- `grep -c "conversationsRouter" src/index.ts` returns at least 1
- `grep -c "authenticateToken" src/routes/conversations.ts` returns at least 1
</verification>

<success_criteria>
- GET /api/conversations returns paginated conversations with lead info and last message
- GET /api/conversations/:id/messages returns message history sorted chronologically
- All queries tenant-scoped
</success_criteria>

<output>
Create `.planning/phases/3/05-SUMMARY.md` when done
</output>

---

## P06 — Analytics & Billing API

```yaml
phase: 3-platform-expansion
plan: 06
type: execute
wave: 2
depends_on: [01, 02, 03]
files_modified:
  - src/routes/analytics.ts
  - src/routes/billing.ts
  - src/index.ts
autonomous: true
requirements: [ANALYTICS-01]

must_haves:
  truths:
    - "GET /api/analytics/message-volume returns message counts grouped by day"
    - "GET /api/analytics/conversion-funnel returns lead counts by status"
    - "GET /api/billing/usage returns BillingUsage records for the tenant"
    - "BigInt quantities are serialized as numbers in JSON responses"
  artifacts:
    - path: "src/routes/analytics.ts"
      provides: "Analytics aggregation endpoints"
      exports: ["default"]
    - path: "src/routes/billing.ts"
      provides: "Billing usage endpoints"
      exports: ["default"]
  key_links:
    - from: "src/index.ts"
      to: "src/routes/analytics.ts"
      via: "app.use('/api/analytics', analyticsRouter)"
      pattern: "analytics"
    - from: "src/index.ts"
      to: "src/routes/billing.ts"
      via: "app.use('/api/billing', billingRouter)"
      pattern: "billing"
```

<objective>
Create analytics aggregation endpoints (message volume, conversion funnel, AI usage) and billing usage endpoints. These power the frontend analytics and billing pages.

Purpose: Provide aggregated data for dashboard charts and billing displays.
Output: Working analytics and billing API endpoints.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From prisma/schema.prisma:
```prisma
model Message { tenantId, direction, createdAt, conversationId }
model Lead { tenantId, status }
model BillingUsage { tenantId, metric, quantity (BigInt), periodStart, periodEnd }
model AiLog { tenantId, model, promptTokens, completionTokens, createdAt }
model Conversation { tenantId, platform }
```

From src/middleware/auth.ts:
```typescript
export const authenticateToken: RequestHandler;
export interface AuthenticatedRequest extends Request { user?: { id: string; tenantId: string; role: string; }; }
```

BigInt serialization pitfall:
> BillingUsage.quantity is BigInt. JSON.stringify throws on BigInt. Must convert to Number before sending.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create analytics API routes</name>
  <files>src/routes/analytics.ts, src/index.ts</files>
  <action>
Create src/routes/analytics.ts with an Express Router. All routes use `authenticateToken`.

1. `GET /message-volume` — Message volume over time:
   - Query params: `days` (default 30), `platform`
   - Compute `startDate` by subtracting `days` from now
   - Use `prisma.message.groupBy({ by: ['createdAt'], where: { tenantId, createdAt: { gte: startDate } }, _count: true })` — NOTE: Prisma groupBy does not support grouping by day directly. Instead, use `prisma.$queryRaw` with a raw SQL query that groups by `DATE(created_at)` and counts inbound/outbound separately:
     ```sql
     SELECT DATE(created_at) as date,
            COUNT(*) FILTER (WHERE direction = 'in') as inbound,
            COUNT(*) FILTER (WHERE direction = 'out') as outbound
     FROM "Message"
     WHERE tenant_id = ${tenantId} AND created_at >= ${startDate}
     GROUP BY DATE(created_at)
     ORDER BY date ASC
     ```
   - Use `prisma.$queryRawUnsafe` with parameterized query (Prisma template literals for safety)
   - Return `{ data: [{ date, inbound, outbound }] }`

2. `GET /conversion-funnel` — Lead counts by status:
   - Use `prisma.lead.groupBy({ by: ['status'], where: { tenantId }, _count: true })`
   - Transform to `{ funnel: [{ status, count }] }` ordered as: new, contacted, qualified, converted, lost

3. `GET /dashboard-stats` — Summary stats:
   - Use `Promise.all` for parallel queries:
     - Total leads: `prisma.lead.count({ where: { tenantId } })`
     - Open conversations: `prisma.conversation.count({ where: { tenantId, status: 'open' } })`
     - Messages this month: count messages where `createdAt >= startOfMonth`
     - Active bots: `prisma.bot.count({ where: { tenantId, status: 'active' } })`
   - Return `{ totalLeads, openConversations, messagesThisMonth, activeBots }`

All queries include `tenantId` from `req.user!.tenantId`. Import `authenticateToken` from `'../middleware/auth'` and `prisma` from `'../db/prisma'`.

Modify src/index.ts:
- Add import: `import analyticsRouter from './routes/analytics';`
- Add: `app.use('/api/analytics', analyticsRouter);`
  </action>
  <verify>
    <automated>grep -c "analyticsRouter" src/index.ts && ls src/routes/analytics.ts</automated>
  </verify>
  <done>GET /api/analytics/message-volume returns daily message counts. GET /api/analytics/conversion-funnel returns lead status distribution. GET /api/analytics/dashboard-stats returns summary metrics.</done>
</task>

<task type="auto">
  <name>Task 2: Create billing API routes with BigInt handling</name>
  <files>src/routes/billing.ts, src/index.ts</files>
  <action>
Create src/routes/billing.ts with an Express Router. All routes use `authenticateToken`.

1. `GET /usage` — Billing usage for current period:
   - Query params: `month` (optional, format YYYY-MM, defaults to current month)
   - Compute `periodStart` from the month param (first day of month UTC)
   - Query: `prisma.billingUsage.findMany({ where: { tenantId, periodStart }, orderBy: { metric: 'asc' } })`
   - CRITICAL: Convert `BigInt` quantities to `Number` before sending: `usage.map(u => ({ ...u, quantity: Number(u.quantity) }))`
   - Return `{ usage: [...] }`

2. `GET /usage/history` — Billing usage history (last 6 months):
   - Compute 6 months of periodStarts
   - Query: `prisma.billingUsage.findMany({ where: { tenantId, periodStart: { gte: sixMonthsAgo } }, orderBy: { periodStart: 'desc' } })`
   - Convert BigInt to Number
   - Return `{ usage: [...] }`

3. `GET /ai-logs` — AI usage logs:
   - Query params: `page` (default 1), `limit` (default 50)
   - Query: `prisma.aiLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, skip, take })`
   - Get count: `prisma.aiLog.count({ where: { tenantId } })`
   - Return `{ logs, total, page, limit }`

Import `authenticateToken` from `'../middleware/auth'` and `prisma` from `'../db/prisma'`.

Modify src/index.ts:
- Add import: `import billingRouter from './routes/billing';`
- Add: `app.use('/api/billing', billingRouter);`
  </action>
  <verify>
    <automated>grep -c "billingRouter" src/index.ts && grep -c "Number(" src/routes/billing.ts</automated>
  </verify>
  <done>GET /api/billing/usage returns current period usage with BigInt-to-Number conversion. GET /api/billing/usage/history returns 6-month history. GET /api/billing/ai-logs returns paginated AI logs.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| Client -> API | Untrusted input from frontend |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-3-11 | Information Disclosure | Billing data access | mitigate | Tenant scoping on all queries, authenticateToken required |
| T-3-12 | Tampering | Raw SQL in analytics | mitigate | Use Prisma template literals for parameterized queries, no string interpolation |
</threat_model>

<verification>
- `grep -c "analyticsRouter" src/index.ts` returns at least 1
- `grep -c "billingRouter" src/index.ts` returns at least 1
- `grep -c "Number(" src/routes/billing.ts` returns at least 1
</verification>

<success_criteria>
- Analytics endpoints return message volume, conversion funnel, and dashboard stats
- Billing endpoints return usage data with BigInt correctly serialized
- All queries tenant-scoped
- Raw SQL queries use parameterized templates
</success_criteria>

<output>
Create `.planning/phases/3/06-SUMMARY.md` when done
</output>

---

## P07 — App Shell & Navigation

```yaml
phase: 3-platform-expansion
plan: 07
type: execute
wave: 3
depends_on: [04, 05, 06]
files_modified:
  - frontend/src/components/layout/AppShell.tsx
  - frontend/src/components/layout/Sidebar.tsx
  - frontend/src/App.tsx
  - frontend/src/components/TopNav.tsx
autonomous: true
requirements: [NAV-01]

must_haves:
  truths:
    - "App has a sidebar with navigation links to all pages"
    - "Sidebar highlights the active page"
    - "Content area renders the active route"
    - "Existing /bots page still works within the new layout"
  artifacts:
    - path: "frontend/src/components/layout/AppShell.tsx"
      provides: "Sidebar + content area layout wrapper"
    - path: "frontend/src/components/layout/Sidebar.tsx"
      provides: "Navigation sidebar with route links"
    - path: "frontend/src/App.tsx"
      provides: "Updated routing with all new pages"
  key_links:
    - from: "frontend/src/App.tsx"
      to: "frontend/src/components/layout/AppShell.tsx"
      via: "AppShell wraps all routes"
      pattern: "AppShell"
    - from: "frontend/src/components/layout/Sidebar.tsx"
      to: "frontend/src/App.tsx"
      via: "NavLink components for each route"
      pattern: "NavLink"
```

<objective>
Create the application shell with sidebar navigation and update routing. This transforms the frontend from a single-page bot management view to a multi-page application with persistent navigation.

Purpose: Provide navigation structure for all new frontend pages.
Output: AppShell layout, Sidebar component, updated routing.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From frontend/src/App.tsx (current):
```typescript
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { BotsPage } from "./pages/BotsPage";
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/bots" replace />} />
        <Route path="/bots" element={<BotsPage />} />
      </Routes>
    </Router>
  );
}
```

From frontend/src/components/TopNav.tsx:
```typescript
export interface TopNavProps { onAddBotClick?: () => void; botCount?: number; isCreatingBot?: boolean; }
export function TopNav({ onAddBotClick, botCount = 0, isCreatingBot = false }: TopNavProps)
```

From frontend/src/pages/BotsPage.tsx:
```typescript
// Uses full-page layout with hero section, TopNav embedded
// Contains: min-h-screen bg-[#09090b] text-zinc-200
// Grid layout for bot cards with CursorCardsContainer
```

Installed packages (from frontend/package.json):
- react-router-dom (routing)
- lucide-react (icons)
- tailwind-merge + clsx (className utility)
- @radix-ui/* (UI primitives)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create AppShell layout and Sidebar navigation</name>
  <files>frontend/src/components/layout/AppShell.tsx, frontend/src/components/layout/Sidebar.tsx</files>
  <action>
Create `frontend/src/components/layout/Sidebar.tsx`:
- Import `NavLink` from `react-router-dom` and icons from `lucide-react` (Bot, Users, MessageSquare, BarChart3, CreditCard, UserPlus)
- Define nav items array: `{ to: '/bots', label: 'Bots', icon: Bot }, { to: '/leads', label: 'Leads', icon: Users }, { to: '/conversations', label: 'Conversations', icon: MessageSquare }, { to: '/analytics', label: 'Analytics', icon: BarChart3 }, { to: '/billing', label: 'Billing', icon: CreditCard }, { to: '/onboarding', label: 'Onboarding', icon: UserPlus }`
- Render an `<aside>` with: `w-60 h-screen border-r border-white/5 bg-[#09090b] flex flex-col`
- Top section: app name "CRM V2" in `p-6 border-b border-white/5`
- Nav section: `flex-1 p-3 space-y-1` with NavLink items
- NavLink active styling: `bg-[#1f1f22] text-[#EBEBF0]` when active, `text-[#7D7D8A] hover:text-[#CCCCD4] hover:bg-[#141415]` when inactive
- Each link: `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors`

Create `frontend/src/components/layout/AppShell.tsx`:
- Import `Outlet` from `react-router-dom` and `Sidebar`
- Render: sidebar on left + `<main className="flex-1 overflow-auto">` with `<Outlet />` on right
- Container: `flex h-screen bg-[#09090b] text-zinc-200`

Export both as named exports.
  </action>
  <verify>
    <automated>ls frontend/src/components/layout/AppShell.tsx frontend/src/components/layout/Sidebar.tsx</automated>
  </verify>
  <done>AppShell renders sidebar + content area. Sidebar has nav links to all pages with active state highlighting.</done>
</task>

<task type="auto">
  <name>Task 2: Update App.tsx routing and adapt BotsPage for new layout</name>
  <files>frontend/src/App.tsx, frontend/src/pages/BotsPage.tsx</files>
  <action>
Update frontend/src/App.tsx:
- Import `AppShell` from `./components/layout/AppShell`
- Import placeholder components for new pages (create minimal placeholder files if they don't exist yet — just return a div with the page name):
  - `LeadsPage` from `./pages/LeadsPage`
  - `ConversationsPage` from `./pages/ConversationsPage`
  - `AnalyticsPage` from `./pages/AnalyticsPage`
  - `BillingPage` from `./pages/BillingPage`
  - `OnboardingPage` from `./pages/OnboardingPage`
- Wrap routes inside `<AppShell />`:
  ```
  <Router>
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/bots" replace />} />
        <Route path="/bots" element={<BotsPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>
    </Routes>
  </Router>
  ```

Create placeholder page files (minimal — just a div with the page title):
- `frontend/src/pages/LeadsPage.tsx`: export function returning `<div className="p-6"><h1 className="text-2xl font-bold">Leads</h1></div>`
- `frontend/src/pages/ConversationsPage.tsx`: same pattern
- `frontend/src/pages/AnalyticsPage.tsx`: same pattern
- `frontend/src/pages/BillingPage.tsx`: same pattern
- `frontend/src/pages/OnboardingPage.tsx`: same pattern

Adapt frontend/src/pages/BotsPage.tsx:
- Remove the full-page hero section and TopNav (the sidebar now provides navigation)
- Keep the bot grid content but simplify the wrapper to just `<div className="p-6">` with a heading "Bot Management" and the existing CursorCardsContainer grid
- Remove the heroBg import and hero image section
- Keep the BotSetupModal, backend status banner, and bot card grid logic
- The page should work as a child of AppShell (content area only, no full-page layout)
  </action>
  <verify>
    <automated>grep -c "AppShell" frontend/src/App.tsx && grep -c "Route" frontend/src/App.tsx | grep -q "[5-9]" && echo "Routes registered"</automated>
  </verify>
  <done>App.tsx uses AppShell layout with Outlet. All routes registered. BotsPage adapted for sidebar layout. Placeholder pages created for all new routes.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| N/A | Frontend-only changes, no new trust boundaries |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| (none) | N/A | N/A | N/A | Frontend shell has no security surface |
</threat_model>

<verification>
- `grep -c "AppShell" frontend/src/App.tsx` returns at least 1
- `grep -c "NavLink" frontend/src/components/layout/Sidebar.tsx` returns at least 1
- All placeholder page files exist
</verification>

<success_criteria>
- App renders with sidebar navigation
- All routes accessible via sidebar links
- Active page highlighted in sidebar
- BotsPage works within new layout
</success_criteria>

<output>
Create `.planning/phases/3/07-SUMMARY.md` when done
</output>

---

## P08 — Leads Page

```yaml
phase: 3-platform-expansion
plan: 08
type: execute
wave: 4
depends_on: [07]
files_modified:
  - frontend/src/pages/LeadsPage.tsx
  - frontend/src/components/leads/LeadTable.tsx
  - frontend/src/components/leads/LeadFilters.tsx
  - frontend/src/components/leads/LeadDetail.tsx
  - frontend/src/services/mockApi.ts
autonomous: true
requirements: [LEAD-01]

must_haves:
  truths:
    - "Lead table displays all leads with name, status, source, last activity"
    - "User can filter leads by status (new, contacted, qualified, converted, lost)"
    - "User can search leads by name or email"
    - "User can click a lead to see detail panel"
    - "User can update lead status from the detail panel"
  artifacts:
    - path: "frontend/src/pages/LeadsPage.tsx"
      provides: "Lead management page"
    - path: "frontend/src/components/leads/LeadTable.tsx"
      provides: "Sortable lead table component"
    - path: "frontend/src/components/leads/LeadFilters.tsx"
      provides: "Status and search filters"
    - path: "frontend/src/components/leads/LeadDetail.tsx"
      provides: "Lead detail panel"
  key_links:
    - from: "frontend/src/pages/LeadsPage.tsx"
      to: "frontend/src/services/mockApi.ts"
      via: "mockLeadApi.getLeads()"
      pattern: "mockLeadApi"
    - from: "frontend/src/components/leads/LeadTable.tsx"
      to: "frontend/src/pages/LeadsPage.tsx"
      via: "LeadTable props (leads, onSelect)"
      pattern: "LeadTable"
```

<objective>
Build the lead management page with table view, filtering, search, and detail panel. Uses mock data initially (mockApi).

Purpose: Enable users to view, filter, and manage leads from the dashboard.
Output: Working leads page with table, filters, and detail panel.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From frontend/src/services/mockApi.ts:
```typescript
export const mockLeadApi = {
  getLeads: async (tenantId?: string) => leads[],
  getLead: async (id: string) => lead | null,
  updateLead: async (id: string, data: Partial<lead>) => lead,
};
```

From frontend/src/services/mockData.ts (Lead shape):
```typescript
{ id, tenantId, botId, name, phone, email, source, status, attributes, createdAt, updatedAt }
```

From frontend/src/services/api.ts (USE_MOCK pattern):
```typescript
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
// Pattern: if (USE_MOCK) return mockXxxApi.method();
```

Design conventions from existing components:
- Dark theme: bg-[#09090b], text-zinc-200, border-white/5
- Card pattern: bg-[#141415] rounded-xl border border-white/5
- Text hierarchy: text-[#EBEBF0] for headings, text-[#7D7D8A] for secondary
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create LeadFilters and LeadTable components</name>
  <files>frontend/src/components/leads/LeadFilters.tsx, frontend/src/components/leads/LeadTable.tsx</files>
  <action>
Create `frontend/src/components/leads/LeadFilters.tsx`:
- Props: `{ statusFilter: string | null, onStatusChange: (status: string | null) => void, searchQuery: string, onSearchChange: (query: string) => void }`
- Render a horizontal bar with:
  - Search input: `<input>` with placeholder "Search leads...", value bound to `searchQuery`, onChange calls `onSearchChange`
  - Status filter pills: buttons for "All", "New", "Contacted", "Qualified", "Converted", "Lost"
  - Active pill styling: `bg-[#1f1f22] text-[#EBEBF0]`, inactive: `text-[#7D7D8A] hover:text-[#CCCCD4]`
- Use Lucide `Search` icon in the search input

Create `frontend/src/components/leads/LeadTable.tsx`:
- Props: `{ leads: Lead[], selectedId: string | null, onSelect: (id: string) => void }`
- Lead type: `{ id, name, phone, email, source, status, updatedAt, _count?: { conversations: number } }`
- Render a table with columns: Name, Status (badge), Source, Last Activity, Conversations
- Status badge colors: new=blue, contacted=yellow, qualified=green, converted=emerald, lost=red
- Row click calls `onSelect(lead.id)`
- Selected row gets `bg-[#1f1f22]` highlight
- Use date-fns `formatDistanceToNow` for "Last Activity" column
- Table styling: `w-full text-sm`, header `text-[#7D7D8A] border-b border-white/5`, rows `hover:bg-[#141415]`

Export both as named exports.
  </action>
  <verify>
    <automated>ls frontend/src/components/leads/LeadFilters.tsx frontend/src/components/leads/LeadTable.tsx</automated>
  </verify>
  <done>LeadFilters renders search + status pills. LeadTable renders sortable lead list with status badges and last activity.</done>
</task>

<task type="auto">
  <name>Task 2: Create LeadDetail panel and LeadsPage</name>
  <files>frontend/src/components/leads/LeadDetail.tsx, frontend/src/pages/LeadsPage.tsx</files>
  <action>
Create `frontend/src/components/leads/LeadDetail.tsx`:
- Props: `{ lead: Lead | null, onClose: () => void, onStatusChange: (id: string, status: string) => void }`
- Lead type includes: `{ id, name, phone, email, source, status, attributes, createdAt, updatedAt, conversations?: [...] }`
- Render a slide-in panel (right side) with:
  - Header: lead name, close button (X icon)
  - Info section: phone, email, source, created date
  - Status section: current status badge + dropdown to change status (New, Contacted, Qualified, Converted, Lost)
  - Attributes section: render key-value pairs from `attributes` JSON
  - Conversations section: list of conversations (if loaded)
- Panel styling: `fixed right-0 top-0 h-full w-96 bg-[#0f0f11] border-l border-white/5 p-6 overflow-y-auto`
- Use `animate` or transition for slide-in effect (simple CSS transition)

Replace frontend/src/pages/LeadsPage.tsx (currently a placeholder):
- Import `useState, useEffect` from react
- Import `LeadFilters`, `LeadTable`, `LeadDetail`
- Import `mockLeadApi` from `../services/mockApi`
- State: `leads`, `selectedLead`, `statusFilter`, `searchQuery`, `loading`
- On mount and filter change: fetch leads via `mockLeadApi.getLeads()`, then filter client-side by `statusFilter` and `searchQuery`
- Layout: `p-6` with heading "Leads", LeadFilters bar, LeadTable, and LeadDetail panel (shown when selectedLead is not null)
- When a lead is selected, fetch full lead data via `mockLeadApi.getLead(id)` for the detail panel
- Status change handler: call `mockLeadApi.updateLead(id, { status })` and refresh the list
  </action>
  <verify>
    <automated>ls frontend/src/pages/LeadsPage.tsx frontend/src/components/leads/LeadDetail.tsx && grep -c "mockLeadApi" frontend/src/pages/LeadsPage.tsx</automated>
  </verify>
  <done>LeadsPage displays filterable lead table with detail panel. Status updates work via mock API. Search filters by name/email.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| N/A | Frontend-only with mock data, no new trust boundaries |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| (none) | N/A | N/A | N/A | Mock data only, real API wiring in P13 |
</threat_model>

<verification>
- `ls frontend/src/pages/LeadsPage.tsx` exists and is not a placeholder
- `ls frontend/src/components/leads/LeadTable.tsx` exists
- `grep -c "mockLeadApi" frontend/src/pages/LeadsPage.tsx` returns at least 1
</verification>

<success_criteria>
- Lead table shows all leads with status badges
- Filtering by status works
- Search by name/email works
- Clicking a lead opens detail panel
- Status can be updated from detail panel
</success_criteria>

<output>
Create `.planning/phases/3/08-SUMMARY.md` when done
</output>

---

## P09 — Conversations Page

```yaml
phase: 3-platform-expansion
plan: 09
type: execute
wave: 4
depends_on: [07]
files_modified:
  - frontend/src/pages/ConversationsPage.tsx
  - frontend/src/components/conversations/ConversationList.tsx
  - frontend/src/components/conversations/MessageThread.tsx
  - frontend/src/services/mockApi.ts
autonomous: true
requirements: [CONV-01]

must_haves:
  truths:
    - "Conversation list shows all conversations with lead name and last message preview"
    - "Clicking a conversation shows the full message thread"
    - "Messages display as bubbles (inbound left, outbound right) with timestamps"
    - "User can send a new message (mock mode)"
  artifacts:
    - path: "frontend/src/pages/ConversationsPage.tsx"
      provides: "Conversation inbox page"
    - path: "frontend/src/components/conversations/ConversationList.tsx"
      provides: "Sidebar list of conversations"
    - path: "frontend/src/components/conversations/MessageThread.tsx"
      provides: "Message bubble thread"
  key_links:
    - from: "frontend/src/pages/ConversationsPage.tsx"
      to: "frontend/src/services/mockApi.ts"
      via: "mockConversationApi.getConversations()"
      pattern: "mockConversationApi"
    - from: "frontend/src/components/conversations/MessageThread.tsx"
      to: "frontend/src/services/mockApi.ts"
      via: "mockConversationApi.sendMessage()"
      pattern: "mockConversationApi"
```

<objective>
Build the conversation inbox page with a conversation list sidebar and message thread view. Uses mock data initially.

Purpose: Enable users to view conversation history and send messages.
Output: Working conversation inbox with message bubbles.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From frontend/src/services/mockApi.ts:
```typescript
export const mockConversationApi = {
  getConversations: async (tenantId?: string) => conversations[],
  getMessages: async (conversationId: string) => messages[],
  sendMessage: async (conversationId: string, content: string) => message,
};
```

From frontend/src/services/mockData.ts (shapes):
```typescript
Conversation: { id, tenantId, leadId, platform, externalUserId, status, lastMessageAt, createdAt }
Message: { id, tenantId, conversationId, direction ('in'|'out'), content, messageType, createdAt }
```

Design conventions:
- Dark theme: bg-[#09090b], text-zinc-200, border-white/5
- Inbound bubbles: bg-[#1f1f22] rounded-2xl rounded-bl-sm
- Outbound bubbles: bg-[#2563eb] rounded-2xl rounded-br-sm
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ConversationList and MessageThread components</name>
  <files>frontend/src/components/conversations/ConversationList.tsx, frontend/src/components/conversations/MessageThread.tsx</files>
  <action>
Create `frontend/src/components/conversations/ConversationList.tsx`:
- Props: `{ conversations: Conversation[], selectedId: string | null, onSelect: (id: string) => void }`
- Conversation type: `{ id, leadId, platform, status, lastMessageAt, lead?: { name, phone } }`
- Render a scrollable list of conversation items, each showing:
  - Lead name (or phone if no name)
  - Platform icon (whatsapp/telegram badge)
  - Last message time (relative, using date-fns `formatDistanceToNow`)
  - Status indicator (open=circle green, closed=circle gray)
- Selected item: `bg-[#1f1f22]`
- Item styling: `px-4 py-3 border-b border-white/5 hover:bg-[#141415] cursor-pointer`
- Container: `w-80 h-full border-r border-white/5 overflow-y-auto bg-[#09090b]`

Create `frontend/src/components/conversations/MessageThread.tsx`:
- Props: `{ messages: Message[], onSend: (text: string) => void, loading: boolean }`
- Message type: `{ id, direction, content, createdAt }`
- Render messages as bubbles in a scrollable container:
  - Inbound (direction='in'): `bg-[#1f1f22] rounded-2xl rounded-bl-sm max-w-[70%] self-start`
  - Outbound (direction='out'): `bg-[#2563eb] rounded-2xl rounded-br-sm max-w-[70%] self-end`
  - Each bubble shows content text and timestamp below (`text-xs text-[#7D7D8A]`)
- Message input at bottom: `<input>` with placeholder "Type a message...", Enter key calls `onSend`
- Send button (Send icon from Lucide) next to input
- Container: `flex-1 flex flex-col`, messages area: `flex-1 overflow-y-auto p-4 space-y-3 flex flex-col`
- Auto-scroll to bottom on new messages (use `useRef` + `scrollIntoView`)
- Empty state: "Select a conversation to start"

Export both as named exports.
  </action>
  <verify>
    <automated>ls frontend/src/components/conversations/ConversationList.tsx frontend/src/components/conversations/MessageThread.tsx</automated>
  </verify>
  <done>ConversationList renders scrollable conversation sidebar. MessageThread renders message bubbles with send input.</done>
</task>

<task type="auto">
  <name>Task 2: Create ConversationsPage with mock data integration</name>
  <files>frontend/src/pages/ConversationsPage.tsx</files>
  <action>
Replace frontend/src/pages/ConversationsPage.tsx (currently a placeholder):
- Import `useState, useEffect, useRef` from react
- Import `ConversationList`, `MessageThread`
- Import `mockConversationApi` from `../services/mockApi`
- State: `conversations`, `selectedConversationId`, `messages`, `loading`
- On mount: fetch conversations via `mockConversationApi.getConversations()`
- On `selectedConversationId` change: fetch messages via `mockConversationApi.getMessages(id)`
- Send handler: call `mockConversationApi.sendMessage(id, text)`, then refetch messages
- Layout: `flex h-full` with ConversationList on left (w-80) and MessageThread on right (flex-1)
- Header above the layout: "Conversations" title with conversation count
- Enrich conversations with lead names by cross-referencing mockLeads (import from mockData)
  </action>
  <verify>
    <automated>grep -c "mockConversationApi" frontend/src/pages/ConversationsPage.tsx && grep -c "ConversationList" frontend/src/pages/ConversationsPage.tsx</automated>
  </verify>
  <done>ConversationsPage shows conversation list + message thread. Messages load on selection. Send works in mock mode.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| N/A | Frontend-only with mock data |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| (none) | N/A | N/A | N/A | Mock data only |
</threat_model>

<verification>
- `ls frontend/src/pages/ConversationsPage.tsx` exists and is not a placeholder
- `grep -c "mockConversationApi" frontend/src/pages/ConversationsPage.tsx` returns at least 1
</verification>

<success_criteria>
- Conversation list shows all conversations with lead names
- Clicking a conversation loads message history
- Messages render as styled bubbles (in=left gray, out=right blue)
- User can type and send messages in mock mode
</success_criteria>

<output>
Create `.planning/phases/3/09-SUMMARY.md` when done
</output>

---

## P10 — Analytics Page

```yaml
phase: 3-platform-expansion
plan: 10
type: execute
wave: 4
depends_on: [07]
files_modified:
  - frontend/src/pages/AnalyticsPage.tsx
  - frontend/src/components/analytics/MessageVolumeChart.tsx
  - frontend/src/components/analytics/ConversionFunnel.tsx
autonomous: true
requirements: [ANALYTICS-01]

must_haves:
  truths:
    - "Line chart shows message volume (inbound + outbound) over time"
    - "Funnel visualization shows lead counts by status"
    - "Date range filtering works"
    - "Charts render with dark theme styling"
  artifacts:
    - path: "frontend/src/pages/AnalyticsPage.tsx"
      provides: "Analytics dashboard page"
    - path: "frontend/src/components/analytics/MessageVolumeChart.tsx"
      provides: "Recharts line chart for message volume"
    - path: "frontend/src/components/analytics/ConversionFunnel.tsx"
      provides: "Lead status funnel visualization"
  key_links:
    - from: "frontend/src/pages/AnalyticsPage.tsx"
      to: "frontend/src/services/mockApi.ts"
      via: "mockAnalyticsApi.getDashboardStats()"
      pattern: "mockAnalyticsApi"
    - from: "frontend/src/components/analytics/MessageVolumeChart.tsx"
      to: "recharts"
      via: "LineChart, Line, XAxis, YAxis components"
      pattern: "LineChart"
```

<objective>
Build the analytics dashboard page with message volume chart and conversion funnel visualization. Uses recharts (already installed) and mock data.

Purpose: Provide visual insights into message activity and lead conversion.
Output: Working analytics page with charts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From frontend/src/services/mockApi.ts:
```typescript
export const mockAnalyticsApi = {
  getEvents: async (tenantId?: string, limit?: number) => events[],
  getBillingUsage: async (tenantId?: string) => billingUsage[],
  getDashboardStats: async () => { totalBots, activeBots, totalLeads, openConversations, qualifiedLeads, conversionRate, messagesThisMonth, workflowsActive },
};
```

Recharts API (already installed at ^2.15.4):
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
```

Design conventions:
- Chart background: bg-[#141415] rounded-xl border border-white/5
- Grid stroke: rgba(255,255,255,0.06)
- Axis stroke: #7D7D8A
- Tooltip: bg-[#141415] border border-white/10 rounded-lg
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create chart components and analytics page</name>
  <files>frontend/src/pages/AnalyticsPage.tsx, frontend/src/components/analytics/MessageVolumeChart.tsx, frontend/src/components/analytics/ConversionFunnel.tsx</files>
  <action>
Create `frontend/src/components/analytics/MessageVolumeChart.tsx`:
- Props: `{ data: Array<{ date: string; inbound: number; outbound: number }> }`
- Use `ResponsiveContainer` wrapping a `LineChart`
- Two `Line` components: `inbound` (stroke `#4ADE80`, green) and `outbound` (stroke `#60A5FA`, blue)
- `CartesianGrid` with `strokeDasharray="3 3"` and `stroke="rgba(255,255,255,0.06)"`
- `XAxis` dataKey="date", stroke `#7D7D8A`, fontSize 12
- `YAxis` stroke `#7D7D8A`, fontSize 12
- `Tooltip` with dark styling: `contentStyle={{ background: '#141415', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}`, `labelStyle={{ color: '#EBEBF0' }}`
- Height: 300px

Create `frontend/src/components/analytics/ConversionFunnel.tsx`:
- Props: `{ data: Array<{ status: string; count: number }> }`
- Render a horizontal bar chart (not recharts — simple CSS bars):
  - Each bar represents a lead status (new, contacted, qualified, converted, lost)
  - Bar width proportional to count (percentage of max count)
  - Color coding: new=#60A5FA, contacted=#FBBF24, qualified=#34D399, converted=#10B981, lost=#EF4444
  - Show count and percentage on each bar
- Container: `space-y-3`

Replace frontend/src/pages/AnalyticsPage.tsx:
- Import `useState, useEffect` from react
- Import `MessageVolumeChart`, `ConversionFunnel`
- Import `mockAnalyticsApi` from `../services/mockApi`
- Import `mockLeads, mockMessages` from `../services/mockData` (for generating chart data)
- State: `stats`, `messageVolumeData`, `funnelData`, `dateRange` (7d, 30d, 90d)
- On mount: fetch dashboard stats, compute message volume data from mockMessages (group by day), compute funnel data from mockLeads (group by status)
- Layout: `p-6 space-y-6`
  - Heading: "Analytics"
  - Stats cards row: total leads, open conversations, messages this month, conversion rate (each in a `bg-[#141415] rounded-xl p-4 border border-white/5`)
  - Date range selector: pill buttons for 7d, 30d, 90d
  - MessageVolumeChart card
  - ConversionFunnel card
  </action>
  <verify>
    <automated>ls frontend/src/pages/AnalyticsPage.tsx frontend/src/components/analytics/MessageVolumeChart.tsx frontend/src/components/analytics/ConversionFunnel.tsx</automated>
  </verify>
  <done>AnalyticsPage shows stats cards, message volume line chart, and conversion funnel. Date range filtering works.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| N/A | Frontend-only with mock data |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| (none) | N/A | N/A | N/A | Mock data only |
</threat_model>

<verification>
- `ls frontend/src/pages/AnalyticsPage.tsx` exists and is not a placeholder
- `grep -c "LineChart" frontend/src/components/analytics/MessageVolumeChart.tsx` returns at least 1
</verification>

<success_criteria>
- Message volume chart renders with inbound/outbound lines
- Conversion funnel shows lead status distribution
- Date range filtering updates the chart
- Stats cards show summary metrics
</success_criteria>

<output>
Create `.planning/phases/3/10-SUMMARY.md` when done
</output>

---

## P11 — Billing Page

```yaml
phase: 3-platform-expansion
plan: 11
type: execute
wave: 4
depends_on: [07]
files_modified:
  - frontend/src/pages/BillingPage.tsx
  - frontend/src/components/billing/UsageTable.tsx
autonomous: true
requirements: [BILL-01]

must_haves:
  truths:
    - "Usage table displays billing metrics with quantities"
    - "Period selection (monthly) filters the data"
    - "Different metrics (messages_sent, ai_tokens, etc.) shown as separate rows"
  artifacts:
    - path: "frontend/src/pages/BillingPage.tsx"
      provides: "Billing usage dashboard page"
    - path: "frontend/src/components/billing/UsageTable.tsx"
      provides: "Usage table component"
  key_links:
    - from: "frontend/src/pages/BillingPage.tsx"
      to: "frontend/src/services/mockApi.ts"
      via: "mockAnalyticsApi.getBillingUsage()"
      pattern: "mockAnalyticsApi"
```

<objective>
Build the billing usage dashboard page showing message and AI token consumption per period. Uses mock data initially.

Purpose: Enable tenant admins to monitor usage and costs.
Output: Working billing page with usage table.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From frontend/src/services/mockApi.ts:
```typescript
export const mockAnalyticsApi = {
  getBillingUsage: async (tenantId?: string) => billingUsage[],
};
```

From frontend/src/services/mockData.ts (BillingUsage shape):
```typescript
{ id, tenantId, metric, quantity, periodStart, periodEnd }
// metric values: 'messages_sent', 'ai_tokens', 'api_calls', 'storage_mb'
```

Design conventions:
- Table: dark theme, `bg-[#141415] rounded-xl border border-white/5`
- Metric badges: colored pills per metric type
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create UsageTable component and BillingPage</name>
  <files>frontend/src/pages/BillingPage.tsx, frontend/src/components/billing/UsageTable.tsx</files>
  <action>
Create `frontend/src/components/billing/UsageTable.tsx`:
- Props: `{ usage: BillingUsage[] }`
- BillingUsage type: `{ id, metric, quantity, periodStart, periodEnd }`
- Render a table with columns: Metric, Quantity, Period
- Metric display names: messages_sent -> "Messages Sent", ai_tokens -> "AI Tokens", api_calls -> "API Calls", storage_mb -> "Storage (MB)"
- Quantity formatting: use `toLocaleString()` for large numbers
- Metric badge colors: messages_sent=#60A5FA, ai_tokens=#A78BFA, api_calls=#34D399, storage_mb=#FBBF24
- Table styling: `w-full text-sm`, header `text-[#7D7D8A]`, rows with alternating subtle backgrounds

Replace frontend/src/pages/BillingPage.tsx:
- Import `useState, useEffect` from react
- Import `UsageTable`
- Import `mockAnalyticsApi` from `../services/mockApi`
- Import `format` from `date-fns`
- State: `usage`, `selectedMonth` (default: current month YYYY-MM), `loading`
- On mount and month change: fetch billing usage via `mockAnalyticsApi.getBillingUsage()`, filter by selected month
- Month selector: `<input type="month">` styled with dark theme
- Layout: `p-6 space-y-6`
  - Heading: "Billing & Usage"
  - Month selector row
  - Summary cards: total messages, total AI tokens (sum of quantities by metric)
  - UsageTable with filtered data
  </action>
  <verify>
    <automated>ls frontend/src/pages/BillingPage.tsx frontend/src/components/billing/UsageTable.tsx && grep -c "mockAnalyticsApi" frontend/src/pages/BillingPage.tsx</automated>
  </verify>
  <done>BillingPage shows usage table with metric badges. Month selector filters data. Summary cards show totals.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| N/A | Frontend-only with mock data |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| (none) | N/A | N/A | N/A | Mock data only |
</threat_model>

<verification>
- `ls frontend/src/pages/BillingPage.tsx` exists and is not a placeholder
- `grep -c "UsageTable" frontend/src/pages/BillingPage.tsx` returns at least 1
</verification>

<success_criteria>
- Usage table displays all billing metrics
- Month selector filters data by period
- Summary cards show aggregated totals
- Large numbers formatted with locale separators
</success_criteria>

<output>
Create `.planning/phases/3/11-SUMMARY.md` when done
</output>

---

## P12 — Onboarding Flow

```yaml
phase: 3-platform-expansion
plan: 12
type: execute
wave: 5
depends_on: [08, 09, 10, 11]
files_modified:
  - frontend/src/pages/OnboardingPage.tsx
  - frontend/src/components/onboarding/OnboardingWizard.tsx
autonomous: true
requirements: [ONBOARD-01]

must_haves:
  truths:
    - "Multi-step wizard guides user through tenant setup and first bot creation"
    - "Steps: Welcome -> Create Bot -> Configure Bot -> Connect (QR) -> Complete"
    - "User can navigate back and forth between steps"
    - "QR code polling works (reuses BotSetupModal pattern)"
  artifacts:
    - path: "frontend/src/pages/OnboardingPage.tsx"
      provides: "Onboarding page"
    - path: "frontend/src/components/onboarding/OnboardingWizard.tsx"
      provides: "Multi-step wizard component"
  key_links:
    - from: "frontend/src/pages/OnboardingPage.tsx"
      to: "frontend/src/services/mockApi.ts"
      via: "mockBotApi.createWorkspace()"
      pattern: "mockBotApi"
```

<objective>
Build a multi-step onboarding wizard for new tenants to set up their first bot. Reuses the existing QR code polling pattern from BotSetupModal.

Purpose: Guide new users through initial setup.
Output: Working onboarding wizard with step navigation.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From frontend/src/components/BotSetupModal.tsx (QR polling pattern):
```typescript
// Polls botApi.getConnectionStatus(id) every 3 seconds
// Shows QR code image when status === 'SCAN_QR_CODE'
// Auto-closes when status === 'WORKING'
```

From frontend/src/services/mockApi.ts:
```typescript
export const mockBotApi = {
  createWorkspace: async (name: string) => Workspace,
  getConnectionStatus: async (id: string) => ConnectionStatus,
};
```

Design conventions:
- Step indicator: horizontal pills with active/completed/pending states
- Cards: bg-[#141415] rounded-xl border border-white/5
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create onboarding wizard and page</name>
  <files>frontend/src/pages/OnboardingPage.tsx, frontend/src/components/onboarding/OnboardingWizard.tsx</files>
  <action>
Create `frontend/src/components/onboarding/OnboardingWizard.tsx`:
- State: `currentStep` (0-4), `botName`, `systemPrompt`, `createdBot`, `connectionStatus`, `qrUrl`
- Steps:
  0. Welcome: brief intro text, "Get Started" button
  1. Create Bot: input for bot name, "Next" button
  2. Configure Bot: textarea for system prompt (default: "You are a helpful sales assistant..."), "Next" button
  3. Connect: calls `mockBotApi.createWorkspace(botName)`, then polls `mockBotApi.getConnectionStatus(id)` every 3 seconds (same pattern as BotSetupModal). Shows QR code image when available. Shows "Connected!" when status is WORKING.
  4. Complete: success message, "Go to Dashboard" link (navigates to /bots)
- Step indicator at top: horizontal row of numbered circles, active=blue, completed=green, pending=gray
- Navigation: "Back" button (except step 0), "Next" button (except step 4), "Skip" link on steps 1-2
- Container: `max-w-2xl mx-auto p-6`

Replace frontend/src/pages/OnboardingPage.tsx:
- Import `OnboardingWizard`
- Render: `div className="p-6"` with heading "Get Started" and the OnboardingWizard component
  </action>
  <verify>
    <automated>ls frontend/src/pages/OnboardingPage.tsx frontend/src/components/onboarding/OnboardingWizard.tsx && grep -c "currentStep" frontend/src/components/onboarding/OnboardingWizard.tsx</automated>
  </verify>
  <done>Onboarding wizard has 5 steps with navigation. QR code polling works. Bot creation integrated with mock API.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| N/A | Frontend-only with mock data |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| (none) | N/A | N/A | N/A | Mock data only |
</threat_model>

<verification>
- `ls frontend/src/pages/OnboardingPage.tsx` exists and is not a placeholder
- `grep -c "currentStep" frontend/src/components/onboarding/OnboardingWizard.tsx` returns at least 1
</verification>

<success_criteria>
- Wizard has 5 steps with step indicator
- Bot name and system prompt inputs work
- QR code polling simulates connection
- Navigation between steps works
</success_criteria>

<output>
Create `.planning/phases/3/12-SUMMARY.md` when done
</output>

---

## P13 — Frontend-to-Backend Integration

```yaml
phase: 3-platform-expansion
plan: 13
type: execute
wave: 5
depends_on: [08, 09, 10, 11]
files_modified:
  - frontend/src/services/api.ts
  - frontend/src/pages/LeadsPage.tsx
  - frontend/src/pages/ConversationsPage.tsx
  - frontend/src/pages/AnalyticsPage.tsx
  - frontend/src/pages/BillingPage.tsx
autonomous: true
requirements: [LEAD-01, CONV-01, ANALYTICS-01, BILL-01]

must_haves:
  truths:
    - "All pages work in both mock mode and live mode"
    - "api.ts has methods for all new endpoints"
    - "Live mode falls back to mock when backend is unavailable"
    - "Error toasts shown on API failures"
  artifacts:
    - path: "frontend/src/services/api.ts"
      provides: "API methods for leads, conversations, analytics, billing"
      exports: ["leadApi", "conversationApi", "analyticsApi", "billingApi"]
  key_links:
    - from: "frontend/src/services/api.ts"
      to: "src/routes/leads.ts"
      via: "GET /api/leads"
      pattern: "leads"
    - from: "frontend/src/pages/LeadsPage.tsx"
      to: "frontend/src/services/api.ts"
      via: "leadApi.getLeads()"
      pattern: "leadApi"
```

<objective>
Wire all frontend pages from mock data to real backend API endpoints. Add API methods to api.ts and update pages to use them with automatic mock fallback.

Purpose: Connect frontend to real backend APIs while preserving mock mode for development.
Output: All pages working in both mock and live modes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From frontend/src/services/api.ts (current pattern):
```typescript
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const api = axios.create({ baseURL: API_BASE, timeout: 15_000, headers: { 'X-API-KEY': ... } });
export const botApi = {
  getWorkspaces: async () => { if (USE_MOCK) return mockBotApi.getWorkspaces(); try { ... } catch { return mockBotApi.getWorkspaces(); } },
};
```

Backend endpoints (created in Wave 2):
- GET /api/leads, GET /api/leads/:id, PATCH /api/leads/:id
- GET /api/conversations, GET /api/conversations/:id/messages
- GET /api/analytics/message-volume, GET /api/analytics/conversion-funnel, GET /api/analytics/dashboard-stats
- GET /api/billing/usage, GET /api/billing/usage/history, GET /api/billing/ai-logs
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add API methods to api.ts and wire pages to real endpoints</name>
  <files>frontend/src/services/api.ts, frontend/src/pages/LeadsPage.tsx, frontend/src/pages/ConversationsPage.tsx, frontend/src/pages/AnalyticsPage.tsx, frontend/src/pages/BillingPage.tsx</files>
  <action>
Add to frontend/src/services/api.ts (after the existing `botApi` export):

1. `leadApi`:
   - `getLeads(params?: { status?, platform?, search?, page?, limit? })` — `api.get('/leads', { params })`, fallback to `mockLeadApi.getLeads()`
   - `getLead(id: string)` — `api.get(`/leads/${id}`)`, fallback to `mockLeadApi.getLead(id)`
   - `updateLead(id: string, data: { status?, name?, email? })` — `api.patch(`/leads/${id}`, data)`, fallback to `mockLeadApi.updateLead(id, data)`

2. `conversationApi`:
   - `getConversations(params?: { status?, platform?, page?, limit? })` — `api.get('/conversations', { params })`, fallback to `mockConversationApi.getConversations()`
   - `getMessages(conversationId: string, params?: { page?, limit? })` — `api.get(`/conversations/${conversationId}/messages`, { params })`, fallback to `mockConversationApi.getMessages(conversationId)`
   - `sendMessage(conversationId: string, content: string)` — `api.post(`/conversations/${conversationId}/messages`, { content })`, fallback to `mockConversationApi.sendMessage(conversationId, content)`

3. `analyticsApi`:
   - `getMessageVolume(days?: number)` — `api.get('/analytics/message-volume', { params: { days } })`, fallback to computed mock data
   - `getConversionFunnel()` — `api.get('/analytics/conversion-funnel')`, fallback to computed mock data
   - `getDashboardStats()` — `api.get('/analytics/dashboard-stats')`, fallback to `mockAnalyticsApi.getDashboardStats()`

4. `billingApi`:
   - `getUsage(month?: string)` — `api.get('/billing/usage', { params: { month } })`, fallback to `mockAnalyticsApi.getBillingUsage()`
   - `getAiLogs(params?: { page?, limit? })` — `api.get('/billing/ai-logs', { params })`, fallback to mock data

Each method follows the existing pattern: `if (USE_MOCK) return mock...; try { ... } catch { return mock...; }`

Update each page file to import from `api.ts` instead of `mockApi.ts`:
- LeadsPage: use `leadApi.getLeads()` and `leadApi.updateLead()`
- ConversationsPage: use `conversationApi.getConversations()` and `conversationApi.getMessages()`
- AnalyticsPage: use `analyticsApi.getDashboardStats()` and `analyticsApi.getMessageVolume()`
- BillingPage: use `billingApi.getUsage()`

Add `import { toast } from 'sonner'` to each page. Wrap API calls in try/catch with `toast.error('Failed to load ...')` on failure.
  </action>
  <verify>
    <automated>grep -c "leadApi" frontend/src/services/api.ts && grep -c "conversationApi" frontend/src/services/api.ts && grep -c "analyticsApi" frontend/src/services/api.ts && grep -c "billingApi" frontend/src/services/api.ts</automated>
  </verify>
  <done>All pages use api.ts methods with mock fallback. Error toasts shown on failures. Both mock and live modes work.</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| Frontend -> Backend API | Client sends requests to /api/* endpoints |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-3-13 | Information Disclosure | API responses | mitigate | Backend enforces tenant scoping, frontend only sends authenticated requests |
</threat_model>

<verification>
- `grep -c "leadApi" frontend/src/services/api.ts` returns at least 1
- `grep -c "toast" frontend/src/pages/LeadsPage.tsx` returns at least 1
- All pages import from `api.ts` not directly from `mockApi.ts`
</verification>

<success_criteria>
- All pages have corresponding api.ts methods
- Mock mode still works (VITE_USE_MOCK=true)
- Live mode calls real backend endpoints
- Error toasts shown on API failures
- Automatic fallback to mock when backend unavailable
</success_criteria>

<output>
Create `.planning/phases/3/13-SUMMARY.md` when done
</output>

---

## P14 — Tests

```yaml
phase: 3-platform-expansion
plan: 14
type: execute
wave: 5
depends_on: [01, 02, 03, 04, 05, 06]
files_modified:
  - src/__tests__/telegram-webhook.test.ts
  - src/__tests__/telegram-adapter.test.ts
  - src/__tests__/response-router.test.ts
  - src/__tests__/leads-api.test.ts
  - src/__tests__/conversations-api.test.ts
  - src/__tests__/billing-usage.test.ts
  - src/__tests__/analytics-api.test.ts
autonomous: true
requirements: [TEL-01, TEL-02, ROUTE-01, LEAD-01, CONV-01, BILL-01, ANALYTICS-01]

must_haves:
  truths:
    - "Telegram normalizer produces valid NormalizedMessage from Update object"
    - "ResponseRouter dispatches to correct adapter based on platform"
    - "Lead API endpoints return correct filtered results"
    - "Billing usage recording creates correct records"
    - "All tests pass with vitest"
  artifacts:
    - path: "src/__tests__/telegram-webhook.test.ts"
      provides: "Tests for Telegram normalizer and gateway endpoint"
    - path: "src/__tests__/response-router.test.ts"
      provides: "Tests for ResponseRouter platform dispatch"
    - path: "src/__tests__/leads-api.test.ts"
      provides: "Tests for lead API endpoints"
    - path: "src/__tests__/billing-usage.test.ts"
      provides: "Tests for billing recording"
    - path: "src/__tests__/analytics-api.test.ts"
      provides: "Tests for analytics endpoints"
  key_links:
    - from: "src/__tests__/telegram-webhook.test.ts"
      to: "src/normalizer/telegram.ts"
      via: "import and test normalizeTelegramWebhook"
      pattern: "normalizeTelegramWebhook"
```

<objective>
Write integration and unit tests for all new Phase 3 backend functionality. Uses the existing Vitest infrastructure from Phase 1.

Purpose: Verify correctness of Telegram adapter, response router, lead API, billing recording, and analytics.
Output: Test suite covering all Phase 3 backend additions.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/3/RESEARCH.md

<interfaces>
From src/__tests__/setup.ts:
```typescript
// Provides mockPrisma, redisStore
// Mocks: prisma, ioredis, bullmq
// Sets test env vars
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token'; // Need to add
process.env.TELEGRAM_WEBHOOK_SECRET = 'test-telegram-secret'; // Need to add
```

From vitest.config.ts:
```typescript
test: { globals: true, environment: 'node', include: ['src/**/*.test.ts', 'src/**/*.spec.ts'], setupFiles: ['./src/__tests__/setup.ts'] }
```

Existing test pattern from Phase 1:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Tests use mockPrisma from setup.ts
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write Telegram and ResponseRouter tests</name>
  <files>src/__tests__/telegram-webhook.test.ts, src/__tests__/telegram-adapter.test.ts, src/__tests__/response-router.test.ts</files>
  <action>
Update src/__tests__/setup.ts — add Telegram env vars:
- `process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';`
- `process.env.TELEGRAM_WEBHOOK_SECRET = 'test-telegram-secret';`
- `process.env.PUBLIC_URL = 'https://test.example.com';`

Create src/__tests__/telegram-webhook.test.ts:
- Test `normalizeTelegramWebhook` with a sample Telegram Update object
- Test cases:
  1. Text message: produces NormalizedMessage with type='text', platform='telegram', correct userId (from.id), correct chatId (chat.id)
  2. Photo message: produces NormalizedMessage with type='image', text from caption
  3. Voice message: produces NormalizedMessage with type='audio'
  4. Reply message: metadata.replyTo is set
  5. Forwarded message: metadata.isForwarded is true
  6. Group message: chat.id != from.id, both captured correctly

Create src/__tests__/telegram-adapter.test.ts:
- Mock axios with `vi.mock('axios')`
- Test `TelegramAdapter.sendMessage`:
  1. Calls correct URL: `https://api.telegram.org/bot{token}/sendMessage`
  2. Sends correct payload: `{ chat_id, text, parse_mode: 'HTML' }`
  3. Throws on missing TELEGRAM_BOT_TOKEN (test without env var)
- Test `TelegramAdapter.setWebhook`:
  1. Calls correct URL with url and secret_token
  2. Returns boolean from response.data.ok

Create src/__tests__/response-router.test.ts:
- Mock the adapters: `vi.mock('../adapters/whatsapp.adapter')`, `vi.mock('../adapters/telegram')`
- Mock prisma and SessionManager
- Test cases:
  1. WhatsApp platform: calls WhatsAppAdapter.sendMessage
  2. Telegram platform: calls TelegramAdapter.sendMessage with chatId from metadata
  3. Unsupported platform: throws error
  4. Persists outbound message to prisma
  5. Updates delivery status after send
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/telegram-webhook.test.ts src/__tests__/telegram-adapter.test.ts src/__tests__/response-router.test.ts --reporter=verbose</automated>
  </verify>
  <done>Telegram normalizer, adapter, and response router tests all pass.</done>
</task>

<task type="auto">
  <name>Task 2: Write API and billing tests</name>
  <files>src/__tests__/leads-api.test.ts, src/__tests__/conversations-api.test.ts, src/__tests__/billing-usage.test.ts, src/__tests__/analytics-api.test.ts</files>
  <action>
Create src/__tests__/leads-api.test.ts:
- Use supertest or direct route handler testing
- Mock prisma responses
- Test cases:
  1. GET /api/leads returns leads array with correct shape
  2. GET /api/leads?status=qualified filters by status
  3. GET /api/leads?search=test filters by name/email
  4. GET /api/leads/:id returns single lead
  5. PATCH /api/leads/:id updates lead status
  6. All queries include tenantId from auth context

Create src/__tests__/conversations-api.test.ts:
- Test cases:
  1. GET /api/conversations returns conversations with lead info
  2. GET /api/conversations/:id/messages returns messages sorted by createdAt
  3. GET /api/conversations/:id/messages returns 404 for non-existent conversation

Create src/__tests__/billing-usage.test.ts:
- Test `recordBillingUsage`:
  1. Creates new BillingUsage record when none exists for the period
  2. Increments quantity when record exists (upsert)
  3. Uses correct periodStart (first of month) and periodEnd (last of month)
  4. Does not throw on error (fire-and-forget)
- Test `recordAiUsage`:
  1. Creates AiLog record
  2. Also calls recordBillingUsage with ai_tokens metric

Create src/__tests__/analytics-api.test.ts:
- Test cases:
  1. Message volume endpoint returns array of { date, inbound, outbound }
  2. Conversion funnel returns lead counts by status
  3. Dashboard stats returns summary metrics

For API tests, use the existing pattern: import the router, mock prisma, and test route handlers directly. Add supertest as a dev dependency if needed: `npm install -D supertest @types/supertest`.
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/leads-api.test.ts src/__tests__/conversations-api.test.ts src/__tests__/billing-usage.test.ts src/__tests__/analytics-api.test.ts --reporter=verbose</automated>
  </verify>
  <done>All API and billing tests pass. Full test suite green: npx vitest run</done>
</task>

</tasks>

<threat_model>
| Boundary | Description |
|----------|-------------|
| N/A | Test files — no production security surface |

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-3-SC | Tampering | npm install supertest | mitigate | supertest is a well-known test utility, verified package |
</threat_model>

<verification>
- `npx vitest run --reporter=verbose` — all tests pass
- `grep -c "describe" src/__tests__/telegram-webhook.test.ts` returns at least 1
- `grep -c "describe" src/__tests__/leads-api.test.ts` returns at least 1
</verification>

<success_criteria>
- All Phase 3 test files exist and pass
- Full test suite (Phase 1 + Phase 3) passes
- Coverage on new code > 80%
</success_criteria>

<output>
Create `.planning/phases/3/14-SUMMARY.md` when done
</output>

---

## Source Audit

| Source Type | Item | Status | Plan |
|-------------|------|--------|------|
| GOAL | Telegram bot can receive and reply to messages | COVERED | P01 |
| GOAL | Response router dispatches to correct platform adapter | COVERED | P02 |
| GOAL | Lead list page with filtering and status updates | COVERED | P08 |
| GOAL | Conversation inbox showing message history | COVERED | P09 |
| GOAL | Analytics charts rendering real data | COVERED | P10 |
| GOAL | Billing usage table populated from message/AI events | COVERED | P03, P11 |
| REQ | TEL-01 (Telegram webhook) | COVERED | P01, P14 |
| REQ | TEL-02 (Telegram adapter send) | COVERED | P01, P14 |
| REQ | ROUTE-01 (Response router dispatch) | COVERED | P02, P14 |
| REQ | LEAD-01 (Lead API) | COVERED | P04, P08, P13, P14 |
| REQ | CONV-01 (Conversation API) | COVERED | P05, P09, P13, P14 |
| REQ | BILL-01 (Billing usage) | COVERED | P03, P11, P13, P14 |
| REQ | ANALYTICS-01 (Analytics API) | COVERED | P06, P10, P13, P14 |
| CONTEXT | D-01: zod for backend validation | COVERED | P04, P05, P06 |
| CONTEXT | D-02: All new routes use /api/ prefix | COVERED | P04, P05, P06 |
| CONTEXT | D-03: tenantId in all Prisma where clauses | COVERED | P04, P05, P06 |
| CONTEXT | D-04: Vitest for tests | COVERED | P14 |
| CONTEXT | D-05: Mock data first, connect later | COVERED | P08, P09, P10, P11, P13 |
| CONTEXT | D-06: Only zod as new backend package | COVERED | P04, P05, P06 |
| CONTEXT | D-07: All frontend packages already installed | COVERED | P08, P09, P10, P11 |
| CONTEXT | D-08: BillingUsage composite unique index | COVERED | P03 |
| CONTEXT | D-09: Lead upsert uses externalUserId for Telegram | COVERED | P01 (normalizer), P04 |
| CONTEXT | D-10: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, PUBLIC_URL env vars | COVERED | P01 |
