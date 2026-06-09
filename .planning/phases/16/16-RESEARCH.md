# Phase 16: Discord Platform Integration - Research

**Researched:** 2026-05-24
**Domain:** discord.js v14 WebSocket gateway, OAuth2 bot authorization, multi-platform adapter pattern
**Confidence:** HIGH

## Summary

Phase 16 adds Discord as the third messaging platform to the CrmV2 CRM bot SaaS, alongside WhatsApp (Evolution API) and Telegram (Hydrogram MTProto). Discord differs architecturally from both existing platforms: it uses the discord.js v14 library running in-process as a WebSocket client connected to Discord's gateway, with no external Docker container or HTTP API server needed. Messages arrive via `messageCreate` events over WebSocket rather than webhooks, and outbound messages use `channel.send()` directly through the same WebSocket connection.

The integration follows the established adapter pattern (static methods, thin wrapper, rate-limited send) and adds: a `DiscordAdapter` class, a `normalizeDiscordMessage` function, a `discord-messages` BullMQ queue with a corresponding worker, a `case 'discord'` branch in the ResponseRouter, Discord-specific branches in workspace routes (create/start/stop/delete/status), rate limiting (5 req/sec per bot, 50 msg/min per channel per ARCHITECTURE.txt Layer 8), and frontend wiring (types.ts `supported: true`, AddBotModal bot_token input, platform-aware status display). The OAuth2 bot auto-generation flow is analogous to Telegram's userbot flow but uses Discord's OAuth2 authorization URL with `bot` scope.

**Primary recommendation:** Use discord.js v14.26.4 (latest stable) with `GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.DirectMessages | GatewayIntentBits.MessageContent`. Manage multiple bot clients via a `Map<string, Client>` pattern. No Docker container needed.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Discord WebSocket gateway connection | API / Backend (in-process) | - | discord.js Client runs in the Node.js process, no external service |
| Message normalization | API / Backend | - | Normalizer converts discord.js Message to NormalizedMessage |
| Message queueing | API / Backend (BullMQ) | - | Queue decouples inbound from processing per Layer 4 |
| Worker pipeline | API / Backend | - | Same 13-step pipeline as WhatsApp/Telegram workers |
| Outbound dispatch | API / Backend (ResponseRouter) | - | Rate-limited send via DiscordAdapter |
| OAuth2 bot authorization | Browser / Client (redirect) | API / Backend (callback) | User clicks link, Discord redirects back with code |
| Frontend bot management UI | Browser / Client | - | AddBotModal, BotCard, status display |
| Rate limiting | API / Backend (Redis) | - | Token bucket in Redis, per ARCHITECTURE.txt Layer 8 |

## User Constraints (from CONTEXT.md)

### Implementation Decisions (Locked)

