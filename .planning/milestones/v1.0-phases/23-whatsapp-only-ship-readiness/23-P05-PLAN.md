---
plan_id: P05
phase: 23
objective: Remove platform selection UI and simplify to WhatsApp-only
wave: 2
depends_on: [P01, P02, P03]
files_modified:
  - frontend/src/components/bots/types.ts
  - frontend/src/components/bots/PlatformSelector.tsx (DELETE)
  - frontend/src/components/bots/AddBotModal.tsx
  - frontend/src/components/bots/QRCodeModal.tsx
  - frontend/src/components/bots/PlatformIcon.tsx
  - frontend/src/components/bots/BotDetailPanel.tsx
  - frontend/src/components/bots/TwitterSyncStatus.tsx (DELETE)
requirements: [P01, P02, P03]
autonomous: true
---

# Plan P05: Remove Platform Selection UI and Simplify to WhatsApp-Only

## Tasks

### Task 1: Simplify Platform type to WhatsApp-only
**read_first:**
- `frontend/src/components/bots/types.ts`

**acceptance_criteria:**
- `Platform` type is `'whatsapp'` only (literal type, not union)
- `PLATFORM_CONFIG` only has `whatsapp` key
- `PLATFORM_CONFIG.whatsapp.supported` is `true`

**action:**
- In `frontend/src/components/bots/types.ts`:
  - Change `Platform` type from `'whatsapp' | 'telegram' | 'discord' | 'messenger' | 'instagram' | 'teams' | 'twitter'` to `'whatsapp'`
  - Change `PLATFORM_CONFIG` to only contain the `whatsapp` entry:
    ```typescript
    export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: string; supported: boolean }> = {
      whatsapp: { label: 'WhatsApp', color: '#25D366', icon: 'MessageCircle', supported: true },
    };
    ```

### Task 2: Delete PlatformSelector component
**read_first:**
- `frontend/src/components/bots/PlatformSelector.tsx`

**acceptance_criteria:**
- `PlatformSelector.tsx` no longer exists
- No file imports `PlatformSelector`

**action:**
- Delete `frontend/src/components/bots/PlatformSelector.tsx`
- Search all frontend files for `import.*PlatformSelector` and remove those imports
- The only consumer is `AddBotModal.tsx` (fixed in Task 3)

### Task 3: Simplify AddBotModal to WhatsApp-only flow
**read_first:**
- `frontend/src/components/bots/AddBotModal.tsx`

**acceptance_criteria:**
- No import of `PlatformSelector`
- No import of `discordApi` or `telegramApi`
- No Telegram-specific state variables (tgAuthType, phone, phoneCodeHash, otpCode, password2fa, etc.)
- No Discord-specific state variables (dcAuthType, OAuth callback)
- No Twitter-specific state variables (twitterUsername, twitterEmail, twitterPassword, etc.)
- Platform is always set to `'whatsapp'` (no platform selection step)
- Steps are `['config', 'connect']` (no `'platform'` step)
- QR code flow is WhatsApp-only

**action:**
- In `frontend/src/components/bots/AddBotModal.tsx`:
  - Remove `import { PlatformSelector } from './PlatformSelector';` (line 5)
  - Remove `import { botApi, telegramApi, discordApi, type TelegramProfile } from '../../services/api';` — change to `import { botApi } from '../../services/api';`
  - Remove all Telegram state: `tgAuthType`, `setTgAuthType`, `phoneCodeHash`, `otpCode`, `password2fa`, `sessionName`, `phoneStep`, `userProfile`, `createdBotInfo` (lines 39-55)
  - Remove all Discord state: `dcAuthType`, `setDcAuthType` (line 41)
  - Remove all Twitter state: `twitterUsername`, `twitterEmail`, `twitterPassword`, `twitterTotpSecret` (lines 45-48)
  - Remove credential scraper state: `scrapeStep`, `scrapeSessionKey`, `scrapeOtp`, `credentialsSaved` (lines 58-61)
  - Remove Discord OAuth `useEffect` block (lines 69-94)
  - Change `Step` type from `'platform' | 'config' | 'connect'` to `'config' | 'connect'`
  - Remove `TelegramAuthType`, `DiscordAuthType`, `PhoneConnectStep`, `ScrapeStep` types
  - Set initial step to `'config'` and auto-set platform to `'whatsapp'`
  - Remove all platform-specific form branches in the render (Telegram token/phone input, Discord token/OAuth, Twitter login)
  - The connect step should only show QR code flow (WhatsApp)
  - In the connect step, POST to `/api/workspaces` with `{ name, system_prompt, ai_engine, api_key, temperature, max_tokens, platform: 'whatsapp' }`
  - After creation, show QR code modal for scanning

