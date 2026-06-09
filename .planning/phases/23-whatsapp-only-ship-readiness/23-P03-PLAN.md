---
plan_id: P03
phase: 23
objective: Remove all Twitter backend code (adapters, normalizers, workers, routes, Docker services)
wave: 1
depends_on: []
files_modified:
  - src/adapters/twitterApi.ts (DELETE)
  - src/adapters/twitter.adapter.ts (DELETE)
  - src/normalizer/twitter.ts (DELETE)
  - src/workers/twitterWorker.ts (DELETE)
  - src/workers/twitterSync.ts (DELETE)
  - src/services/twitterSyncManager.ts (DELETE)
  - src/routes/workspaces.ts
  - src/queue/setup.ts
  - src/rateLimiter/index.ts
  - src/metrics/index.ts
  - src/index.ts
requirements: []
autonomous: true
---

# Plan P03: Remove Twitter Backend Code

## Tasks

### Task 1: Delete Twitter adapter, normalizer, worker, and service files
**read_first:**
- `src/adapters/twitterApi.ts`
- `src/adapters/twitter.adapter.ts`
- `src/normalizer/twitter.ts`
- `src/workers/twitterWorker.ts`
- `src/workers/twitterSync.ts`
- `src/services/twitterSyncManager.ts`

**acceptance_criteria:**
- All 6 files above no longer exist

**action:**
- Delete `src/adapters/twitterApi.ts`
- Delete `src/adapters/twitter.adapter.ts`
- Delete `src/normalizer/twitter.ts`
- Delete `src/workers/twitterWorker.ts`
- Delete `src/workers/twitterSync.ts`
- Delete `src/services/twitterSyncManager.ts`
- Run `grep -r "twitterApi\|twitter.adapter\|twitterWorker\|twitterSync\|twitterSyncManager" src/` to verify no remaining imports

### Task 2: Remove Twitter queues from setup
**read_first:**
- `src/queue/setup.ts`

**acceptance_criteria:**
- `twitterMessagesQueue` export is removed
- `twitterSyncQueue` export is removed
- Only `whatsappQueue` remains

**action:**
- In `src/queue/setup.ts`:
  - Delete `twitterMessagesQueue` (lines 64-79)
  - Delete `twitterSyncQueue` (lines 81-96)
  - After P01/P02, only `whatsappQueue` should remain

### Task 3: Remove Twitter worker imports from workers/index.ts
**read_first:**
- `src/workers/index.ts`

**acceptance_criteria:**
- No import of `./twitterWorker` or `./twitterSync`

**action:**
- In `src/workers/index.ts`:
  - Remove `import './twitterWorker';` (line 34)
  - Remove `import './twitterSync';` (line 35)

### Task 4: Remove Twitter platform logic from workspaces.ts
**read_first:**
- `src/routes/workspaces.ts`
- `src/routes/workspaces.ts` lines 8, 10 (Twitter imports)
- `src/routes/workspaces.ts` lines 19-41 (startTwitterSync, stopTwitterSync)
- `src/routes/workspaces.ts` lines 119-130 (GET / Twitter status sync)
- `src/routes/workspaces.ts` lines 294-408 (POST / Twitter bot creation)

**acceptance_criteria:**
- `src/routes/workspaces.ts` has no import of `TwitterApi` or `twitterApi`
- `src/routes/workspaces.ts` has no import of `twitterSyncQueue`
- `startTwitterSync` and `stopTwitterSync` functions are removed
- Twitter bot creation block is removed
- Twitter status sync block is removed

**action:**
- In `src/routes/workspaces.ts`:
  - Remove `import { TwitterApi } from '../adapters/twitterApi';` (line 8)
  - Remove `twitterSyncQueue` from import on line 10: change to remove entirely (no more non-WhatsApp queues)
  - Remove `startTwitterSync` function (lines 20-32)
  - Remove `stopTwitterSync` function (lines 34-41)
  - In GET `/` route status sync: remove `else if (bot.platform === 'twitter')` block (lines 119-130)
  - In POST `/` route: remove the entire Twitter bot creation block (lines 294-408)
  - Remove any remaining Twitter-specific logic in other routes (DELETE, PUT, start, stop, etc.)