- **discord.js v14** (npm package) -- most mature Node.js Discord wrapper, runs in-process as WebSocket client, no external Docker service needed. Requires Node.js 18+ (project runs Node.js 22.22.2 -- satisfied).
- **Gateway Intents:** `GatewayIntentBits.Guilds`, `GatewayIntentBits.GuildMessages`, `GatewayIntentBits.DirectMessages`, `GatewayIntentBits.MessageContent` (privileged -- must enable in Discord Developer Portal).
- **Client Lifecycle:** Store active Client instances in a `Map<string, Client>` keyed by botId. `connect(botToken, botId)` creates Client, attaches MessageCreate listener, calls `client.login()`. `disconnect(botId)` calls `client.destroy()`, removes from Map. `isReady(botId)` checks `client.isReady()`. Handle reconnect with exponential backoff on disconnect events.
- **Message Send Pattern:** `channel.send(text)` for channel messages, `user.send(text)` for DMs. No external API calls -- all through discord.js WebSocket.
- **Adapter Architecture:** Follow existing adapter pattern with static methods (like WhatsAppAdapter, TelegramAdapter). `DiscordAdapter.sendMessage(channelId, text)` rate-limited. `DiscordAdapter.connect(botToken, botId)` lifecycle. `DiscordAdapter.disconnect(botId)` cleanup. `DiscordAdapter.healthCheck(botId)` status.
- **Normalizer Pattern:** Map Discord `MessageCreate` event to `NormalizedMessage`. `platform: 'discord'`. `userId` = author.id (Discord snowflake). `metadata: { channelId, guildId, messageId, authorUsername }`.
- **Queue Integration:** Add `discord-messages` BullMQ queue (per ARCHITECTURE.txt Layer 4). Concurrency: 200 workers (highest throughput per ARCHITECTURE.txt).
- **ResponseRouter Integration:** Add `case 'discord'` in ResponseRouter.dispatch(). Look up connected Discord bot for tenant. Send via DiscordAdapter.sendMessage(channelId, text).
- **Workspace Routes:** POST `/api/workspaces` handle `platform: 'discord'`, require bot_token, call DiscordAdapter.connect(), create DB record. POST `/:id/start` call DiscordAdapter.connect(). POST `/:id/stop` call DiscordAdapter.disconnect(). GET `/:id/connection-status` call DiscordAdapter.isReady(). DELETE `/:id` call DiscordAdapter.disconnect() + DB cleanup.
- **Rate Limiting:** 5 requests/second per bot, 50 messages/minute per channel. Strategy: Global + per-channel token buckets. Use existing rateLimiter infrastructure.
- **Startup Sync:** On server startup, reconnect all Discord bots with status 'connected' in DB. Follow existing startup sync pattern.
- **Bot Auto-Generation (OAuth2 Flow):** Similar to Telegram userbot flow. Discord OAuth2 with `bot` scope gets bot token. Flow: User clicks "Connect Discord" -> OAuth2 redirect -> callback with code -> exchange for bot token -> create DB record -> connect.
- **Frontend Changes:** `types.ts` set `discord.supported = true` (already in Platform union). `AddBotModal.tsx` add Discord bot_token input (like Telegram, no QR needed). Platform-aware status display, start/stop/delete buttons.
- **Docker Compatibility:** No Docker container needed. discord.js runs in-process. No new docker-compose services required. Just `npm i discord.js` dependency.

### Claude's Discretion

- Exact error handling patterns (follow existing adapter conventions)
- Specific log message formats (follow existing logger patterns)
- Test file organization (follow existing test conventions)

### Deferred Ideas (OUT OF SCOPE)

- Slash command registration (REST API) -- not needed for basic message bot
- Discord components (buttons, select menus) -- future enhancement
- Discord voice channels -- out of scope
- Multi-server permissions management -- future enhancement

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| discord.js | 14.26.4 | Discord WebSocket gateway client | Most mature Node.js Discord wrapper, used by 95%+ of Discord bots [VERIFIED: npm registry, 2026-05-01 publish date] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bullmq | 5.x (existing) | Message queue for discord-messages | Already in project, add new queue |
| ioredis | 5.x (existing) | Redis client for rate limiting + queue | Already in project |
| express | 5.x (existing) | HTTP routes for workspace + OAuth2 callback | Already in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| discord.js | eris | Less maintained, smaller community, fewer TypeScript types |
| discord.js | discord-api-types raw REST | Massive boilerplate, no WebSocket gateway handling |
| In-process client | Separate Docker container (like Telegram API) | Unnecessary complexity -- discord.js manages its own WebSocket |

**Installation:**
```bash
npm install discord.js
```

**Version verification:**
```
$ npm view discord.js version
14.26.4

$ npm view discord.js engines
{ node: '>=18' }

$ node -v
v22.22.2   -- compatible
```

## Package Legitimacy Audit

> slopcheck was installed and run. Results below.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| discord.js | npm | 8+ years | ~1.5M/week | github.com/discordjs/discord.js | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

**Additional verification:**
- `discord.js` has no `postinstall` script [VERIFIED: npm registry]
- Dependencies are all well-known packages: `@discordjs/ws`, `@discordjs/rest`, `@discordjs/builders`, `discord-api-types`, `undici` [VERIFIED: npm registry]
- Package has been published since 2015, latest stable 14.26.4 published 2026-05-01 [VERIFIED: npm registry]
- Node.js 22.22.2 exceeds minimum requirement of Node.js 18 [VERIFIED]

## Architecture Patterns

### System Architecture Diagram

