---
phase: 16
plan: 04
status: complete
started: 2026-05-24T12:35:00Z
completed: 2026-05-24T12:50:00Z
commits:
  - hash: 7c14428
    message: "feat(16-04): add Discord startup sync to reconnect bots after server restart"
  - hash: c8fbbe8
    message: "feat(16-04): add Discord bot health check to debug server"
---

## Summary

Added Discord startup sync so bots reconnect after server restarts, and integrated Discord health check into the debug server.

### What Was Built

- **Discord startup sync** (`src/index.ts`):
  - New IIFE block after existing WhatsApp/Telegram sync
  - Queries `prisma.bot.findMany({ where: { platform: 'discord', status: 'connected' } })`
  - Extracts `bot_token` from `bot.config` JSON field
  - Calls `DiscordAdapter.connect(bot_token, bot.id)` for each bot
  - Attaches `messageCreate` handler (rejects bot messages, normalizes, queues via `discordMessagesQueue`)
  - Emits `new_message` via Socket.IO for real-time frontend updates
  - On failure: logs error, updates bot status to `'error'` in DB
  - Wrapped in try/catch to prevent startup sync failure from crashing server

- **Discord health check** (`src/debug/server.ts`):
  - Added `checks.discordBots` entry in `getSystemHealth()`
  - Queries DB for all Discord bots, checks `DiscordAdapter.isReady()` for each
  - Reports `'ok'` if at least one connected, `'degraded'` if none connected, `'error'` on failure
  - Latency tracked via `Date.now()` diff

### Key Design Decisions

- Startup sync runs as a separate block AFTER the existing WhatsApp/Telegram `Promise.allSettled` — isolated failure domain
- Uses the same `attachDiscordMessageHandler` pattern from 16-03 workspace routes (inline in sync block since workspace route helper isn't exported)
- Health check uses dynamic import of `DiscordAdapter` to avoid circular dependency issues
- Bot token never logged — only botId in error/success messages

### Verification

- TypeScript compiles cleanly (`npx tsc --noEmit` — zero errors)
- `src/index.ts` contains Discord startup sync block after existing sync
- `src/debug/server.ts` `getSystemHealth()` includes `checks.discordBots` entry

### Files Changed

| File | Change |
|------|--------|
| `src/index.ts` | Added Discord startup sync IIFE block |
| `src/debug/server.ts` | Added Discord bot health check in `getSystemHealth()` |
