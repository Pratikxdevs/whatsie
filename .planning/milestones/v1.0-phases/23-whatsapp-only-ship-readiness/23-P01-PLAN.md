---
plan_id: P01
phase: 23
objective: Remove all Telegram backend code (adapters, normalizers, workers, routes, queue, rate limiters, metrics)
wave: 1
depends_on: []
files_modified:
  - src/adapters/telegramAdapter.ts (DELETE)
  - src/adapters/telegram.adapter.ts (DELETE)
  - src/normalizer/telegram.ts (DELETE)
  - src/routes/gateway.ts
  - src/routes/workspaces.ts
  - src/queue/setup.ts
  - src/workers/index.ts
  - src/rateLimiter/index.ts
  - src/metrics/index.ts
  - src/index.ts
requirements: []
autonomous: true
---

# Plan P01: Remove Telegram Backend Code

## Tasks

### Task 1: Delete Telegram adapter files
**read_first:**
- `src/adapters/telegramAdapter.ts`
- `src/adapters/telegram.adapter.ts`

**acceptance_criteria:**
- `src/adapters/telegramAdapter.ts` no longer exists
- `src/adapters/telegram.adapter.ts` no longer exists

**action:**
- Delete `src/adapters/telegramAdapter.ts`
- Delete `src/adapters/telegram.adapter.ts`
- Run `grep -r "telegramAdapter\|telegram.adapter" src/` to verify no remaining imports reference these files

### Task 2: Delete Telegram normalizer
**read_first:**
- `src/normalizer/telegram.ts`

**acceptance_criteria:**
- `src/normalizer/telegram.ts` no longer exists

**action:**
- Delete `src/normalizer/telegram.ts`
- Run `grep -r "normalizer/telegram" src/` to verify no remaining imports reference this file

### Task 3: Remove Telegram queue from setup
**read_first:**
- `src/queue/setup.ts`

**acceptance_criteria:**
- `telegramQueue` export is removed from `src/queue/setup.ts`
- No other file imports `telegramQueue` from `../queue/setup`

**action:**
- In `src/queue/setup.ts`, delete the `telegramQueue` export (lines 47-62)
- Search all files for `import.*telegramQueue` and remove those import statements
- The only file importing `telegramQueue` is `src/routes/gateway.ts` (fixed in Task 5)

### Task 4: Remove Telegram worker from workers/index.ts
**read_first:**
- `src/workers/index.ts`

**acceptance_criteria:**
- `telegramWorker` export and all Telegram worker code removed from `src/workers/index.ts`
- File only contains `whatsappWorker` and helper functions
- No import of Telegram adapters or normalizers remains

**action:**
- In `src/workers/index.ts`:
  - Remove the entire `telegramWorker` block (lines 206-322)
  - Remove `telegramWorker.on('failed', ...)` handler (lines 320-322)
  - Verify only `whatsappWorker` remains as a worker export

### Task 5: Remove Telegram webhook handler from gateway.ts
**read_first:**
- `src/routes/gateway.ts`

**acceptance_criteria:**
- `src/routes/gateway.ts` only contains WhatsApp webhook handler
- No import of `normalizeTelegramWebhook` remains
- No import of `telegramQueue` remains
- Telegram webhook route `POST /telegram/:tenantId` is removed

**action:**
- In `src/routes/gateway.ts`:
  - Remove `import { normalizeTelegramWebhook } from '../normalizer/telegram';` (line 3)
  - Remove `telegramQueue` from the import on line 4: change to `import { whatsappQueue, redisConnection } from '../queue/setup';`
  - Delete the entire Telegram webhook route handler (lines 189-245)
  - Keep only the WhatsApp webhook route handler (lines 84-187)

### Task 6: Remove Telegram platform status sync from workspaces.ts
**read_first:**
- `src/routes/workspaces.ts`
- `src/routes/workspaces.ts` lines 100-153 (GET / status sync)
- `src/routes/workspaces.ts` lines 237-289 (POST / Telegram bot creation)

**acceptance_criteria:**
- `src/routes/workspaces.ts` has no import of `TgApi` or `telegramAdapter`
- Status sync block only handles WhatsApp (and Discord for now, removed in P02)
- Telegram bot creation block is removed
- Telegram-related helper functions are removed