```
                           Discord Gateway (WebSocket)
                                    |
                           discord.js Client
                          (Map<botId, Client>)
                                    |
                          MessageCreate event
                                    |
                           normalizeDiscordMessage()
                                    |
                           NormalizedMessage
                                    |
                           discord-messages queue (BullMQ)
                                    |
                           discordWorker (13-step pipeline)
                                    |
                     Session -> Intent -> Rules -> AI -> CRM
                                    |
                           ResponseRouter.dispatch()
                                    |
                           case 'discord':
                             DiscordAdapter.sendMessage(channelId, text)
                                    |
                           channel.send(text) via WebSocket
```

### Recommended Project Structure

```
src/
  adapters/
    discordAdapter.ts       # NEW - Discord client lifecycle + send
  normalizer/
    discord.ts              # NEW - MessageCreate -> NormalizedMessage
  workers/
    index.ts                # MODIFY - add discordWorker
  queue/
    setup.ts                # MODIFY - add discordMessagesQueue
  router/
    index.ts                # MODIFY - add case 'discord'
  routes/
    workspaces.ts           # MODIFY - add discord platform branches
    gateway.ts              # no change (Discord uses WebSocket, not webhooks)
  rateLimiter/
    index.ts                # MODIFY - add discord + discordChannel limiters
  index.ts                  # MODIFY - add Discord startup sync
frontend/
  src/
    components/bots/
      types.ts              # MODIFY - discord.supported = true
      AddBotModal.tsx        # MODIFY - add Discord bot_token input
    services/
      api.ts                # no change (existing botApi covers discord)
```

### Pattern 1: DiscordAdapter (Client Lifecycle Management)

**What:** A module-level `Map<string, Client>` stores active discord.js Client instances keyed by botId. The adapter exposes static methods for connect/disconnect/send/healthCheck.

**When to use:** Every time a Discord bot needs to be started, stopped, or send a message.

**Example:**
```typescript
// Source: discord.js v14 docs + existing adapter patterns in src/adapters/
import { Client, GatewayIntentBits, ChannelType, TextChannel, DMChannel } from 'discord.js';
import { logger } from '../config/logger';
import { addLog } from '../debug/server';

const clients = new Map<string, Client>();

export class DiscordAdapter {
  static async connect(botToken: string, botId: string): Promise<void> {
    // Destroy existing client if any
    await DiscordAdapter.disconnect(botId);

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    client.on('clientReady', () => {
      addLog('info', `[DISCORD] Bot ${botId} connected as ${client.user?.tag}`, 'DISCORD_AUTH');
    });

    client.on('shardDisconnect', (_event, shardId) => {
      addLog('warn', `[DISCORD] Bot ${botId} shard ${shardId} disconnected`, 'DISCORD_LIFECYCLE');
    });

    client.on('shardReconnecting', (shardId) => {
      addLog('info', `[DISCORD] Bot ${botId} shard ${shardId} reconnecting...`, 'DISCORD_LIFECYCLE');
    });

    // Caller attaches messageCreate listener externally (in workspace route)
    clients.set(botId, client);
    await client.login(botToken);
  }

  static async disconnect(botId: string): Promise<void> {
    const client = clients.get(botId);
    if (client) {
      client.destroy();
      clients.delete(botId);
      addLog('info', `[DISCORD] Bot ${botId} disconnected`, 'DISCORD_AUTH');
    }
  }

  static getClient(botId: string): Client | undefined {
    return clients.get(botId);
  }

  static isReady(botId: string): boolean {
    const client = clients.get(botId);
    return client?.isReady() ?? false;
  }

  static async sendMessage(channelId: string, text: string, botId: string): Promise<void> {
    const client = clients.get(botId);
    if (!client || !client.isReady()) {
      throw new Error(`Discord bot ${botId} is not connected`);
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Discord channel ${channelId} not found`);
    }

    if (channel.isTextBased()) {
      await (channel as TextChannel | DMChannel).send(text);
      addLog('info', `[DISCORD→SEND] bot=${botId} channel=${channelId} text="${text.slice(0, 50)}..."`, 'DISCORD_SEND');
    } else {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }
  }
}
```

### Pattern 2: Discord Normalizer

**What:** Converts a discord.js `Message` object into the project's `NormalizedMessage` format.

**When to use:** Every time a `messageCreate` event fires on a Discord bot client.

**Example:**
```typescript
// Source: existing normalizer patterns in src/normalizer/telegram.ts, src/normalizer/whatsapp.ts
import { Message, MessageType } from 'discord.js';
import { NormalizedMessage } from './types';

