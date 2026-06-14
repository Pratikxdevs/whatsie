# Phase 16: Discord Platform Integration - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning
**Source:** User requirements (detailed PRD)

<domain>
## Phase Boundary

Full Discord adapter integration into the existing multi-platform CRM bot SaaS. Discord uses discord.js v14 in-process (no Docker container), connecting via WebSocket gateway. The integration must mirror the existing Telegram pattern: bot token auth, in-process client lifecycle, platform-aware UI, and automated bot generation via OAuth2.

The scope covers: adapter, normalizer, queue, worker, ResponseRouter, workspace routes, rate limiting, startup sync, frontend wiring, and an OAuth2 bot auto-generation flow (similar to Telegram's userbot flow).

</domain>

<decisions>
## Implementation Decisions

### Discord SDK Choice
- Use discord.js v14 (npm package) — most mature Node.js Discord wrapper
- Runs in-process as a WebSocket client, no external Docker service needed
- Requires Node.js 22.12.0+

### Gateway Intents Required
- `GatewayIntentBits.Guilds` — server info
- `GatewayIntentBits.GuildMessages` — receive messages in channels
- `GatewayIntentBits.DirectMessages` — receive DMs
- `GatewayIntentBits.MessageContent` — read message content (privileged intent, must enable in Discord Developer Portal)

### Client Lifecycle Management
- Store active Client instances in a `Map<string, Client>` keyed by botId
- `connect(botToken, botId)` → create Client, attach MessageCreate listener, call `client.login()`
- `disconnect(botId)` → `client.destroy()`, remove from Map
- `isReady(botId)` → check `client.isReady()`
- Handle reconnect with exponential backoff on disconnect events

### Message Send Pattern
- `channel.send(text)` for channel messages
- `user.send(text)` for DMs
- No external API calls needed — all through discord.js WebSocket

### Adapter Architecture
- Follow existing adapter pattern: thin wrapper with static methods (like WhatsAppAdapter, TelegramAdapter)
- `DiscordAdapter.sendMessage(channelId, text)` → rate-limited send
- `DiscordAdapter.connect(botToken, botId)` → lifecycle management
- `DiscordAdapter.disconnect(botId)` → cleanup
- `DiscordAdapter.healthCheck(botId)` → status check

### Normalizer Pattern
- Follow existing normalizer pattern (whatsapp.ts, telegram.ts)
- Map Discord `MessageCreate` event → `NormalizedMessage`
- `platform: 'discord'`
- `userId` = author.id (Discord snowflake)
- `metadata: { channelId, guildId, messageId, authorUsername }`

### Queue Integration
- Add `discord-messages` BullMQ queue (per ARCHITECTURE.txt Layer 4)
- Concurrency: 200 workers (highest throughput per ARCHITECTURE.txt)
- Push normalized messages to queue, worker processes through existing pipeline

### ResponseRouter Integration
- Add `case 'discord'` in ResponseRouter.dispatch()
- Look up connected Discord bot for tenant
- Send via DiscordAdapter.sendMessage(channelId, text)

### Workspace Routes
- POST `/api/workspaces` — handle `platform: 'discord'`, require bot_token, call DiscordAdapter.connect(), create DB record
- POST `/:id/start` — DiscordAdapter.connect() with stored bot_token from config
- POST `/:id/stop` — DiscordAdapter.disconnect()
- GET `/:id/connection-status` — DiscordAdapter.isReady()
- DELETE `/:id` — DiscordAdapter.disconnect() + DB cleanup

### Rate Limiting (per ARCHITECTURE.txt Layer 8)
- 5 requests/second per bot
- 50 messages/minute per channel
- Strategy: Global + per-channel token buckets
- Use existing rateLimiter infrastructure

### Startup Sync
- On server startup, reconnect all Discord bots with status 'connected' in DB
- Follow existing startup sync pattern for WhatsApp/Telegram

### Bot Auto-Generation (OAuth2 Flow)
- Similar to Telegram userbot flow: user authenticates once, system creates bot automatically
- Discord OAuth2 with `bot` scope → get bot token
- Flow: User clicks "Connect Discord" → OAuth2 redirect → callback with code → exchange for bot token → create DB record → connect
- Store bot_token in bot config (masked in API responses)

### Frontend Changes
- `types.ts`: set `discord.supported = true` (already in Platform union)
- `AddBotModal.tsx`: add Discord bot_token input (like Telegram, no QR needed)
- Platform-aware status display, start/stop/delete buttons
- Debug server: Discord health check

### Docker Compatibility
- No Docker container needed — discord.js runs in-process
- No new docker-compose services required
- Just `npm i discord.js` dependency

### Claude's Discretion
- Exact error handling patterns (follow existing adapter conventions)
- Specific log message formats (follow existing logger patterns)
- Test file organization (follow existing test conventions)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `ARCHITECTURE.txt` — Full system architecture, Layer 1 (Platform API Adapters), Layer 3 (Normalizer), Layer 4 (Queue), Layer 8 (Rate Limiting), Layer 9 (Response Router)

### Existing Adapters (Pattern Source)
- `src/adapters/whatsapp.adapter.ts` — WhatsApp adapter pattern (thin wrapper, static methods)
- `src/adapters/telegramAdapter.ts` — Telegram adapter pattern (HTTP client to external API)
- `src/adapters/evolutionApi.ts` — Evolution API client (WhatsApp platform API)

### Response Router
- `src/router/index.ts` — Central outbound dispatch, platform switch, rate-limited send

### Workspace Routes
- `src/routes/workspaces.ts` — Platform branching for create/start/stop/delete/status, Telegram userbot flow pattern

### Normalizer
- `src/normalizer/whatsapp.ts` — WhatsApp normalizer pattern
- `src/normalizer/telegram.ts` — Telegram normalizer pattern
- `src/normalizer/types.ts` — NormalizedMessage type definition

### Queue & Workers
- `src/workers/index.ts` — Worker processing pipeline, platform queue handling

### Rate Limiter
- `src/rateLimiter.ts` (or similar) — Rate limiting infrastructure

### Frontend
- `frontend/src/components/bots/types.ts` — Platform union type, PLATFORM_CONFIG (discord.supported = false currently)
- `frontend/src/components/bots/AddBotModal.tsx` — Bot creation modal, platform-specific inputs
- `frontend/src/pages/BotsPage.tsx` — Bot management page

### Prisma Schema
- `prisma/schema.prisma` — Bot model, platform field (String, not enum)

### Docker
- `docker-compose.yml` — Current services (no Discord container needed)

</canonical_refs>

<specifics>
## Specific Ideas

### Discord Developer Portal Setup
- Create application at discord.com/developers
- Bot section: create bot, copy token
- Enable privileged intents: Message Content Intent
- OAuth2: configure redirect URLs for bot auto-generation flow

### Bot Auto-Generation Flow (like Telegram userbot)
1. User clicks "Connect Discord" in AddBotModal
2. Redirect to Discord OAuth2 with `bot` scope + permissions
3. User authorizes → Discord redirects back with code
4. Backend exchanges code for bot token via OAuth2 token endpoint
5. Backend creates bot via Discord API (or uses existing bot from OAuth2)
6. Store token in bot config, create DB record
7. Connect via DiscordAdapter.connect()

### Ed25519 Signature Verification
- Discord interactions endpoint requires Ed25519 signature verification
- For webhook-based interactions (slash commands, components)
- Not needed for basic message receiving via WebSocket gateway
- Future-proof: add verification middleware but don't block core integration

### Message Content Privileged Intent
- Must be enabled in Discord Developer Portal → Bot → Privileged Gateway Intents
- Without this, bot cannot read message content, only see that a message was sent
- Required for AI-powered responses

</specifics>

<deferred>
## Deferred Ideas

- Slash command registration (REST API) — not needed for basic message bot
- Discord components (buttons, select menus) — future enhancement
- Discord voice channels — out of scope
- Multi-server permissions management — future enhancement

</deferred>

---

*Phase: 16-Discord-Platform-Integration*
*Context gathered: 2026-05-24*
