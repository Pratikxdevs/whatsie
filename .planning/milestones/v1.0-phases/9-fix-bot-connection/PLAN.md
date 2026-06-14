# Phase 9: Fix Bot Connection Flow — Remove All Fake/Mock Behavior

## Goal
Remove every hardcoded timeout, fake QR image, and broken endpoint call from the bot connection flow. Every step must use real API calls with proper error handling so failures are visible, not swallowed.

## Root Causes Found

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | CRITICAL | `frontend/src/services/api.ts:95` | `getConnectionStatus` calls `/waha-status` — backend only has `/connection-status` |
| 2 | CRITICAL | `frontend/src/components/bots/AddBotModal.tsx:22-27` | `setTimeout(4s)` fakes "connected" — no API call, no real QR |
| 3 | MODERATE | `frontend/src/components/BotSetupModal.tsx:36-49` | Polls broken endpoint + checks `"WORKING"` instead of `"connected"` |
| 4 | MODERATE | `frontend/src/pages/BotsPage.tsx:118-129` | Post-start polling uses broken endpoint |
| 5 | MODERATE | `frontend/src/components/onboarding/OnboardingWizard.tsx:29-42` | Same broken endpoint + wrong status string |

## Tasks

### Task 1: Fix API endpoint path
**File:** `frontend/src/services/api.ts`
- Change `getConnectionStatus` from `/waha-status` to `/connection-status`
- Verify `startWorkspace` and `stopWorkspace` paths are correct (they are)

### Task 2: Fix AddBotModal — replace fake timeout with real connection flow
**File:** `frontend/src/components/bots/AddBotModal.tsx`
- Remove the `setTimeout(() => setConnectStatus('connected'), 4000)` (lines 22-27)
- The `onComplete` callback in BotsPage already creates the workspace. The connect step inside AddBotModal should NOT try to start the bot — that happens when user clicks "Start" on BotCard
- Change the connect step to show a success message saying "Bot created! Click Start to connect WhatsApp" instead of faking a QR scan
- Remove the static `<QrCode>` placeholder image
- Show clear next-step guidance instead of fake progress

### Task 3: Fix BotSetupModal — use real polling + correct status
**File:** `frontend/src/components/BotSetupModal.tsx`
- The polling at line 39 checks `res.sessionInfo?.status === 'WORKING'` — change to `'connected'`
- Add error logging: instead of `catch(e) {}`, log the error and show user-visible feedback
- If polling fails 3x consecutively, show an error state with retry button

### Task 4: Fix BotsPage post-start polling
**File:** `frontend/src/pages/BotsPage.tsx`
- The polling after `startWorkspace` (lines 118-129) already checks `statusRes.sessionInfo.status === 'connected'` — this is correct
- But it relies on `botApi.getConnectionStatus` which was broken (fixed in Task 1)
- Add error handling: if poll fails 3x, show error toast and stop polling
- Add a timeout: stop polling after 2 minutes max

### Task 5: Fix OnboardingWizard
**File:** `frontend/src/components/onboarding/OnboardingWizard.tsx`
- Change status check from `"WORKING"` to `"connected"` (lines 32, 56)
- Add error handling for failed polls

### Task 6: Verify end-to-end flow
- Create bot via AddBotModal → should see "Bot created" message, no fake QR
- Click Start on BotCard → should see real QR code from Evolution API
- Scan QR → should transition to "connected" via real polling
- If Evolution API is down → should show clear error, not hang forever

## Verification
- `curl -s http://localhost:3000/api/workspaces/:id/connection-status` returns real Evolution API status
- No `setTimeout` in any bot connection component
- No `WORKING` status string in frontend code
- No references to `/waha-status` in frontend
- AddBotModal shows guidance, not fake QR
- BotSetupModal shows error after 3 failed polls
