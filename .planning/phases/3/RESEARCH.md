# Phase 3: Platform Expansion & Product UI - Research

**Researched:** 2026-05-19
**Domain:** Telegram Bot API, multi-platform message routing, React dashboard UI, SaaS billing tracking
**Confidence:** HIGH

## Summary

Phase 3 transforms CrmV2 from a WhatsApp-only backend into a multi-platform CRM with a production-ready frontend. The backend already has the architectural skeleton for multi-platform support: a `NormalizedMessage` type that includes `platform: 'telegram'`, a gateway route stub for Telegram, and a 31-line Telegram adapter with only outbound `sendMessage`. The frontend has a single `/bots` page with extensive mock data already seeded for leads, conversations, messages, billing usage, and analytics.

The primary technical work is: (1) completing the Telegram inbound webhook pipeline (webhook handler, normalizer, queue, worker integration), (2) extracting the outbound dispatch from the worker into a unified response router that selects the correct platform adapter, (3) building 5-6 new frontend pages using the existing design system (Radix UI + Tailwind dark theme + recharts), and (4) wiring the existing `BillingUsage` and `AiLog` Prisma models to actually record data.

**Primary recommendation:** Build the Telegram adapter and response router first (backend), then build all frontend pages against mock data (already seeded), then connect frontend to real backend APIs. This follows the project's established pattern of frontend independence via mock mode.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Telegram webhook ingestion | API / Backend (gateway.ts) | -- | Webhooks arrive at Express, must validate and normalize |
| Message normalization | API / Backend (normalizer/) | -- | Platform-specific payload -> NormalizedMessage |
| Message queuing | API / Backend (queue/) | -- | BullMQ queues are backend infrastructure |
| Response routing | API / Backend (router/) | -- | Dispatch outbound to correct platform adapter |
| Lead management UI | Browser / Client | API / Backend | Frontend renders, backend provides CRUD APIs |
| Conversation inbox | Browser / Client | API / Backend | Frontend renders message history, backend serves data |
| Analytics charts | Browser / Client | API / Backend | Frontend renders recharts, backend aggregates data |
| Billing tracking | API / Backend (worker) | Database / Storage | Worker writes BillingUsage/AiLog on each message/AI call |
| Billing dashboard | Browser / Client | API / Backend | Frontend renders usage data, backend serves aggregates |
| Onboarding wizard | Browser / Client | API / Backend | Multi-step form, backend creates tenant + first bot |

## Standard Stack

