# Phase 16: Discord Platform Integration - Validation Plan

**Validated:** 2026-05-24
**Source:** RESEARCH.md test map + plan acceptance criteria

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/__tests__/discord-*.test.ts` |
| Full suite command | `npm test` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Plan |
|--------|----------|-----------|-------------------|------|
| DISC-01 | DiscordAdapter.connect() creates Client and calls login | unit | `npx vitest run src/__tests__/discord-adapter.test.ts` | 16-01 |
| DISC-02 | DiscordAdapter.disconnect() destroys Client and removes from Map | unit | `npx vitest run src/__tests__/discord-adapter.test.ts` | 16-01 |
| DISC-03 | DiscordAdapter.sendMessage() sends to correct channel | unit | `npx vitest run src/__tests__/discord-adapter.test.ts` | 16-01 |
| DISC-04 | normalizeDiscordMessage() maps Message to NormalizedMessage | unit | `npx vitest run src/__tests__/discord-normalizer.test.ts` | 16-02 |
| DISC-05 | normalizeDiscordMessage() skips bot messages (author.bot === true) | unit | `npx vitest run src/__tests__/discord-normalizer.test.ts` | 16-02 |
| DISC-06 | discordWorker processes jobs through 13-step pipeline | integration | `npx vitest run src/__tests__/discord-worker.test.ts` | 16-02 |
| DISC-07 | POST /api/workspaces with platform='discord' creates bot + connects | integration | `npx vitest run src/__tests__/discord-workspace.test.ts` | 16-03 |
| DISC-08 | ResponseRouter.dispatch() handles platform='discord' | unit | `npx vitest run src/__tests__/response-router.test.ts` | 16-03 |
| DISC-09 | Rate limiter enforces 5/sec per bot and 50/min per channel | unit | `npx vitest run src/__tests__/discord-rate-limit.test.ts` | 16-03 |
| DISC-10 | Startup sync reconnects Discord bots on server boot | integration | `npx vitest run src/__tests__/discord-startup.test.ts` | 16-04 |

## Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/discord-*.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

## Wave 0 Test Files

- [ ] `src/__tests__/discord-adapter.test.ts` — covers DISC-01, DISC-02, DISC-03
- [ ] `src/__tests__/discord-normalizer.test.ts` — covers DISC-04, DISC-05
- [ ] `src/__tests__/discord-worker.test.ts` — covers DISC-06
- [ ] `src/__tests__/discord-workspace.test.ts` — covers DISC-07
- [ ] `src/__tests__/discord-rate-limit.test.ts` — covers DISC-09
- [ ] `src/__tests__/discord-startup.test.ts` — covers DISC-10
- [ ] `src/__tests__/setup.ts` — MODIFY: add `discord.js` mock (vi.mock)

## Coverage Summary

| Category | Required | Covered | Gap |
|----------|----------|---------|-----|
| Adapter lifecycle | 3 tests | 3 (DISC-01–03) | none |
| Normalizer | 2 tests | 2 (DISC-04–05) | none |
| Worker pipeline | 1 test | 1 (DISC-06) | none |
| Workspace routes | 1 test | 1 (DISC-07) | none |
| ResponseRouter | 1 test | 1 (DISC-08) | none |
| Rate limiting | 1 test | 1 (DISC-09) | none |
| Startup sync | 1 test | 1 (DISC-10) | none |

## Metadata

**Phase:** 16
**Created:** 2026-05-24
