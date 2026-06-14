---
phase: 16
plan: 02
status: complete
started: 2026-05-24T12:05:00Z
completed: 2026-05-24T12:10:00Z
commits:
  - hash: 3dd0350
    message: "feat(16-02): add Discord message normalizer"
  - hash: 120985d
    message: "feat(16-02): add Discord BullMQ queue and worker"
---

## Summary

Created the Discord message normalizer, BullMQ queue, and worker — completing the inbound Discord message pipeline.

### What Was Built

- **Discord normalizer** (`src/normalizer/discord.ts`):
  - `normalizeDiscordMessage(tenantId, message)` maps discord.js `Message` to `NormalizedMessage`
  - Rejects bot messages (`author.bot === true`) to prevent infinite loops
  - Classifies attachments by mimeType prefix (image/video/audio/file)
  - Extracts mentions from `message.mentions.users`
  - Sets `platform: 'discord'`, `userId: message.author.id`

- **Discord queue** (`src/queue/setup.ts`):
  - `discordMessagesQueue` — `'discord-messages'` BullMQ queue
  - Same connection, retry, and retention options as WhatsApp/Telegram queues

- **Discord worker** (`src/workers/index.ts`):
  - `discordWorker` — processes `'discord-messages'` queue
  - Concurrency: 200 (highest throughput per ARCHITECTURE.txt Layer 4)
  - Same 13-step pipeline as WhatsApp/Telegram workers
  - Context logger: `Worker.Discord`, addLog tag: `DISCORD_PIPELINE`

### Key Design Decisions

- Bot message rejection throws early (in normalizer) before hitting the queue
- Concurrency 200 matches ARCHITECTURE.txt Layer 4 spec for Discord
- Pipeline is identical to telegramWorker — no Discord-specific branching in the pipeline

### Verification

- TypeScript compiles cleanly (`npx tsc --noEmit` — zero errors)
- Normalizer exports `normalizeDiscordMessage` as required
- Queue exports `discordMessagesQueue` containing `'discord-messages'`
- Worker exports `discordWorker` processing `'discord-messages'` queue

### Files Changed

| File | Change |
|------|--------|
| `src/normalizer/discord.ts` | **Created** — Discord message normalizer |
| `src/queue/setup.ts` | Added `discordMessagesQueue` |
| `src/workers/index.ts` | Added `discordWorker` with concurrency 200 |