### Core (no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axios | ^1.15.2 | HTTP client for Telegram Bot API | Already used for Evolution API calls |
| bullmq | ^5.76.0 | Job queue for telegram-messages | Already used for whatsapp-messages |
| ioredis | ^5.10.1 | Redis client for queue + rate limiting | Already used |
| express | ^5.2.1 | Webhook endpoint hosting | Already the API server |
| recharts | ^2.15.4 | Charting for analytics page | Already in frontend/package.json |
| @radix-ui/* | various | UI primitives for new pages | Already in frontend/package.json |
| lucide-react | ^1.7.0 | Icons for new pages | Already in frontend/package.json |
| date-fns | ^4.1.0 | Date formatting for messages/billing | Already in frontend/package.json |
| sonner | ^2.0.7 | Toast notifications | Already in frontend/package.json |

### Supporting (may need installation)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.23 | Schema validation for new API endpoints | All new route handlers |
| framer-motion | (via `motion` ^12.38.0) | Page transitions, list animations | Already available via `motion` package |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts (already installed) | Chart.js, Victory | Recharts is already a dependency; switching adds no value |
| Zod (new) | Joi, Yup | Zod is TypeScript-first with inference; Joi is runtime-only. Zod preferred for this stack |
| Raw Telegram API via axios | node-telegram-bot-api, telegraf | Raw API via axios matches existing Evolution API pattern; no extra dependency |

**Installation:**
```bash
npm install zod           # Backend: schema validation
# No frontend packages needed - all already installed
```

**Version verification:** `zod` is the only new package. All others are already in `package.json`.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| zod | npm | ~5 yrs | ~30M/wk | github.com/colinhacks/zod | [ASSUMED] | Approved (well-known, verified by ecosystem presence) |
| axios | npm | ~10 yrs | ~50M/wk | github.com/axios/axios | Already installed | Approved |
| recharts | npm | ~8 yrs | ~2M/wk | github.com/recharts/recharts | Already installed | Approved |
| @radix-ui/* | npm | ~4 yrs | ~5M/wk | github.com/radix-ui/primitives | Already installed | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Note: slopcheck was unavailable at research time. All new packages are tagged [ASSUMED] and the planner should verify `zod` before installation.*

## Architecture Patterns

### System Architecture Diagram

```
                          Telegram Cloud
                               |
                               | POST /gateway/telegram/:tenantId
                               v
                    +---------------------+
                    |   Express Gateway   |
                    |   (gateway.ts)      |
                    |   - authenticate    |
                    |   - rate limit      |
                    |   - verify secret   |
                    +---------+-----------+
                              |
                              v
                    +---------------------+
                    |  Telegram Normalizer |
                    |  (normalizer/       |
                    |   telegram.ts)      |
                    +---------+-----------+
                              |
                              v
                    +---------------------+
                    |  BullMQ Queue       |
                    |  telegram-messages   |
                    +---------+-----------+
                              |
                              v
                    +---------------------+
                    |  Worker Pipeline    |
                    |  (workers/index.ts) |
                    |  - session load     |
                    |  - CRM upsert       |
                    |  - intent classify  |
                    |  - rules/workflow   |
                    |  - AI fallback      |
                    +---------+-----------+
                              |
                              v
                    +---------------------+
                    |  Response Router    |  <-- NEW: replaces inline WhatsAppAdapter
                    |  (router/index.ts)  |
                    |  - select adapter   |
                    |  - rate limit       |
                    |  - send             |
                    +---------+-----------+
                         |          |
                         v          v
                  +----------+  +----------+
                  | WhatsApp |  | Telegram |
                  | Adapter  |  | Adapter  |
                  +----------+  +----------+
```

### Recommended Project Structure

```
src/
├── adapters/
│   ├── evolutionApi.ts       # Existing WhatsApp adapter
│   ├── whatsapp.adapter.ts   # Existing thin wrapper
│   └── telegram.ts           # EXPAND: full adapter (send, parse webhook, setWebhook)
├── normalizer/
│   ├── types.ts              # Existing NormalizedMessage
│   ├── whatsapp.ts           # Existing
│   └── telegram.ts           # NEW: normalizeTelegramWebhook()
├── router/
│   └── index.ts              # NEW: ResponseRouter.dispatch(msg, text)
├── routes/
│   ├── gateway.ts            # MODIFY: flesh out Telegram endpoint
│   ├── leads.ts              # NEW: lead CRUD API
│   ├── conversations.ts      # NEW: conversation + message API
│   ├── analytics.ts          # NEW: analytics aggregation API
│   └── billing.ts            # NEW: billing usage API
├── queue/
│   └── setup.ts              # MODIFY: add telegram-messages queue
├── workers/
│   └── index.ts              # MODIFY: add telegram worker, use ResponseRouter
└── ... (existing files)

frontend/src/
├── pages/
│   ├── BotsPage.tsx          # Existing
│   ├── LeadsPage.tsx         # NEW: lead list with filters
│   ├── ConversationsPage.tsx # NEW: conversation inbox
│   ├── AnalyticsPage.tsx     # NEW: charts dashboard
│   ├── BillingPage.tsx       # NEW: usage dashboard
│   └── OnboardingPage.tsx    # NEW: setup wizard
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx      # NEW: sidebar + content layout
│   │   └── Sidebar.tsx       # NEW: navigation sidebar
│   ├── leads/
│   │   ├── LeadTable.tsx     # NEW: sortable lead list
│   │   ├── LeadDetail.tsx    # NEW: lead detail panel
│   │   └── LeadFilters.tsx   # NEW: status/platform filters
│   ├── conversations/
│   │   ├── ConversationList.tsx  # NEW: conversation sidebar
│   │   └── MessageThread.tsx     # NEW: message bubble thread
│   ├── analytics/
│   │   ├── MessageVolumeChart.tsx  # NEW: recharts line/bar
│   │   └── ConversionFunnel.tsx    # NEW: funnel visualization
│   └── billing/
│       └── UsageTable.tsx     # NEW: billing usage display
└── services/
    ├── api.ts                # MODIFY: add new API methods
    └── mockApi.ts            # MODIFY: add mock methods for new pages
```

### Pattern 1: Telegram Webhook Handler

**What:** Receive Telegram updates via webhook, normalize to `NormalizedMessage`, queue for processing.

**When to use:** All incoming Telegram messages.

**Example:**
```typescript
// Source: Telegram Bot API - getUpdates/setWebhook
// src/adapters/telegram.ts - expanded

import axios from 'axios';

const TELEGRAM_API = 'https://api.telegram.org/bot';

export class TelegramAdapter {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Set webhook URL with Telegram.
   * Telegram requires HTTPS with a valid cert for production.
   */
  async setWebhook(url: string, secretToken?: string): Promise<boolean> {
    const resp = await axios.post(`${TELEGRAM_API}${this.token}/setWebhook`, {
      url,
      secret_token: secretToken,
      allowed_updates: ['message', 'edited_message', 'callback_query'],
    });
    return resp.data.ok;
  }

  /**
   * Send text message via Telegram Bot API.
   */
  async sendMessage(chatId: string, text: string): Promise<any> {
    return axios.post(`${TELEGRAM_API}${this.token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  }

  /**
   * Send message with inline keyboard.
   */
  async sendMessageWithKeyboard(
    chatId: string,
    text: string,
    buttons: Array<Array<{ text: string; callback_data: string }>>
  ): Promise<any> {
    return axios.post(`${TELEGRAM_API}${this.token}/sendMessage`, {
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: buttons },
    });
  }
}
```

### Pattern 2: Telegram Normalizer

**What:** Convert Telegram Update object to `NormalizedMessage`.

**When to use:** Every incoming Telegram webhook.

**Example:**
```typescript
// src/normalizer/telegram.ts
import { NormalizedMessage } from './types';

export function normalizeTelegramWebhook(
  tenantId: string,
  rawPayload: any
): NormalizedMessage {
  const message = rawPayload.message || rawPayload.edited_message;
  const chat = message.chat;
  const from = message.from;

  // Telegram user ID as string (used as externalUserId)
  const userId = String(from.id);

  // Determine message type
  let type: NormalizedMessage['type'] = 'text';
  let text: string | null = message.text || null;

  if (message.photo) {
    type = 'image';
    text = message.caption || null;
  } else if (message.voice || message.audio) {
    type = 'audio';
  } else if (message.document) {
    type = 'file';
  } else if (message.location) {
    type = 'location';
  }

  return {
    tenantId,
    platform: 'telegram',
    userId,
    message: {
      text,
      attachments: [],  // Telegram media requires getFile + download
      quickReplies: null,
    },
    type,
    timestamp: new Date(message.date * 1000).toISOString(),
    metadata: {
      raw: rawPayload,
      replyTo: message.reply_to_message?.message_id?.toString() || null,
      isForwarded: !!message.forward_date,
      mentions: message.entities
        ?.filter((e: any) => e.type === 'mention')
        .map((e: any) => message.text.substring(e.offset, e.offset + e.length)) || [],
      chatId: String(chat.id),
      chatType: chat.type,  // private, group, supergroup
      firstName: from.first_name,
      lastName: from.last_name,
      username: from.username,
    },
  };
}
```

### Pattern 3: Unified Response Router

**What:** Decouple outbound message dispatch from the worker. Select platform adapter based on `NormalizedMessage.platform`.

**When to use:** All outbound messages (replaces inline `WhatsAppAdapter.sendMessage` in worker).

**Example:**
```typescript
// src/router/index.ts
import { NormalizedMessage } from '../normalizer/types';
import { WhatsAppAdapter } from '../adapters/whatsapp.adapter';
import { TelegramAdapter } from '../adapters/telegram';
import { sendWithRateLimit } from '../rateLimiter';
import { prisma } from '../db/prisma';

// Lazy-initialized adapters per tenant
const telegramAdapters = new Map<string, TelegramAdapter>();

function getTelegramAdapter(token: string): TelegramAdapter {
  if (!telegramAdapters.has(token)) {
    telegramAdapters.set(token, new TelegramAdapter(token));
  }
  return telegramAdapters.get(token)!;
}

export class ResponseRouter {
  /**
   * Dispatch an outbound message to the correct platform adapter.
   */
  static async dispatch(
    msg: NormalizedMessage,
    conversationId: string,
    responseText: string
  ): Promise<{ success: boolean; messageId: string }> {
    // 1. Persist outbound message to DB
    const outboundMessage = await prisma.message.create({
      data: {
        tenantId: msg.tenantId,
        conversationId,
        direction: 'out',
        content: responseText,
        messageType: 'text',
        metadata: { systemDispatched: true },
      },
    });

    // 2. Select adapter and send
    let sendResult: any;
    switch (msg.platform) {
      case 'whatsapp':
        sendResult = await sendWithRateLimit('whatsapp', () =>
          WhatsAppAdapter.sendMessage(msg.tenantId, msg.userId, responseText)
        );
        break;

      case 'telegram': {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');
        const adapter = getTelegramAdapter(token);
        const chatId = msg.metadata.chatId || msg.userId;
        sendResult = await sendWithRateLimit('telegram', () =>
          adapter.sendMessage(chatId, responseText)
        );
        break;
      }

      default:
        throw new Error(`Unsupported platform: ${msg.platform}`);
    }

    // 3. Update delivery status
    await prisma.message.update({
      where: { id: outboundMessage.id },
      data: {
        metadata: { systemDispatched: true, deliveredAt: new Date().toISOString() },
      },
    });

    return { success: true, messageId: outboundMessage.id };
  }
}
```

### Pattern 4: Lead Management API

**What:** REST endpoints for lead CRUD, filtering, and status updates.

**When to use:** Frontend lead management page.

**Example:**
```typescript
// src/routes/leads.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/leads - List leads with filtering and pagination
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, platform, search, page = '1', limit = '20' } = req.query;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (platform) where.source = platform;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { conversations: true } },
          conversations: {
            take: 1,
            orderBy: { lastMessageAt: 'desc' },
            select: { lastMessageAt: true, platform: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, total, page: parseInt(page as string), limit: take });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch leads', details: err.message });
  }
});

/**
 * PATCH /api/leads/:id - Update lead status or attributes
 */
router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { status, name, email, attributes } = req.body;

    const lead = await prisma.lead.update({
      where: { id_tenantId: { id, tenantId } },  // Composite key for safety
      data: { ...(status && { status }), ...(name && { name }), ...(email && { email }), ...(attributes && { attributes }) },
    });

    res.json({ lead });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update lead', details: err.message });
  }
});
```

### Anti-Patterns to Avoid

- **Hardcoding adapter selection in worker:** The current worker directly calls `WhatsAppAdapter.sendMessage`. Extract to a `ResponseRouter` so adding Telegram (and future platforms) does not require modifying the worker pipeline.
- **Separate worker per platform:** One worker can process messages from multiple queues. Use a single worker with queue name as a parameter, or register multiple queue consumers in the same worker file.
- **Frontend without mock mode:** The project established mock mode (`VITE_USE_MOCK=true`) as the standard for frontend independence. Every new page must have mock data backing it.
- **Missing tenant scoping on new APIs:** Every new Prisma query must include `tenantId` in the `where` clause. The `req.user!.tenantId` comes from the JWT auth middleware.
- **BigInt serialization issues:** The `BillingUsage.quantity` field is `BigInt` in Prisma. JSON.stringify cannot serialize BigInt. Use `BigInt.prototype.toJSON` override or convert to `Number` before sending to frontend.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Telegram webhook parsing | Custom HTTP handler with body parsing | Express route with `req.body` (already works) | Telegram sends JSON; Express already parses it |
| Chart rendering | Canvas/SVG drawing | recharts (already installed) | Recharts is a dependency; custom charts are fragile |
| Schema validation | Manual `if (!field)` checks | zod | Type inference, composable schemas, better error messages |
| Date formatting | Manual `new Date().toLocaleString()` | date-fns (already installed) | Consistent formatting, timezone handling |
| Table sorting/filtering | Custom sort/filter logic | Client-side array methods + React state | Simple enough to not need a library |
| Toast notifications | `alert()` or custom div | sonner (already installed) | Already a dependency, consistent UX |

**Key insight:** The frontend already has recharts, date-fns, sonner, and a full Radix UI component library. The only new package needed is `zod` for backend validation. Do not install additional charting, notification, or UI packages.

## Common Pitfalls

### Pitfall 1: Telegram Secret Token Validation

**What goes wrong:** Telegram supports a `secret_token` in `setWebhook` that is sent as `X-Telegram-Bot-Api-Secret-Token` header on every webhook request. If not validated, anyone who discovers the webhook URL can send fake updates.

**Why it happens:** The secret token validation is easy to skip during development.

**How to avoid:** Validate the header in the gateway middleware:
```typescript
const TELEGRAM_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
if (TELEGRAM_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== TELEGRAM_SECRET) {
  return res.status(403).json({ error: 'Invalid Telegram secret' });
}
```

**Warning signs:** Webhook receiving messages from unexpected sources.

### Pitfall 2: Telegram Chat ID vs User ID

**What goes wrong:** Telegram has both `chat.id` and `from.id`. For private chats they are the same, but for groups they differ. Using `from.id` as the `chat_id` for sending will fail in groups.

**Why it happens:** Confusing the two identifiers.

**How to avoid:** Always use `message.chat.id` as the `chatId` for sending messages back. Store `from.id` as the user identity for CRM purposes. The normalizer must store both: `userId = from.id`, `metadata.chatId = chat.id`.

**Warning signs:** Bot works in DMs but fails in groups.

### Pitfall 3: Telegram Polling vs Webhook Conflict

**What goes wrong:** If `getUpdates` (polling) is active when `setWebhook` is called, Telegram returns an error. Conversely, an active webhook blocks polling.

**Why it happens:** Not calling `deleteWebhook` before `getUpdates`, or vice versa.

**How to avoid:** On bot startup, call `deleteWebhook` first, then `setWebhook`. Document that this bot uses webhooks only.

**Warning signs:** `409 Conflict` error from Telegram API.

### Pitfall 4: BigInt JSON Serialization

**What goes wrong:** `BillingUsage.quantity` is `BigInt` in Prisma. `JSON.stringify()` throws `TypeError: Do not know how to serialize a BigInt`.

**Why it happens:** Prisma returns BigInt for `BigInt` fields; Express's `res.json()` uses `JSON.stringify`.

**How to avoid:** Either:
1. Cast to Number: `Number(usage.quantity)` before sending (loses precision for values > 2^53)
2. Add `BigInt.prototype.toJSON = function() { return this.toString(); }` globally
3. Use Prisma's `select` to cast: `select: { quantity: true }` and transform in the response

**Warning signs:** `500 error` on any billing usage endpoint.

### Pitfall 5: Worker Queue Name Hardcoding

**What goes wrong:** The current worker is hardcoded to `'whatsapp-messages'` queue name. Adding a second queue requires either a second worker instance or modifying the existing worker to handle multiple queues.

**Why it happens:** Single-queue assumption in the original design.

**How to avoid:** Create a separate BullMQ `Worker` for `telegram-messages` in the same file (`src/workers/index.ts`), sharing the same pipeline logic. The pipeline function should be extracted as a reusable function that both workers call.

**Warning signs:** Telegram messages are queued but never processed.

### Pitfall 6: Frontend Route Not Added to Vite Proxy

**What goes wrong:** New backend routes (e.g., `/api/leads`) are not proxied by Vite dev server, causing CORS errors in development.

**Why it happens:** Vite proxy config only proxies specific prefixes (`/api`, `/bot`, `/gateway`, `/socket.io`).

**How to avoid:** All new API routes must use the `/api/` prefix (e.g., `/api/leads`, `/api/conversations`, `/api/analytics`, `/api/billing`). The existing Vite proxy already forwards `/api/*` to `http://localhost:3000`.

**Warning signs:** `Network Error` or CORS errors in browser console during development.

## Code Examples

### Telegram Webhook Setup (Bot Registration)

```typescript
// Called during bot creation or tenant onboarding
// Source: https://core.telegram.org/bots/api#setwebhook

async function registerTelegramWebhook(tenantId: string, botToken: string) {
  const webhookUrl = `${process.env.PUBLIC_URL}/gateway/telegram/${tenantId}`;
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  const response = await axios.post(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ['message', 'edited_message', 'callback_query'],
      max_connections: 40,
    }
  );

  if (!response.data.ok) {
    throw new Error(`Failed to set Telegram webhook: ${response.data.description}`);
  }

  return response.data;
}
```

### Recharts Line Chart (Analytics Page)

```typescript
// Source: recharts documentation
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function MessageVolumeChart({ data }: { data: Array<{ date: string; inbound: number; outbound: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" stroke="#7D7D8A" fontSize={12} />
        <YAxis stroke="#7D7D8A" fontSize={12} />
        <Tooltip
          contentStyle={{ background: '#141415', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#EBEBF0' }}
        />
        <Line type="monotone" dataKey="inbound" stroke="#4ADE80" strokeWidth={2} />
        <Line type="monotone" dataKey="outbound" stroke="#60A5FA" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Billing Usage Recording in Worker

```typescript
// Add to worker pipeline after message processing and AI calls

async function recordBillingUsage(tenantId: string, metric: string, quantity: number) {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

  await prisma.billingUsage.upsert({
    where: {
      // Need composite unique index on (tenantId, metric, periodStart)
      tenantId_metric_periodStart: { tenantId, metric, periodStart },
    },
    update: {
      quantity: { increment: BigInt(quantity) },
    },
    create: {
      tenantId,
      metric,
      quantity: BigInt(quantity),
      periodStart,
      periodEnd,
    },
  });
}

// In worker, after processing:
await recordBillingUsage(msg.tenantId, 'messages_received', 1);

// In AI orchestrator, after response:
await recordBillingUsage(tenantId, 'ai_tokens', response.usage.totalTokens);
```

### Sidebar Navigation Component

```typescript
// frontend/src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { Bot, Users, MessageSquare, BarChart3, CreditCard } from 'lucide-react';

const navItems = [
  { to: '/bots', label: 'Bots', icon: Bot },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/billing', label: 'Billing', icon: CreditCard },
];

export function Sidebar() {
  return (
    <aside className="w-60 h-screen border-r border-white/5 bg-[#09090b] flex flex-col">
      <div className="p-6 border-b border-white/5">
        <h1 className="text-[#EBEBF0] font-bold text-lg tracking-tight">CRM V2</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1f1f22] text-[#EBEBF0]'
                  : 'text-[#7D7D8A] hover:text-[#CCCCD4] hover:bg-[#141415]'
              }`
            }
          >
            <Icon className="w-4 h-4" strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `WhatsAppAdapter.sendMessage` in worker | Response Router pattern | Phase 3 | Decouples send logic from worker; adding platforms = add adapter only |
| Single `whatsapp-messages` queue | Per-platform queues (`whatsapp-messages`, `telegram-messages`) | Phase 3 | Independent scaling per platform |
| `alert()` for frontend errors | `sonner` toast notifications | Already available | Better UX, non-blocking |
| Manual fetch + setState | Same (no React Query) | N/A | Simple enough for this app size |
| No validation on routes | Zod schemas on new routes | Phase 3 | Type-safe request validation |

**Deprecated/outdated:**
- The `sendTelegramMessage` standalone function in `src/adapters/telegram.ts` will be replaced by the `TelegramAdapter` class.
- The gateway Telegram stub endpoint will be replaced with full webhook processing.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `zod` is the correct package name and latest version is ~3.x | Standard Stack | Low - well-known package, easily verifiable |
| A2 | Telegram Bot API HTTPS requirement can be satisfied by ngrok or reverse proxy during development | Pitfalls | Medium - may need self-signed cert workaround |
| A3 | `BillingUsage` composite unique index `(tenantId, metric, periodStart)` can be added via Prisma migration | Code Examples | Low - standard Prisma migration |
| A4 | Recharts `ResponsiveContainer` works with the existing Tailwind layout | Code Examples | Low - recharts is already installed and presumably working |
| A5 | The `motion` package (Framer Motion successor) supports `AnimatePresence` for page transitions | Standard Stack | Low - motion is already a dependency |

## Open Questions

1. **Telegram bot token per tenant vs. single shared bot?**
   - What we know: The current codebase has a single `TELEGRAM_BOT_TOKEN` env var. The `Bot` model has a `config` JSON field that could store per-bot tokens.
   - What's unclear: Does each tenant get their own Telegram bot, or do they share one?
   - Recommendation: Start with single shared bot (simpler), store token in env var. The gateway already uses `tenantId` from the URL path to scope messages. Per-tenant bots can be added later by storing token in `Bot.config`.

2. **Lead upsert key for Telegram users?**
   - What we know: WhatsApp leads are upserted by `phone` number. Telegram users have numeric IDs but may not have phone numbers exposed.
   - What's unclear: Should we use Telegram `user.id` as the lead identity key, or require the user to share their phone?
   - Recommendation: Use `externalUserId` (Telegram user ID string) as the lead identity for Telegram, same as WhatsApp uses `remoteJid`. Modify `crmService.ts` to upsert by `(tenantId, externalUserId, platform)` instead of `(tenantId, phone)`.

3. **Public URL for webhook registration?**
   - What we know: `setWebhook` requires a publicly accessible HTTPS URL.
   - What's unclear: Is there a public URL configured, or does this need ngrok/Cloudflare Tunnel?
   - Recommendation: Add `PUBLIC_URL` env var. Document that ngrok or Cloudflare Tunnel is needed for local development.

4. **Should the Prisma schema change for lead upsert?**
   - What we know: Currently `crmService.ts` upserts leads by `(tenantId, phone)`. Telegram users may not have phone numbers.
   - What's unclear: Should we add a composite unique index on `(tenantId, externalUserId, platform)` or `(tenantId, phone, source)`?
   - Recommendation: Add `@@unique([tenantId, source, phone])` to Lead model, or change the upsert logic to use `findFirst` + `create/update` (which is already the pattern).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + Frontend | Assume yes | 20+ | -- |
| PostgreSQL | Database | Yes (Docker) | 15-alpine | -- |
| Redis | Queue + Cache | Yes (Docker) | 7-alpine | -- |
| Telegram Bot API | Webhook endpoint | External service | N/A | Must register bot with @BotFather |
| ngrok / Cloudflare Tunnel | Local dev webhook testing | Unknown | -- | Manual webhook URL config |
| recharts | Analytics charts | Yes (frontend/package.json) | ^2.15.4 | -- |
| zod | Route validation | Not installed | -- | Manual validation (not recommended) |

**Missing dependencies with no fallback:**
- Telegram bot token must be obtained from @BotFather (manual step, not automatable)
- Public URL for webhook (ngrok/Cloudflare Tunnel) needed for local Telegram testing

**Missing dependencies with fallback:**
- `zod` can be replaced with manual `if/else` validation (not recommended but functional)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (Phase 1 established) |
| Config file | `vitest.config.ts` (from Phase 1) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEL-01 | Telegram webhook receives and normalizes message | integration | `vitest run tests/telegram-webhook.test.ts` | Wave 0 |
| TEL-02 | Telegram adapter sends message via Bot API | unit | `vitest run tests/telegram-adapter.test.ts` | Wave 0 |
| ROUTE-01 | Response router dispatches to correct adapter | unit | `vitest run tests/response-router.test.ts` | Wave 0 |
| LEAD-01 | Lead list API returns filtered results | integration | `vitest run tests/leads-api.test.ts` | Wave 0 |
| CONV-01 | Conversation API returns message history | integration | `vitest run tests/conversations-api.test.ts` | Wave 0 |
| BILL-01 | Billing usage recorded on message send | integration | `vitest run tests/billing-usage.test.ts` | Wave 0 |
| ANALYTICS-01 | Analytics API returns aggregated data | integration | `vitest run tests/analytics-api.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/telegram-webhook.test.ts` - Tests Telegram normalizer and gateway endpoint
- [ ] `tests/telegram-adapter.test.ts` - Tests TelegramAdapter send methods (mock axios)
- [ ] `tests/response-router.test.ts` - Tests ResponseRouter platform dispatch logic
- [ ] `tests/leads-api.test.ts` - Tests lead CRUD API endpoints
- [ ] `tests/billing-usage.test.ts` - Tests billing usage recording in worker
- Vitest config already exists from Phase 1

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT from Phase 1; apply `authenticateToken` to all new routes |
| V3 Session Management | no | No new session concerns |
| V4 Access Control | yes | Tenant isolation on all new Prisma queries (include `tenantId` in where) |
| V5 Input Validation | yes | Zod schemas for all new route inputs |
| V6 Cryptography | no | No new crypto requirements |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Telegram webhook spoofing | Spoofing | Validate `X-Telegram-Bot-Api-Secret-Token` header |
| Cross-tenant data access | Information Disclosure | Always include `tenantId` from JWT in Prisma where clauses |
| SQL injection via search | Tampering | Use Prisma parameterized queries (automatic) |
| Rate limiting bypass | Denial of Service | Apply existing `rateLimitMiddleware` to Telegram gateway |
| Billing data manipulation | Tampering | Billing writes happen in worker, not from frontend API |

## Sources

### Primary (HIGH confidence)
- Telegram Bot API documentation (core.telegram.org/bots/api) - stable API, well-documented
- Existing codebase files - all analyzed directly
- Prisma schema - all models verified against source

### Secondary (MEDIUM confidence)
- recharts API patterns - based on training knowledge of recharts v2.x
- Zod schema patterns - based on training knowledge of zod v3.x
- SaaS billing patterns - based on industry standard approaches

### Tertiary (LOW confidence)
- Web search was unavailable; all external API knowledge comes from training data
- Telegram webhook HTTPS requirements may have nuances not captured

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages except zod already installed; zod is well-known
- Architecture: HIGH - based on direct codebase analysis and existing patterns
- Pitfalls: HIGH - Telegram API pitfalls are well-documented in training data
- Frontend patterns: HIGH - based on existing codebase conventions

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (30 days - stable tech stack, Telegram API is stable)