**action:**
- In `src/routes/workspaces.ts`:
  - Remove `import * as TgApi from '../adapters/telegramAdapter';` (line 6)
  - In GET `/` route status sync (lines 100-145): remove the `else if (bot.platform === 'telegram')` block (lines 111-118)
  - In POST `/` route: remove the entire Telegram bot creation block (lines 237-289), including `botPlatform === 'telegram'` check, `signBot`, `initializeSession`, and DB create logic
  - Remove any remaining Telegram-specific logic in other routes (DELETE, PUT, start, stop, etc.)

### Task 7: Remove Telegram rate limiters
**read_first:**
- `src/rateLimiter/index.ts`

**acceptance_criteria:**
- `telegramLimiter` and `telegramUserLimiter` exports are removed
- `limiters` object no longer contains `telegram` or `telegramUser` keys
- `sendWithRateLimit` still works for `whatsapp` and remaining platforms

**action:**
- In `src/rateLimiter/index.ts`:
  - Remove `telegramLimiter` (lines 36-37)
  - Remove `telegramUserLimiter` (lines 39-40)
  - Remove `telegram` and `telegramUser` from the `limiters` object (lines 53-61)
  - Remove `discordLimiter`, `discordChannelLimiter`, `twitterDmLimiter`, `twitterTweetLimiter` and their keys (handled in P02/P03)
  - Keep only `whatsappLimiter` and its key

### Task 8: Remove Telegram metrics
**read_first:**
- `src/metrics/index.ts`

**acceptance_criteria:**
- No Twitter-specific metrics exist (Twitter metrics removed in P03)
- Telegram metrics were never defined separately, but verify no references exist

**action:**
- In `src/metrics/index.ts`: no changes needed for Telegram specifically (Twitter metrics removed in P03)
- Verify with grep that no file references `platform: 'telegram'` in metric calls

### Task 9: Remove Telegram startup sync from index.ts
**read_first:**
- `src/index.ts`

**acceptance_criteria:**
- Startup sync block only handles WhatsApp bots
- No import of `telegramAdapter` or `restoreSession`/`getSessionStatus`
- `io.to(bot.tenantId).emit('bot_status_change', ...)` no longer sends `platform: 'twitter'`

**action:**
- In `src/index.ts` startup sync (lines 282-392):
  - Remove `const { getSessionStatus, restoreSession } = await import('./adapters/telegramAdapter');` (line 293)
  - Remove the `if (bot.platform === 'telegram')` block (lines 300-312)
  - Keep only the WhatsApp `else` block (now becomes the default path)
  - The Discord and Twitter blocks are removed in P02 and P03 respectively

### Task 10: Remove Telegram references from frontend workspace routes
**read_first:**
- `src/routes/workspaces.ts` (full file, all 1268 lines)

**acceptance_criteria:**
- No route handler references `telegram` platform
- No Telegram-specific API endpoints remain (send-code, verify-code, check-password, profile, auto-create-bot, scrape-credentials)

**action:**
- In `src/routes/workspaces.ts`:
  - Search for all remaining `telegram` references after previous tasks
  - Remove any Telegram-specific route handlers (e.g., `router.post('/telegram/send-code', ...)`, `router.post('/telegram/verify-code', ...)`, etc.)
  - Remove any Telegram-specific helper functions like `startTwitterSync`/`stopTwitterSync` (Twitter, removed in P03)
  - Verify with `grep -n "telegram" src/routes/workspaces.ts` returns no results

### Verification

**must_haves:**
- [ ] `src/adapters/telegramAdapter.ts` deleted
- [ ] `src/adapters/telegram.adapter.ts` deleted
- [ ] `src/normalizer/telegram.ts` deleted
- [ ] `src/queue/setup.ts` has no `telegramQueue` export
- [ ] `src/workers/index.ts` has no `telegramWorker`
- [ ] `src/routes/gateway.ts` has no Telegram webhook route
- [ ] `src/routes/workspaces.ts` has no Telegram bot creation logic
- [ ] `src/rateLimiter/index.ts` has no Telegram limiters
- [ ] `src/index.ts` startup sync has no Telegram branch
- [ ] `grep -r "telegram" src/ --include="*.ts"` returns no results (excluding test files)
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