export function normalizeDiscordMessage(tenantId: string, message: Message): NormalizedMessage {
  // Skip bot messages to prevent loops
  if (message.author.bot) {
    throw new Error('Ignoring bot message');
  }

  // Determine message type from attachments
  let type: NormalizedMessage['type'] = 'text';
  const attachments: NormalizedMessage['message']['attachments'] = [];

  if (message.attachments.size > 0) {
    for (const [, attachment] of message.attachments) {
      const mimeType = attachment.contentType || 'application/octet-stream';
      let attachmentType: NormalizedMessage['message']['attachments'][0]['type'] = 'file';

      if (mimeType.startsWith('image/')) attachmentType = 'image';
      else if (mimeType.startsWith('video/')) attachmentType = 'video';
      else if (mimeType.startsWith('audio/')) attachmentType = 'audio';

      attachments.push({
        type: attachmentType,
        url: attachment.url,
        mimeType,
        size: attachment.size,
        fileName: attachment.name,
      });

      // Set primary type from first attachment
      if (attachments.length === 1) type = attachmentType;
    }
  }

  // Extract mentions
  const mentions: string[] = message.mentions.users.map((u) => u.id);

  const normalized: NormalizedMessage = {
    tenantId,
    platform: 'discord',
    userId: message.author.id,
    message: {
      text: message.content || null,
      attachments,
      quickReplies: null,
    },
    type,
    timestamp: new Date(message.createdTimestamp).toISOString(),
    metadata: {
      raw: {
        id: message.id,
        channelId: message.channelId,
        guildId: message.guildId,
        authorId: message.author.id,
        authorUsername: message.author.username,
        authorBot: message.author.bot,
      },
      replyTo: message.reference?.messageId || null,
      isForwarded: false,
      mentions,
      channelId: message.channelId,
      guildId: message.guildId || null,
      messageId: message.id,
      authorUsername: message.author.username,
    },
  };

  return normalized;
}
```

### Pattern 3: Workspace Route Discord Branch (Create)

**What:** Handle `platform: 'discord'` in the POST `/api/workspaces` route, mirroring the Telegram branch pattern.

**When to use:** User creates a new Discord bot via the AddBotModal.

**Example:**
```typescript
// In src/routes/workspaces.ts POST / handler, add after telegram branch:
if (botPlatform === 'discord') {
  if (!bot_token) {
    return res.status(400).json({ error: 'bot_token is required for Discord platform' });
  }

  // Validate token by attempting login
  let discordBotId: string;
  try {
    const tempId = `discord_${Date.now()}`;
    await DiscordAdapter.connect(bot_token, tempId);

    // Wait for ready event (up to 10s)
    const client = DiscordAdapter.getClient(tempId);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Discord login timeout')), 10_000);
      if (client!.isReady()) { clearTimeout(timeout); resolve(); return; }
      client!.once('clientReady', () => { clearTimeout(timeout); resolve(); });
      client!.once('error', (err) => { clearTimeout(timeout); reject(err); });
    });

    discordBotId = tempId;
    logger.info({ botId: discordBotId, tag: client!.user?.tag }, 'Discord bot connected');
  } catch (dcErr: any) {
    logger.error({ err: dcErr.message }, 'Discord bot connection failed');
    return res.status(502).json({
      error: 'Failed to connect to Discord',
      details: dcErr.message || 'Invalid bot token or Discord API unreachable',
    });
  }

  const bot = await prisma.bot.create({
    data: {
      tenantId,
      userId: validUserId || undefined,
      displayName: name || 'New Discord Bot',
      platform: 'discord',
      status: 'connected',
      sessionName: `discord_${Date.now()}`,
      config: {
        system_prompt: system_prompt || null,
        ai_engine: ai_engine || null,
        api_key: api_key || null,
        groq_api_key: null,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 1024,
        bot_token_masked: bot_token.slice(0, 10) + '***',
      },
    },
  });

  // Store client reference with actual botId
  DiscordAdapter.disconnect(discordBotId);
  await DiscordAdapter.connect(bot_token, bot.id);

  logger.info({ botId: bot.id }, 'Discord bot created in DB');
  return res.status(201).json({ workspace: mapBotToWorkspace(bot) });
}
```

### Anti-Patterns to Avoid

- **Calling `client.login()` twice on the same Client instance:** The second call throws. Always `destroy()` before re-creating.
- **Not handling `shardDisconnect` / `shardError`:** Without these, silent disconnections leave stale entries in the Map. Log and clean up.
- **Processing bot's own messages:** Discord echoes the bot's own messages back via `messageCreate`. Always check `message.author.bot` in the normalizer and skip.
- **Ignoring the `MessageContent` privileged intent:** Without enabling it in the Developer Portal, `message.content` is empty for most messages. The bot becomes deaf.
- **Hardcoding guild/channel IDs:** The bot must work across all guilds it's invited to. Use dynamic `channel.send()` with the channelId from the normalized message metadata.
- **Not rate-limiting outbound sends:** Discord's rate limits are strict (5/sec per bot, 50/min per channel). Always wrap sends through the rate limiter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket gateway connection | Custom WebSocket client | discord.js v14 Client | discord.js handles heartbeating, reconnection, rate limit headers, resume, zlib compression |
| OAuth2 code exchange | Custom HTTP calls to Discord API | axios POST to `https://discord.com/api/oauth2/token` | Simple enough, but use existing axios pattern from telegramAdapter |
| Rate limiting | Custom per-channel tracking | Extend existing RedisRateLimiter | Project already has Redis-based rate limiter, add discord + discordChannel entries |
| Message parsing | Manual JSON parsing of Discord payloads | discord.js Message object | The library provides parsed, typed objects already |