### Task 5: Remove Twitter rate limiters
**read_first:**
- `src/rateLimiter/index.ts`

**acceptance_criteria:**
- `twitterDmLimiter` and `twitterTweetLimiter` exports are removed
- `limiters` object no longer contains `twitterDm` or `twitterTweet` keys

**action:**
- In `src/rateLimiter/index.ts`:
  - Remove `twitterDmLimiter` (lines 50-51)
  - Remove `twitterTweetLimiter` (lines 52)
  - Remove `twitterDm` and `twitterTweet` from the `limiters` object
  - After all platforms removed, only `whatsappLimiter` and its key remain

### Task 6: Remove Twitter metrics
**read_first:**
- `src/metrics/index.ts`

**acceptance_criteria:**
- `twitterSyncTotal` counter is removed
- `twitterSyncDuration` histogram is removed
- `twitterSyncErrors` counter is removed
- `twitterApiCalls` counter is removed
- `twitterRateLimitHits` counter is removed

**action:**
- In `src/metrics/index.ts`:
  - Remove `twitterSyncTotal` (lines 49-54)
  - Remove `twitterSyncDuration` (lines 56-62)
  - Remove `twitterSyncErrors` (lines 64-69)
  - Remove `twitterApiCalls` (lines 71-76)
  - Remove `twitterRateLimitHits` (lines 78-83)

### Task 7: Remove Twitter startup sync from index.ts
**read_first:**
- `src/index.ts`

**acceptance_criteria:**
- `src/index.ts` has no import of `twitterApi` or `TwitterApi`
- `src/index.ts` has no import of `twitterSyncManager` or `TwitterSyncManager`
- Twitter startup sync block is removed

**action:**
- In `src/index.ts`:
  - Remove `const { TwitterApi } = await import('./adapters/twitterApi');` (line 294)
  - Remove `const { TwitterSyncManager } = await import('./services/twitterSyncManager');` (line 295)
  - Remove the `else if (bot.platform === 'twitter')` block (lines 313-326)

### Task 8: Remove Twitter imports from workers/index.ts
**read_first:**
- `src/workers/index.ts`

**acceptance_criteria:**
- No import of `twitterWorker` or `twitterSync`

**action:**
- In `src/workers/index.ts`:
  - Remove `import './twitterWorker';` (line 34)
  - Remove `import './twitterSync';` (line 35)

### Task 9: Verify no remaining Twitter references
**acceptance_criteria:**
- `grep -r "twitter" src/ --include="*.ts"` returns no results (excluding test files)
- TypeScript compiles without errors

**action:**
- Run `grep -rn "twitter" src/ --include="*.ts" | grep -v __tests__ | grep -v node_modules`
- Fix any remaining references found
- Run `npx tsc --noEmit` to verify compilation

## Verification

**must_haves:**
- [ ] `src/adapters/twitterApi.ts` deleted
- [ ] `src/adapters/twitter.adapter.ts` deleted
- [ ] `src/normalizer/twitter.ts` deleted
- [ ] `src/workers/twitterWorker.ts` deleted
- [ ] `src/workers/twitterSync.ts` deleted
- [ ] `src/services/twitterSyncManager.ts` deleted
- [ ] `src/queue/setup.ts` has no Twitter queue exports
- [ ] `src/rateLimiter/index.ts` has no Twitter limiters
- [ ] `src/metrics/index.ts` has no Twitter metrics
- [ ] `src/routes/workspaces.ts` has no Twitter bot creation logic
- [ ] `src/index.ts` startup sync has no Twitter branch
- [ ] `grep -r "twitter" src/ --include="*.ts"` returns no results
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
