---
phase: 3-platform-expansion
plan: 01
subsystem: adapters
tags: [telegram, bot-api, webhooks, bullmq, normalizer]

requires:
  - phase: 1-foundation
    provides: Redis connection, BullMQ queue pattern, gateway route structure, normalizer types
provides:
  - TelegramAdapter class with sendMessage, sendMessageWithKeyboard, setWebhook, deleteWebhook
  - normalizeTelegramWebhook function producing NormalizedMessage
  - telegram-messages BullMQ queue
  - Full Telegram webhook pipeline in gateway (secret validation, idempotency, normalize, queue)
affects: [response-router, workers, frontend-conversations]

tech-stack:
  added: []
  patterns: [multi-platform adapter pattern, webhook idempotency via setnx]

key-files:
  created:
    - src/normalizer/telegram.ts
  modified:
    - src/adapters/telegram.ts
    - src/queue/setup.ts
    - src/routes/gateway.ts

key-decisions:
  - "Kept deprecated sendTelegramMessage export for backward compatibility"
  - "Used lowercase x-telegram-bot-api-secret-token header (Express auto-lowercases)"
  - "Normalized message type detection: photo->image, voice/audio->audio, document->file, location->location"

patterns-established:
  - "Adapter class pattern: constructor(token), sendMessage, sendMessageWithKeyboard, setWebhook, deleteWebhook"
  - "Normalizer pattern: normalize{Platform}Webhook(tenantId, rawPayload) -> NormalizedMessage"
  - "Gateway webhook pattern: secret validation -> idempotency check -> normalize -> queue"

requirements-completed: [TEL-01, TEL-02]

duration: 5min
completed: 2026-05-19
---

# Phase 3 Plan 01: Telegram Adapter & Normalizer Summary

**TelegramBotAPI adapter class with inline keyboard support, webhook management, and full inbound webhook pipeline through gateway normalizer to BullMQ queue**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-19T23:35:00Z
- **Completed:** 2026-05-19T23:40:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- TelegramAdapter class with sendMessage, sendMessageWithKeyboard, setWebhook, deleteWebhook methods
- normalizeTelegramWebhook function handling text, photo, voice, audio, document, location message types
- telegram-messages BullMQ queue with same retry/backoff config as whatsappQueue
- Full gateway webhook handler with X-Telegram-Bot-Api-Secret-Token validation, Redis idempotency via update_id, normalize-and-queue pipeline

## Task Commits

No git repository present — commits not possible. Files written directly.

1. **Task 1: TelegramAdapter + Normalizer** - (no commit, no git repo)
2. **Task 2: Gateway + Queue wiring** - (no commit, no git repo)

## Files Created/Modified
- `src/adapters/telegram.ts` - TelegramAdapter class with 4 methods + deprecated sendTelegramMessage export
- `src/normalizer/telegram.ts` - normalizeTelegramWebhook producing NormalizedMessage from Telegram Update object
- `src/queue/setup.ts` - Added telegramQueue (telegram-messages BullMQ queue)
- `src/routes/gateway.ts` - Replaced Telegram stub with full webhook handler (secret, idempotency, normalize, queue)

## Decisions Made
- Kept deprecated `sendTelegramMessage` function export for backward compatibility with existing callers
- Used lowercase `x-telegram-bot-api-secret-token` header key (Express auto-lowercases incoming headers)
- Type detection: photo->image, voice/audio->audio, document->file, location->location, else text
- Text extraction: message.text || message.caption (photos often have captions)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

- Set `TELEGRAM_BOT_TOKEN` environment variable (from @BotFather)
- Set `TELEGRAM_WEBHOOK_SECRET` environment variable (optional, for webhook validation)
- Register webhook URL via TelegramAdapter.setWebhook() with public URL

## Next Phase Readiness
- Telegram adapter ready for response router (P02) to send outbound messages
- Worker can consume from telegram-messages queue
- Pattern established for future platform adapters (Discord, Meta, etc.)

---
*Phase: 3-platform-expansion*
*Completed: 2026-05-19*