### Task 4: Simplify QRCodeModal to WhatsApp-only
**read_first:**
- `frontend/src/components/bots/QRCodeModal.tsx`

**acceptance_criteria:**
- All platform-conditional text is simplified to WhatsApp-only
- No references to `discord` or `telegram` in text/labels

**action:**
- In `frontend/src/components/bots/QRCodeModal.tsx`:
  - Change description from conditional text to: `'Scan the QR code with WhatsApp'`
  - Change loading text from conditional to: `'Generating QR code...'`
  - Change pending_qr text from conditional to: `'Open WhatsApp > Settings > Linked Devices > Link a Device'`
  - Change connected text from conditional to: `'Bot is now connected and ready to receive messages'`
  - Remove the `pending_qr` spinner for telegram/discord (lines 45-50)
  - Remove platform parameter from the component props (default to `'whatsapp'`, or remove entirely)

### Task 5: Simplify PlatformIcon to WhatsApp-only
**read_first:**
- `frontend/src/components/bots/PlatformIcon.tsx`

**acceptance_criteria:**
- `ICONS` record only has `whatsapp` key
- Component always renders WhatsApp icon

**action:**
- In `frontend/src/components/bots/PlatformIcon.tsx`:
  - Change `ICONS` to only have `whatsapp: MessageCircle`
  - Remove unused icon imports: `Send`, `Headphones`, `MessageSquare`, `Camera`, `Users`, `AtSign`

### Task 6: Remove TwitterSyncStatus component
**read_first:**
- `frontend/src/components/bots/TwitterSyncStatus.tsx`
- `frontend/src/components/bots/BotDetailPanel.tsx`

**acceptance_criteria:**
- `TwitterSyncStatus.tsx` no longer exists
- `BotDetailPanel.tsx` does not import or render `TwitterSyncStatus`

**action:**
- Delete `frontend/src/components/bots/TwitterSyncStatus.tsx`
- In `frontend/src/components/bots/BotDetailPanel.tsx`:
  - Remove `import { TwitterSyncStatus } from './TwitterSyncStatus';` (line 8)
  - Remove any render of `<TwitterSyncStatus botId={bot.id} />` from the component

### Task 7: Verify no remaining platform selection references
**acceptance_criteria:**
- `grep -r "PlatformSelector" frontend/` returns no results
- `grep -r "TwitterSyncStatus" frontend/` returns no results
- `grep -r "telegram\|discord\|twitter" frontend/src/components/bots/` returns no results

**action:**
- Run the grep commands above and fix any remaining references
- Run `cd frontend && npx tsc --noEmit` to verify compilation

## Verification

**must_haves:**
- [ ] `Platform` type is `'whatsapp'` only
- [ ] `PlatformSelector.tsx` deleted
- [ ] `TwitterSyncStatus.tsx` deleted
- [ ] `AddBotModal.tsx` has no platform selection step
- [ ] `AddBotModal.tsx` has no Telegram/Discord/Twitter state or logic
- [ ] `QRCodeModal.tsx` only shows WhatsApp QR flow
- [ ] `PlatformIcon.tsx` only has WhatsApp icon
- [ ] `BotDetailPanel.tsx` does not import TwitterSyncStatus
- [ ] `grep -r "telegram\|discord\|twitter" frontend/src/components/bots/` returns no results
- [ ] Frontend compiles: `cd frontend && npx tsc --noEmit`
