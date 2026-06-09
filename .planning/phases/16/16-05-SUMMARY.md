---
phase: 16
plan: 05
status: complete
started: 2026-05-24T13:00:00Z
completed: 2026-05-24T13:15:00Z
commits:
  - hash: 83132d3
    message: "feat(16-05): enable Discord platform in frontend bot creation flow"
  - hash: c2a0b8e
    message: "feat(16-05): update QRCodeModal for Discord platform awareness"
---

## Summary

Wired Discord into the frontend bot management UI -- platform selector, AddBotModal, BotCard, QRCodeModal, and BotDetailPanel all handle Discord platform correctly.

### What Was Built

- **Platform config** (`types.ts`):
  - Discord `supported: true` in PLATFORM_CONFIG — now selectable and not grayed out in the platform grid

- **AddBotModal** (`AddBotModal.tsx`):
  - Discord bot_token input field with password type in the config step
  - Help text pointing to Discord Developer Portal for token + Message Content Intent
  - Updated `canNext` to allow proceeding with bot_token for Discord
  - `createWorkspace` call passes `bot_token` for Discord (same pattern as Telegram)
  - Connect step treats Discord like Telegram — instant connected status, no QR code polling
  - All platform-aware status messages updated (loading/creating/connected states)

- **QRCodeModal** (`QRCodeModal.tsx`):
  - No QR code shown for Discord platform (same as Telegram)
  - Platform-aware messaging for all states: loading, pending, connected, error
  - Uses spinner + "Connecting to Discord..." instead of QR display

- **BotCard and BotDetailPanel**: No changes needed — they already use PLATFORM_CONFIG and platform-agnostic rendering. Discord bots display with Headphones icon, correct colors, and working start/stop/delete buttons.

### Key Design Decisions

- Discord follows the Telegram token auth pattern exactly — bot_token input, instant connection, no QR polling
- Used `type="password"` for bot_token input to mitigate information disclosure (T-16-12)
- Platform-aware conditionals use `platform === 'telegram' || platform === 'discord'` pattern throughout connect flow

### Verification

- TypeScript compiles cleanly (`npx tsc --noEmit` — zero errors)
- Discord platform is selectable and not grayed out in PlatformSelector
- AddBotModal creates Discord bots with bot_token
- No QR code shown for Discord bots in any modal
- BotCard, BotDetailPanel work for Discord bots without changes

### Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/bots/types.ts` | Discord `supported: true` |
| `frontend/src/components/bots/AddBotModal.tsx` | Discord bot_token input, canNext, createWorkspace, connect flow |
| `frontend/src/components/bots/QRCodeModal.tsx` | Discord platform-aware messaging, no QR display |
