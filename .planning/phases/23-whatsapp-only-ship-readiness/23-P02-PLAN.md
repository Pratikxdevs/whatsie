---
plan_id: P02
phase: 23
objective: Remove all Discord backend code (adapters, normalizer, workers, routes, startup sync)
wave: 1
depends_on: []
files_modified:
  - src/adapters/discordAdapter.ts (DELETE)
  - src/normalizer/discord.ts (DELETE)
  - src/routes/workspaces.ts
  - src/queue/setup.ts
  - src/workers/index.ts
  - src/rateLimiter/index.ts
  - src/index.ts
requirements: []
autonomous: true
---

# Plan P02: Remove Discord Backend Code

## Tasks

### Task 1: Delete Discord adapter and normalizer files
**read_first:**
- `src/adapters/discordAdapter.ts`
- `src/normalizer/discord.ts`

**acceptance_criteria:**
- `src/adapters/discordAdapter.ts` no longer exists
- `src/normalizer/discord.ts` no longer exists

**action:**
- Delete `src/adapters/discordAdapter.ts`
- Delete `src/normalizer/discord.ts`
- Run `grep -r "discordAdapter\|normalizer/discord" src/` to verify no remaining imports

### Task 2: Remove Discord queue from setup
**read_first:**
- `src/queue/setup.ts`

**acceptance_criteria:**
- `discordMessagesQueue` export is removed from `src/queue/setup.ts`
- No other file imports `discordMessagesQueue`

**action:**
- In `src/queue/setup.ts`, delete the `discordMessagesQueue` export (lines 30-45)
- Search all files for `import.*discordMessagesQueue` and remove those import statements
- The only file importing `discordMessagesQueue` is `src/routes/workspaces.ts` (fixed in Task 4)

### Task 3: Remove Discord worker from workers/index.ts
**read_first:**
- `src/workers/index.ts`

**acceptance_criteria:**
- `discordWorker` export and all Discord worker code removed
- File only contains `whatsappWorker`
- No import of Discord adapters remains

**action:**
- In `src/workers/index.ts`:
  - Remove the entire `discordWorker` block (lines 324-437)
  - Remove `discordWorker.on('failed', ...)` handler (lines 439-441)
  - Verify only `whatsappWorker` remains as a worker export

### Task 4: Remove Discord platform logic from workspaces.ts
**read_first:**
- `src/routes/workspaces.ts`
- `src/routes/workspaces.ts` lines 6-8 (Discord imports)
- `src/routes/workspaces.ts` lines 69-85 (attachDiscordMessageHandler)
- `src/routes/workspaces.ts` lines 100-153 (GET / status sync)
- `src/routes/workspaces.ts` lines 173-234 (POST / Discord bot creation)

**acceptance_criteria:**
- `src/routes/workspaces.ts` has no import of `DiscordAdapter` or `discordAdapter`
- `src/routes/workspaces.ts` has no import of `normalizeDiscordMessage`
- `src/routes/workspaces.ts` has no import of `discordMessagesQueue`
- `attachDiscordMessageHandler` function is removed
- Discord bot creation block is removed
- Discord status sync block is removed

**action:**
- In `src/routes/workspaces.ts`:
  - Remove `import * as DiscordAdapter from '../adapters/discordAdapter';` (line 7)
  - Remove `import { normalizeDiscordMessage } from '../normalizer/discord';` (line 9)
  - Remove `discordMessagesQueue` from import on line 10: change to `import { twitterSyncQueue } from '../queue/setup';` (twitterSyncQueue removed in P03)
  - Remove the entire `attachDiscordMessageHandler` function (lines 69-85)
  - In GET `/` route status sync: remove `if (bot.platform === 'discord')` block (lines 103-110)
  - In POST `/` route: remove the entire Discord bot creation block (lines 173-234), including `botPlatform === 'discord'` check, `connect`, `getClient`, and DB create logic
  - Remove any remaining Discord-specific logic in other routes (DELETE, PUT, start, stop, etc.)

### Task 5: Remove Discord startup sync from index.ts
**read_first:**
- `src/index.ts`
- `src/index.ts` lines 341-391 (Discord startup sync)

**acceptance_criteria:**
- `src/index.ts` has no import of `discordAdapter` or `discord.js` adapter
- `src/index.ts` has no import of `normalizeDiscordMessage`
- `src/index.ts` has no import of `discordMessagesQueue`
- Discord startup sync block is removed

**action:**
- In `src/index.ts`:
  - Remove `const { connect, getClient } = await import('./adapters/discordAdapter');` (line 343)
  - Remove `const { normalizeDiscordMessage } = await import('./normalizer/discord');` (line 344)
  - Remove `const { discordMessagesQueue } = await import('./queue/setup');` (line 345)
  - Remove the entire Discord startup sync block (lines 341-391)

### Task 6: Remove Discord rate limiters
**read_first:**
- `src/rateLimiter/index.ts`

**acceptance_criteria:**
- `discordLimiter` and `discordChannelLimiter` exports are removed
- `limiters` object no longer contains `discord` or `discordChannel` keys

**action:**
- In `src/rateLimiter/index.ts`:
  - Remove `discordLimiter` (lines 42-43)
  - Remove `discordChannelLimiter` (lines 45-46)
  - Remove `discord` and `discordChannel` from the `limiters` object (lines 53-61)
  - After P03 removes Twitter limiters, only `whatsappLimiter` and its key remain

### Task 7: Verify no remaining Discord references
**acceptance_criteria:**
- `grep -r "discord" src/ --include="*.ts"` returns no results (excluding test files)
- TypeScript compiles without errors

**action:**
- Run `grep -rn "discord" src/ --include="*.ts" | grep -v __tests__ | grep -v node_modules`
- Fix any remaining references found
- Run `npx tsc --noEmit` to verify compilation

## Verification

**must_haves:**
- [ ] `src/adapters/discordAdapter.ts` deleted
- [ ] `src/normalizer/discord.ts` deleted
- [ ] `src/queue/setup.ts` has no `discordMessagesQueue` export
- [ ] `src/workers/index.ts` has no `discordWorker`
- [ ] `src/routes/workspaces.ts` has no Discord bot creation logic
- [ ] `src/routes/workspaces.ts` has no `attachDiscordMessageHandler`
- [ ] `src/index.ts` startup sync has no Discord branch
- [ ] `src/rateLimiter/index.ts` has no Discord limiters
- [ ] `grep -r "discord" src/ --include="*.ts"` returns no results
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