## Common Pitfalls

### Pitfall 1: MessageContent Privileged Intent Not Enabled

**What goes wrong:** Bot connects successfully but `message.content` is always empty for non-mention messages. The AI pipeline receives empty strings and generates nonsensical responses.

**Why it happens:** `MessageContent` is a privileged intent that must be manually enabled in the Discord Developer Portal under Bot > Privileged Gateway Intents. Without it, the gateway strips message content.

**How to avoid:** Document the requirement prominently in the AddBotModal help text. Consider adding a runtime check: if the bot receives a message with empty `content` but non-empty `attachments`, log a warning suggesting the intent may not be enabled.

**Warning signs:** Bot receives messages (event fires) but `msg.message.text` is always `null` or empty.

### Pitfall 2: Bot Responds to Its Own Messages (Infinite Loop)

**What goes wrong:** Bot sends a message, Discord sends it back via `messageCreate`, bot processes it as a user message, generates a response, sends it, Discord sends it back... infinite loop.

**Why it happens:** Discord's gateway sends ALL messages in a channel to the bot, including the bot's own messages. Unlike WhatsApp/Telegram, Discord does not automatically filter bot messages.

**How to avoid:** Always check `message.author.bot` at the top of the `messageCreate` handler and in the normalizer. Throw or return early if true.

**Warning signs:** Rapid CPU/memory growth, Redis queue depth exploding, Discord rate limit errors within seconds.

### Pitfall 3: Channel Type Assumptions

**What goes wrong:** `channel.send()` throws because the channel is a voice channel, announcement channel, or stage channel.

**Why it happens:** The bot receives events from all channel types but only text-based channels support `send()`.

**How to avoid:** Check `channel.isTextBased()` before calling `send()`. In the normalizer, skip non-text messages or handle them gracefully.

**Warning signs:** `TypeError: channel.send is not a function` or Discord API error 50035 (Invalid Form Body).

### Pitfall 4: Stale Client References After Server Restart

**What goes wrong:** After a server restart, the in-memory `Map<string, Client>` is empty but the DB still has bots with `status: 'connected'`. The UI shows them as connected but they can't receive or send messages.

**Why it happens:** Unlike WhatsApp (Evolution API Docker) and Telegram (Hydrogram Docker), Discord clients live entirely in-process. A restart kills all WebSocket connections.

**How to avoid:** Implement startup sync: on server boot, find all Discord bots with `status: 'connected'` in the DB and call `DiscordAdapter.connect()` for each. This mirrors the existing startup sync for WhatsApp/Telegram.

**Warning signs:** Bots show as "connected" in the UI but don't respond to messages. No logs showing Discord activity.

### Pitfall 5: Rate Limit Violations (429s)

**What goes wrong:** Discord returns HTTP 429 (Too Many Requests) and the bot gets temporarily banned from the API.

