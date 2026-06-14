---
phase: 16
plan: 03
status: complete
started: 2026-05-24T12:15:00Z
completed: 2026-05-24T12:30:00Z
commits:
  - hash: 9ecc665
    message: "feat(16-03): add Discord case to ResponseRouter and rate limiters"
  - hash: fe7d343
    message: "feat(16-03): add Discord branches to all workspace routes"
---

## Summary

Wired Discord into the ResponseRouter, added rate limiting, and implemented all workspace CRUD routes for Discord bots.

### What Was Built

- **ResponseRouter Discord dispatch** (`src/router/index.ts`):
  - `case 'discord'` in `ResponseRouter.dispatch()`
  - Looks up connected Discord bot by tenantId, extracts channelId from metadata
  - Sends via `DiscordAdapter.sendMessage()` wrapped in `sendWithRateLimit('discord', ...)`
  - Increments `messagesSentTotal` metric for discord platform

- **Discord rate limiters** (`src/rateLimiter/index.ts`):
  - `discordLimiter` — 200ms spacing = 5 requests/second per bot (global)
  - `discordChannelLimiter` — 1200ms spacing = 50 messages/minute per channel
  - Both exported and added to `limiters` object

- **Discord workspace routes** (`src/routes/workspaces.ts`):
  - **POST /** (create): Validates `bot_token`, connects via `DiscordAdapter.connect()`, waits for ready (10s timeout), creates DB record with masked token in config, reconnects with actual bot.id, attaches messageCreate handler
  - **POST /:id/start**: Retrieves stored `bot_token` from config, calls `DiscordAdapter.connect()`, attaches messageCreate handler, updates status to 'connected'
  - **POST /:id/stop**: Calls `DiscordAdapter.disconnect()`, updates status to 'disconnected'
  - **DELETE /:id**: Calls `DiscordAdapter.disconnect()` before DB deletion
  - **GET /:id/connection-status**: Checks `DiscordAdapter.isReady()`, updates DB if status changed
  - **GET /** (list): Syncs Discord bot status via `DiscordAdapter.isReady()` in status sync loop

- **attachDiscordMessageHandler helper**: Gets client via `DiscordAdapter.getClient()`, attaches `messageCreate` listener that rejects bot messages, normalizes via `normalizeDiscordMessage()`, queues via `discordMessagesQueue.add()`, and emits `new_message` via Socket.IO

### Key Design Decisions

- Bot token stored in config JSON field (encrypted at rest by PostgreSQL), masked in API responses
- `attachDiscordMessageHandler` is a standalone function (not inline) for reuse across create/start
- Connection timeout of 10s for initial Discord bot connection on create
- Discord branches are added BEFORE Telegram/WhatsApp branches in all routes (early return pattern)
- Stop route handles Discord disconnect first, then falls through to existing platform logic

### Verification

- TypeScript compiles cleanly (`npx tsc --noEmit` — zero errors)
- ResponseRouter handles platform='discord' case
- All 6 workspace route handlers have Discord branches
- Rate limiter exports discordLimiter and discordChannelLimiter
- messageCreate handler checks author.bot before processing

### Files Changed

| File | Change |
|------|--------|
| `src/router/index.ts` | Added DiscordAdapter import + case 'discord' in dispatch |
| `src/rateLimiter/index.ts` | Added discordLimiter (200ms) and discordChannelLimiter (1200ms) |
| `src/routes/workspaces.ts` | Added Discord branches to all 6 route handlers + messageCreate helper |
