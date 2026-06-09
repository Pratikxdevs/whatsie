---
plan_id: P11
phase: 23
objective: Environment cleanup, git repo change, E2E verification
wave: 4
depends_on: [P07, P08, P09, P10]
files_modified:
  - .env
  - .env.example
  - package.json
  - .gitignore
  - src/index.ts
  - src/normalizer/types.ts
requirements: [P07, P08, P09, P10]
autonomous: true
---

# Plan P11: Environment Cleanup, Git Repo Change, E2E Verification

## Tasks

### Task 1: Clean up environment variables
**read_first:**
- `.env`
- `.env.example`

**acceptance_criteria:**
- `TELEGRAM_*` env vars removed
- `DISCORD_*` env vars removed
- `TWITTER_*` env vars removed
- `HYDROGRAM_API_TOKEN` removed
- WhatsApp env vars remain: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_API_SECRET`
- Core env vars remain: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `GATEWAY_SECURITY_TOKEN`

**action:**
- In `.env`:
  - Remove `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_API_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
  - Remove `TWITTER_API_TOKEN`
  - Remove `HYDROGRAM_API_TOKEN`
  - Keep: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `GATEWAY_SECURITY_TOKEN`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_API_SECRET`
  - Keep: `GROQ_API_KEY`, `OPENAI_API_KEY`, `CLERK_SECRET_KEY`, etc.
- In `.env.example`:
  - Same removals as `.env`
  - Add comments for required WhatsApp vars

### Task 2: Update src/index.ts startup sync to WhatsApp-only
**read_first:**
- `src/index.ts` lines 282-392 (startup sync)

**acceptance_criteria:**
- Startup sync only handles WhatsApp bots
- No platform-specific branching
- Only `getConnectionState` is called

**action:**
- In `src/index.ts` startup sync:
  - After P01/P02/P03, only WhatsApp branch remains
  - Simplify to:
    ```typescript
    const bots = await prisma.bot.findMany({
      where: { status: { notIn: ['connected', 'disconnected'] }, sessionName: { not: null } },
      select: { id: true, tenantId: true, sessionName: true, status: true, platform: true },
    });
    if (bots.length === 0) return;
    
    const { getConnectionState } = await import('./adapters/evolutionApi');
    
    await Promise.allSettled(
      bots.map(async (bot) => {
        try {
          await getConnectionState(bot.sessionName!);
          logger.info({ botId: bot.id, sessionName: bot.sessionName }, 'Bot status synced on startup');
        } catch {
          // Evolution API unreachable — keep DB status
        }
      })
    );
    ```
  - Remove all non-WhatsApp import branches

### Task 3: Update NormalizedMessage platform type
**read_first:**
- `src/normalizer/types.ts`

**acceptance_criteria:**
- `platform` field in `NormalizedMessage` is `'whatsapp'` only (or a narrow union that includes only whatsapp)

**action:**
- In `src/normalizer/types.ts`:
  - Change `platform: 'whatsapp' | 'telegram' | 'discord' | 'meta' | 'teams' | 'twitch | 'twitter'` to `platform: 'whatsapp'`
  - Or keep as a broader type but ensure only WhatsApp is used

### Task 4: Update package.json dependencies
**read_first:**
- `package.json`

**acceptance_criteria:**
- No `discord.js` dependency
- No `twikit` or Twitter-related dependencies
- No `grammy` or `telegraf` or Telegram-related dependencies
- `bullmq` still present
- `axios` still present

**action:**
- In `package.json`:
  - Remove `discord.js` if present
  - Remove `twikit` if present
  - Remove `grammy`, `telegraf`, or similar if present
  - Keep: `bullmq`, `axios`, `express`, `@prisma/client`, `socket.io`, etc.
  - Run `npm install` to update lockfile

### Task 5: Update .gitignore
**read_first:**
- `.gitignore`

**acceptance_criteria:**
- `.env` is in `.gitignore`
- `apikeys.txt` is in `.gitignore`
- No platform-specific ignores needed

**action:**
- In `.gitignore`:
  - Verify `.env` is listed
  - Verify `apikeys.txt` is listed
  - Add if missing

### Task 6: Change git remote to new repository
**read_first:**
- Current git remote configuration

**acceptance_criteria:**
- Git remote `origin` points to new repository
- Commit history is preserved

**action:**
- Run `git remote -v` to see current remote
- Run `git remote set-url origin <new-repo-url>` to change remote
- Run `git remote -v` to verify
- Run `git push -u origin main` to push to new repo
- Preserve commit history (no force push)

### Task 7: Full TypeScript compilation check
**read_first:**
- All modified files

**acceptance_criteria:**
- Backend compiles: `npx tsc --noEmit`
- Frontend compiles: `cd frontend && npx tsc --noEmit`

**action:**
- Run `npx tsc --noEmit` from project root
- Run `cd frontend && npx tsc --noEmit`
- Fix any compilation errors found

### Task 8: Lint check
**read_first:**
- All modified files

**acceptance_criteria:**
- No lint errors in modified files

**action:**
- Run `npm run lint` if configured
- Fix any lint errors found

### Task 9: E2E verification of WhatsApp flow
**read_first:**
- All WhatsApp-related files

**acceptance_criteria:**
- WhatsApp connect flow works (create bot → QR → scan → connected)
- WhatsApp inbound message flow works (webhook → normalize → queue → worker)
- WhatsApp AI response works (worker → AI → response)
- WhatsApp outbound works (response → Evolution API → message sent)
- Real-time updates work via Socket.IO

**action:**
- Manual E2E test checklist:
  1. **Connect**: POST `/api/workspaces` → QR code returned → scan with WhatsApp → bot shows connected
  2. **Inbound**: Send message from WhatsApp → webhook received → message appears in conversations
  3. **AI**: Bot processes message → AI generates response → response sent back to WhatsApp
  4. **Outbound**: Send message from conversations UI → message sent to WhatsApp
  5. **Real-time**: New messages appear instantly in UI via Socket.IO
  6. **Status**: Bot status updates correctly (connected/disconnected/error)

### Task 10: Verify no remaining non-WhatsApp references
**acceptance_criteria:**
- `grep -r "telegram\|discord\|twitter" src/ --include="*.ts"` returns no results
- `grep -r "telegram\|discord\|twitter" frontend/src/ --include="*.tsx" --include="*.ts"` returns no results
- No non-WhatsApp Docker services in docker-compose.yml

**action:**
- Run comprehensive grep searches
- Fix any remaining references
- Final verification

## Verification

**must_haves:**
- [ ] All TELEGRAM_*, DISCORD_*, TWITTER_* env vars removed
- [ ] Startup sync only handles WhatsApp
- [ ] NormalizedMessage platform type is WhatsApp-only
- [ ] No discord.js, twikit, grammy in package.json
- [ ] .gitignore includes .env and apikeys.txt
- [ ] Git remote points to new repository
- [ ] Backend compiles: `npx tsc --noEmit`
- [ ] Frontend compiles: `cd frontend && npx tsc --noEmit`
- [ ] No lint errors
- [ ] E2E WhatsApp flow works
- [ ] No non-WhatsApp references in codebase