**Why it happens:** Sending messages too quickly without respecting Discord's rate limits. discord.js handles gateway-level rate limits internally, but REST API rate limits (for `channel.send()`) need application-level throttling.

**How to avoid:** Use the existing `sendWithRateLimit` infrastructure. Add `discord` (5/sec) and `discordChannel` (50/min per channel) rate limiters. discord.js also has built-in rate limit handling via `@discordjs/rest`, but the application-level limiter provides an additional safety layer and aligns with the ARCHITECTURE.txt Layer 8 design.

**Warning signs:** 429 responses in logs, increasing send latency, Discord REST API "You are being rate limited" error messages.

## Code Examples

Verified patterns from official sources:

### Creating a Client with Intents
```typescript
// Source: https://discord.js.org/docs/packages/discord.js/14.26.4/Client:Class
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});
```

### Handling messageCreate
```typescript
// Source: https://discord.js.org/docs/packages/discord.js/14.26.4/Message:Class
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  console.log(`[${message.author.tag}]: ${message.content}`);
  console.log(`Channel: ${message.channelId}, Guild: ${message.guildId}`);

  // Access attachments
  for (const [id, attachment] of message.attachments) {
    console.log(`Attachment: ${attachment.url} (${attachment.contentType})`);
  }
});
```

### Sending Messages
```typescript
// Source: https://discord.js.org/docs/packages/discord.js/14.26.4/TextChannel:Class
// Plain text
await channel.send('Hello!');

// With options
await channel.send({
  content: 'Hello with options!',
  files: [{ attachment: 'https://example.com/image.png', name: 'image.png' }],
});
```

### Login and Lifecycle
```typescript
// Source: https://discord.js.org/docs/packages/discord.js/14.26.4/Client:Class
// Login - returns a Promise<string> (the token)
await client.login(botToken);

// Check ready state
if (client.isReady()) {
  console.log(`Logged in as ${client.user.tag}`);
}

// Destroy - cleans up everything
client.destroy();
```

### Shard Events for Reconnection Monitoring
```typescript
// Source: https://discord.js.org/docs/packages/discord.js/14.26.4/Client:Class
client.on('shardReady', (shardId) => {
  logger.info({ shardId }, 'Discord shard ready');
});

client.on('shardReconnecting', (shardId) => {
  logger.info({ shardId }, 'Discord shard reconnecting');
});

client.on('shardDisconnect', (event, shardId) => {
  logger.warn({ shardId, code: event.code }, 'Discord shard disconnected');
});

client.on('shardError', (error, shardId) => {
  logger.error({ shardId, err: error }, 'Discord shard error');
});
```

### OAuth2 Bot Authorization URL
```typescript
// Source: https://docs.discord.com/developers/topics/oauth2
// Construct the OAuth2 URL for bot authorization
function buildDiscordOAuthUrl(clientId: string, permissions: bigint): string {
  const scopes = ['bot', 'applications.commands'];
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes.join(' '),
    permissions: permissions.toString(),
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

// Common permission integers:
// 2147483648 = Send Messages + Read Messages + View Channels
// 8 = Administrator (not recommended for production)
```

