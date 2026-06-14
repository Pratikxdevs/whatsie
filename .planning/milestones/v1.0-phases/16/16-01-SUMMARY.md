---
phase: 16
plan: 01
status: complete
started: 2026-05-24T12:00:00Z
completed: 2026-05-24T12:05:00Z
commits:
  - hash: f3447d6
    message: "feat(16-01): add DiscordAdapter with discord.js v14 in-process client"
---

## Summary

Installed discord.js v14.26.4 and created `src/adapters/discordAdapter.ts` — the foundational Discord integration layer for the CRM.

### What Was Built

- **discord.js dependency** added to package.json (v14.26.4)
- **DiscordAdapter class** with 6 static methods:
  - `connect(botToken, botId)` — creates Client with 4 GatewayIntents, attaches lifecycle event listeners, calls login()
  - `disconnect(botId)` — calls client.destroy(), removes from Map
  - `getClient(botId)` — returns Client instance from Map
  - `isReady(botId)` — checks client.isReady()
  - `healthCheck(botId)` — returns { connected, tag? }
  - `sendMessage(channelId, text, botId)` — fetches channel, validates text-based, sends via WebSocket

### Key Design Decisions

- **Module-level Map<string, Client>** — multiple bots per process, keyed by botId
- **4 GatewayIntents**: Guilds, GuildMessages, DirectMessages, MessageContent
- **Lifecycle logging** via addLog with DISCORD_LIFECYCLE, DISCORD_AUTH, DISCORD_SEND codes
- **No external API service** — all communication via discord.js WebSocket gateway (unlike Telegram's HTTP adapter)
- **connect() calls disconnect() first** — safe reconnection, prevents client leaks

### Verification

- TypeScript compiles cleanly (`npx tsc --noEmit` — zero errors)
- discord.js v14.26.4 in package.json dependencies
- All 6 static methods exported
- No hardcoded tokens or secrets

### Files Changed

| File | Change |
|------|--------|
| `src/adapters/discordAdapter.ts` | **Created** — DiscordAdapter class |
| `package.json` | Added discord.js dependency |
| `package-lock.json` | Updated lockfile |
