---
plan_id: P06
phase: 23
objective: Clean up frontend services, schemas, and remaining platform references
wave: 2
depends_on: [P05]
files_modified:
  - frontend/src/services/api.ts
  - frontend/src/components/bots/BotCard.tsx
  - frontend/src/components/bots/BotGrid.tsx
  - frontend/src/components/bots/BotConnectionStatus.tsx
  - frontend/src/components/bots/BotConfigForm.tsx
  - frontend/src/components/bots/BulkActions.tsx
requirements: [P05]
autonomous: true
---

# Plan P06: Clean Up Frontend Services and Remaining Platform References

## Tasks

### Task 1: Remove Telegram and Discord API functions from frontend api.ts
**read_first:**
- `frontend/src/services/api.ts`

**acceptance_criteria:**
- `discordApi` object is removed
- `telegramApi` object is removed
- `scraperApi` is removed (used only for Telegram credential scraping)
- `botApi` still exists and works

**action:**
- In `frontend/src/services/api.ts`:
  - Remove the `discordApi` export (lines 317-325): includes `getOAuthUrl`, `handleCallback`
  - Remove the `telegramApi` export (lines 331-370): includes `sendCode`, `verifyCode`, `checkPassword`, `getProfile`, `autoCreateBot`, `scrapeCredentialsStart`, `scrapeCredentialsVerify`, `getCachedCredentials`
  - Remove `scraperApi` if it exists (used for Telegram scraping)
  - Verify `botApi` export still works (should have `create`, `get`, `list`, `update`, `delete`, `start`, `stop`, `restart`)

### Task 2: Clean up BotCard.tsx platform references
**read_first:**
- `frontend/src/components/bots/BotCard.tsx`

**acceptance_criteria:**
- No conditional rendering based on `platform === 'telegram'` or `platform === 'discord'` or `platform === 'twitter'`
- Component works for WhatsApp-only

**action:**
- In `frontend/src/components/bots/BotCard.tsx`:
  - Search for any platform-conditional rendering
  - Remove Telegram/Discord/Twitter-specific UI elements
  - Verify `PlatformIcon` import works (simplified in P05)

### Task 3: Clean up BotGrid.tsx platform references
**read_first:**
- `frontend/src/components/bots/BotGrid.tsx`

**acceptance_criteria:**
- No platform filtering or conditional logic for non-WhatsApp platforms

**action:**
- In `frontend/src/components/bots/BotGrid.tsx`:
  - Search for any platform filtering logic
  - Remove any non-WhatsApp platform filters
  - If there's a platform filter dropdown, remove it or set to WhatsApp-only

### Task 4: Clean up BotConnectionStatus.tsx platform references
**read_first:**
- `frontend/src/components/bots/BotConnectionStatus.tsx`

**acceptance_criteria:**
- No platform-conditional status display
- WhatsApp-specific status states work correctly

**action:**
- In `frontend/src/components/bots/BotConnectionStatus.tsx`:
  - Search for platform-conditional rendering
  - Remove non-WhatsApp platform branches
  - Keep WhatsApp status states: disconnected, starting, pending_qr, scanned, connected, error

### Task 5: Clean up BotConfigForm.tsx platform references
**read_first:**
- `frontend/src/components/bots/BotConfigForm.tsx`

**acceptance_criteria:**
- No platform-specific form fields for non-WhatsApp platforms

**action:**
- In `frontend/src/components/bots/BotConfigForm.tsx`:
  - Search for platform-conditional form fields
  - Remove Discord bot_token field, Telegram bot_token field, Twitter credentials fields
  - Keep WhatsApp-specific fields if any (or generic AI config fields)

### Task 6: Clean up BulkActions.tsx platform references
**read_first:**
- `frontend/src/components/bots/BulkActions.tsx`

**acceptance_criteria:**
- No platform-conditional bulk action logic

**action:**
- In `frontend/src/components/bots/BulkActions.tsx`:
  - Search for platform-conditional logic
  - Remove non-WhatsApp bulk actions if any

### Task 7: Verify no remaining platform references in frontend
**acceptance_criteria:**
- `grep -r "telegram\|discord\|twitter" frontend/src/ --include="*.tsx" --include="*.ts"` returns no results (excluding node_modules)
- Frontend compiles without errors

**action:**
- Run `grep -rn "telegram\|discord\|twitter" frontend/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules`
- Fix any remaining references found
- Run `cd frontend && npx tsc --noEmit` to verify compilation

## Verification

**must_haves:**
- [ ] `discordApi` removed from `frontend/src/services/api.ts`
- [ ] `telegramApi` removed from `frontend/src/services/api.ts`
- [ ] `scraperApi` removed from `frontend/src/services/api.ts`
- [ ] `BotCard.tsx` has no non-WhatsApp platform conditionals
- [ ] `BotGrid.tsx` has no non-WhatsApp platform filters
- [ ] `BotConnectionStatus.tsx` has no non-WhatsApp platform branches
- [ ] `BotConfigForm.tsx` has no non-WhatsApp platform form fields
- [ ] `BulkActions.tsx` has no non-WhatsApp platform logic
- [ ] `grep -r "telegram\|discord\|twitter" frontend/src/` returns no results
- [ ] Frontend compiles: `cd frontend && npx tsc --noEmit`