### OAuth2 Token Exchange
```typescript
// Source: https://docs.discord.com/developers/topics/oauth2
async function exchangeOAuthCode(code: string): Promise<any> {
  const response = await axios.post(
    'https://discord.com/api/v10/oauth2/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_OAUTH_REDIRECT_URI!,
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: process.env.DISCORD_CLIENT_ID!,
        password: process.env.DISCORD_CLIENT_SECRET!,
      },
    },
  );
  return response.data;
  // Returns: { access_token, refresh_token, token_type, expires_in, scope, guild }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Discord.js v13 `ready` event | v14 `clientReady` event | v14.0 (2022) | Use `clientReady` instead of `ready` for ready state detection |
| Discord.js v13 `Intents.FLAGS` | v14 `GatewayIntentBits` enum | v14.0 (2022) | Use enum values like `GatewayIntentBits.Guilds` instead of bitwise flags |
| Discord.js v13 `client.channels.cache.get()` | v14 `client.channels.fetch()` (async) | v14.0 (2022) | Channel fetching is now async, returns Promise |

**Deprecated/outdated:**
- `client.on('ready', ...)` -> use `client.on('clientReady', ...)`
- `Intents.FLAGS.GUILDS` -> use `GatewayIntentBits.Guilds`
- `Permissions.FLAGS.SEND_MESSAGES` -> use `PermissionFlagsBits.SendMessages`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The project's existing `RedisRateLimiter` can be extended with a `discord` entry without breaking WhatsApp/Telegram limiters | Rate Limiting | Low -- the class is generic, platform is just a string key |
| A2 | The `config` JSON field on the Bot model can store `bot_token_masked` alongside existing fields like `system_prompt` and `ai_engine` | Workspace Routes | Low -- the field is Json type, accepts any shape |
| A3 | The startup sync in `src/index.ts` currently filters `status: { notIn: ['connected', 'disconnected'] }` -- Discord bots with `status: 'connected'` won't be caught by this filter | Startup Sync | Medium -- the filter needs modification to include Discord bots, or a separate sync block must be added |
| A4 | The `sessionName` field on Bot model (unique, nullable) can store a Discord-specific identifier like the bot's snowflake ID | Database | Low -- the field is a free-form string |
| A5 | discord.js v14 handles internal rate limiting for REST calls (channel.send) transparently via @discordjs/rest | Rate Limiting | Medium -- the library handles 429s with retry-after headers, but the project should still apply its own limiter as a safety layer per ARCHITECTURE.txt |
| A6 | The `canNext` check in AddBotModal currently requires `botToken` for Telegram -- needs a parallel check for Discord | Frontend | Low -- straightforward conditional addition |

## Open Questions (RESOLVED)

1. **OAuth2 Client Credentials Storage** — RESOLVED
   - Decision: Use env vars (consistent with Telegram pattern). Add `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_OAUTH_REDIRECT_URI` to `.env.example`.
   - Rationale: Telegram stores `TELEGRAM_API_ID`/`TELEGRAM_API_HASH` as env vars in docker-compose. Discord OAuth2 credentials follow the same pattern.

2. **OAuth2 Callback Route Location** — RESOLVED
   - Decision: `/api/workspaces/discord/callback` — consistent with the Telegram userbot route pattern (`/api/workspaces/telegram/*`).
   - Rationale: Keeps platform-specific OAuth2 routes under the workspaces namespace, maintaining routing consistency.

3. **Startup Sync Filter Modification** — RESOLVED
   - Decision: Add a separate block after the existing sync: find all Discord bots with `status: 'connected'` and call `DiscordAdapter.connect()` for each.
   - Rationale: Current filter `status: { notIn: ['connected', 'disconnected'] }` correctly handles WhatsApp/Telegram (their Docker containers survive restarts). Discord bots lose connections on restart and need explicit reconnection, so a separate sync block is cleaner than modifying the existing filter.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | discord.js runtime | ✓ | 22.22.2 | -- |
| Redis | BullMQ + rate limiter | ✓ | 7+ (via Docker) | -- |
| PostgreSQL | Bot/Lead/Message storage | ✓ | 15 (via Docker) | -- |
| npm | Package installation | ✓ | available | -- |
| Discord Developer Portal access | Bot creation + OAuth2 setup | Manual | -- | User must create application manually |

**Missing dependencies with no fallback:**
- Discord Developer Portal application (manual setup required -- user must create at discord.com/developers and enable Message Content Intent)

**Missing dependencies with fallback:**
- None

## Validation Architecture

> config.json does not have `workflow.nyquist_validation` set to `false` (key absent). Including this section.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | vitest.config.ts (inferred from `npm test` = `vitest run`) |
| Quick run command | `npx vitest run src/__tests__/discord-adapter.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-01 | DiscordAdapter.connect() creates Client and calls login | unit | `npx vitest run src/__tests__/discord-adapter.test.ts` | Wave 0 |
| DISC-02 | DiscordAdapter.disconnect() destroys Client and removes from Map | unit | `npx vitest run src/__tests__/discord-adapter.test.ts` | Wave 0 |
| DISC-03 | DiscordAdapter.sendMessage() sends to correct channel | unit | `npx vitest run src/__tests__/discord-adapter.test.ts` | Wave 0 |
| DISC-04 | normalizeDiscordMessage() maps Message to NormalizedMessage | unit | `npx vitest run src/__tests__/discord-normalizer.test.ts` | Wave 0 |
| DISC-05 | normalizeDiscordMessage() skips bot messages | unit | `npx vitest run src/__tests__/discord-normalizer.test.ts` | Wave 0 |
| DISC-06 | discordWorker processes jobs through 13-step pipeline | integration | `npx vitest run src/__tests__/discord-worker.test.ts` | Wave 0 |
| DISC-07 | POST /api/workspaces with platform='discord' creates bot + connects | integration | `npx vitest run src/__tests__/discord-workspace.test.ts` | Wave 0 |
| DISC-08 | ResponseRouter.dispatch() handles platform='discord' | unit | `npx vitest run src/__tests__/response-router.test.ts` | Exists (modify) |
| DISC-09 | Rate limiter enforces 5/sec per bot and 50/min per channel | unit | `npx vitest run src/__tests__/discord-rate-limit.test.ts` | Wave 0 |
| DISC-10 | Startup sync reconnects Discord bots on server boot | integration | `npx vitest run src/__tests__/discord-startup.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/discord-*.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/discord-adapter.test.ts` -- covers DISC-01, DISC-02, DISC-03
- [ ] `src/__tests__/discord-normalizer.test.ts` -- covers DISC-04, DISC-05
- [ ] `src/__tests__/discord-worker.test.ts` -- covers DISC-06
- [ ] `src/__tests__/discord-workspace.test.ts` -- covers DISC-07
- [ ] `src/__tests__/discord-rate-limit.test.ts` -- covers DISC-09
- [ ] `src/__tests__/discord-startup.test.ts` -- covers DISC-10
- [ ] `src/__tests__/setup.ts` -- MODIFY: add `discord.js` mock (vi.mock)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Discord bot token stored in DB `config` JSON field (encrypted at rest by PostgreSQL). OAuth2 client credentials in env vars. |
| V3 Session Management | no | Discord bots don't have sessions -- they maintain persistent WebSocket connections |
| V4 Access Control | yes | Existing RBAC middleware on workspace routes. Tenant isolation via `tenantId` filter on all queries. |
| V5 Input Validation | yes | Validate `bot_token` format before calling `client.login()`. Sanitize OAuth2 callback parameters. |
| V6 Cryptography | no | No custom crypto needed -- discord.js handles TLS for WebSocket, OAuth2 uses HTTPS |

### Known Threat Patterns for discord.js

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token leakage in logs | Information Disclosure | Mask `bot_token` in all log output (store `bot_token_masked` in config) |
| Bot token stored in plaintext in DB | Information Disclosure | Store in `config` JSON field, mask in API responses, consider encryption |
| Message content injection (XSS) | Tampering | Discord renders markdown, not HTML. Sanitize before displaying in frontend. |
| OAuth2 code interception | Elevation of Privilege | Validate `state` parameter in OAuth2 callback, use HTTPS redirect URI |
| Rate limit abuse (flooding) | Denial of Service | Application-level rate limiter + discord.js built-in rate limit handling |
| Bot impersonation (fake bot messages) | Spoofing | All messages come via authenticated Discord gateway WebSocket, not user-supplied webhooks |

## Sources

### Primary (HIGH confidence)

- discord.js v14.26.4 official docs (https://discord.js.org/docs/packages/discord.js/14.26.4/) -- Client class, GatewayIntentBits, Message class, TextChannel.send(), shard events
- Discord OAuth2 documentation (https://docs.discord.com/developers/topics/oauth2) -- Bot authorization flow, token exchange endpoints, permission integers
- npm registry -- discord.js 14.26.4, published 2026-05-01, engine requirement node >= 18

### Secondary (MEDIUM confidence)

- Existing codebase: src/adapters/telegramAdapter.ts, src/adapters/whatsapp.adapter.ts, src/normalizer/telegram.ts, src/normalizer/whatsapp.ts, src/router/index.ts, src/routes/workspaces.ts, src/workers/index.ts, src/queue/setup.ts, src/rateLimiter/index.ts, src/index.ts -- all patterns verified by reading source

### Tertiary (LOW confidence)

- None -- all claims verified against either official docs or source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- discord.js v14 is the de facto standard, version verified on npm
- Architecture: HIGH -- mirrors existing Telegram/WhatsApp patterns exactly, all source patterns read
- Pitfalls: HIGH -- all pitfalls documented from discord.js official docs and known behavior

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (30 days -- discord.js v14 is stable, API unlikely to change)
