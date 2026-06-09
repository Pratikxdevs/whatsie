# Phase 21 Context: /bots Page Bug Fixes

## Source
Comprehensive bug report from live testing + code audit of the /bots page. 33 bugs total across 8 categories.

## Files Under Fix
- `frontend/src/components/bots/BotConnectionStatus.tsx` (27 lines)
- `frontend/src/components/bots/BotCard.tsx` (136 lines)
- `frontend/src/components/ui/PhoneInput.tsx` (328 lines)
- `frontend/src/components/bots/BotConfigForm.tsx` (166 lines)
- `frontend/src/components/bots/AddBotModal.tsx` (1027 lines)
- `frontend/src/components/ProviderAuth.tsx` (280 lines)
- `frontend/src/components/bots/BotGrid.tsx` (41 lines)
- `frontend/src/pages/BotsPage.tsx` (583 lines)
- `frontend/src/components/bots/BotDetailPanel.tsx` (259 lines)
- `frontend/src/components/bots/QRCodeModal.tsx` (124 lines)
- `frontend/src/components/bots/PlatformSelector.tsx` (53 lines)

## Key Types
```ts
type BotStatus = 'disconnected' | 'starting' | 'pending_qr' | 'scanned' | 'connected' | 'error';
type Platform = 'whatsapp' | 'telegram' | 'discord' | 'messenger' | 'instagram' | 'teams' | 'twitter';
type AiEngine = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral' | 'cohere' | 'xai' | 'together' | 'fireworks' | 'bedrock' | 'ollama' | 'openrouter' | 'cerebras' | 'deepseek';
```

## User Decisions
1. PhoneInput: Remove the sync effect entirely. Only sync display value on mount.
2. API key after save: Clear the key but show a "Key saved" status indicator.
3. Fix ALL bugs — no skipping any.

## Bugs Not Fixed
- #6 (Info: API endpoint works) — informational only
- #19 (activeLeads/messagesToday always 0) — needs backend API
- #35 (PLATFORM_CONFIG shows all 7) — intentional design with "Soon" badges
