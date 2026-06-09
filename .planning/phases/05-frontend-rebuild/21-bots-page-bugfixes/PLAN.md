# Phase 21: /bots Page Bug Fixes

## Goal
Fix all 33 bugs from the comprehensive bug report. No temporary fixes — every fix addresses the root cause.

## Scope
Frontend-only fixes across 10 files. No backend changes, no new features, no platform integration work.

## Files to Modify
1. `frontend/src/components/bots/BotConnectionStatus.tsx` — crash fix
2. `frontend/src/components/bots/BotCard.tsx` — null safety
3. `frontend/src/components/ui/PhoneInput.tsx` — blink/reversion fix
4. `frontend/src/components/bots/BotConfigForm.tsx` — model selector, API key, max tokens, cancel reset
5. `frontend/src/components/bots/AddBotModal.tsx` — validation, UX, state management
6. `frontend/src/components/ProviderAuth.tsx` — dropdown outside click
7. `frontend/src/components/bots/BotGrid.tsx` — empty state text
8. `frontend/src/pages/BotsPage.tsx` — status mapping, polling, bulk delete, stale closure
9. `frontend/src/components/bots/BotDetailPanel.tsx` — restart in error state
10. `frontend/src/components/bots/QRCodeModal.tsx` — auto-close delay
11. `frontend/src/components/bots/PlatformSelector.tsx` — grid layout

---

## Wave 1: Crash Fixes (3 bugs)

### 1.1 BotConnectionStatus — scanned status crash (#16)
**File:** `BotConnectionStatus.tsx:3-9`
**Bug:** `STATUS_CONFIG` has no entry for `'scanned'`. If bot reaches scanned state, `config.dot` throws.
**Fix:** Add `scanned` entry to `STATUS_CONFIG`:
```ts
scanned: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400', label: 'Scanned' },
```

### 1.2 mapWorkspaceToBot — scanned status mapping (#17)
**File:** `BotsPage.tsx:28`
**Bug:** Unknown statuses default to `'disconnected'`, hiding real backend state.
**Fix:** Add `scanned` to the mapping chain:
```ts
status: ws.status === 'connected' ? 'connected'
  : ws.status === 'pending_qr' ? 'pending_qr'
  : ws.status === 'starting' ? 'starting'
  : ws.status === 'scanned' ? 'scanned'
  : ws.status === 'error' ? 'error'
  : 'disconnected',
```

### 1.3 BotCard — null platformCfg/engineCfg crash (#18)
**File:** `BotCard.tsx:18-19`
**Bug:** Unknown `platform` or `aiEngine` from DB causes `undefined.label` crash.
**Fix:** Add fallback:
```ts
const platformCfg = PLATFORM_CONFIG[bot.platform] || { label: bot.platform, color: '#71717a', icon: 'HelpCircle', supported: false };
const engineCfg = AI_ENGINE_CONFIG[bot.aiEngine] || { label: bot.aiEngine, color: '#71717a' };
```

---

## Wave 2: PhoneInput Overhaul (3 bugs)

### 2.1 Remove sync effect — fix country reversion (#1, #2)
**File:** `PhoneInput.tsx:113-130`
**Bug:** `useEffect` syncs `displayValue` from `value` prop on every re-render. When parent re-renders (typing in another field), the effect re-fires, re-detects country from the E.164 value, reverts to US, and reformats the number.
**Fix:** Remove the sync effect entirely. The component should:
- Initialize `displayValue` from `value` on mount only (already done via `useState`)
- Let user typing control `displayValue` via `handleInput`
- Let country selection control reformatting via `handleSelectCountry`
- Remove the `useEffect` at lines 113-130 completely

The `value` prop is the source of truth for the E.164 output. The `displayValue` is what the user sees. These should only sync on initial mount.

### 2.2 OTP input strips non-digits (#33)
**File:** `AddBotModal.tsx:759`
**Bug:** `onChange={e => setOtpCode(e.target.value.trim())}` — Telegram OTP can be alphanumeric (case-sensitive word).
**Fix:** Remove `.trim()` from the OTP onChange handler. Keep the trim only on the submit check:
```ts
onChange={e => setOtpCode(e.target.value)}
```

---

## Wave 3: Core Form Fixes (5 bugs)

### 3.1 Model selector no-op (#8)
**File:** `BotConfigForm.tsx:101-103`
**Bug:** `onModelChange={m => { }}` — empty callback. Model change never saves.
**Fix:** Wire up model change to form state. Add `model` to the form state and save it:
```ts
// In updateForm, add model handling
// In onSave, include model in the data
// Wire onModelChange to updateForm({ model: m })
```
Need to also add `model` to the form state, `initialRef`, and the save payload.

### 3.2 API key cleared after save — show status instead (#9)
**File:** `BotConfigForm.tsx:52-55`
**Bug:** After save, `apiKey` is wiped to `''`. User must re-enter every time.
**Fix:** After save, clear the key from form but show a persistent "Key saved" indicator:
```ts
// After successful save:
if (form.apiKey) {
  setForm(f => ({ ...f, apiKey: '' }));
  initialRef.current.apiKey = '';
  setKeySaved(true);  // new state
}
```
Add a `keySaved` boolean state. Show "API key saved" badge near the key field when `keySaved && !form.apiKey`. Reset `keySaved` when user starts typing a new key.

### 3.3 Max tokens can't be set to 0 (#11)
**File:** `BotConfigForm.tsx:128`
**Bug:** `parseInt('0') || 1024` — `0` is falsy, reverts to 1024.
**Fix:** Use nullish coalescing instead of `||`:
```ts
onChange={e => {
  const val = parseInt(e.target.value);
  updateForm({ maxTokens: isNaN(val) ? 1024 : val });
}}
```

### 3.4 canNext validation (#10)
**File:** `AddBotModal.tsx:100-105`
**Bug:** For Telegram phone + Discord OAuth, canNext short-circuits the API key check, allowing bot creation without AI key.
**Fix:** Always require `apiKey.trim().length > 0 || aiEngine === 'ollama'` regardless of platform auth method. The current logic is:
```ts
(apiKey.trim().length > 0 || aiEngine === 'ollama') && (
  platform === 'twitter' ? ... :
  (platform === 'telegram' && tgAuthType === 'phone') || (platform === 'discord' && dcAuthType === 'oauth') || botToken.trim().length > 0
)
```
The API key check is already there — the issue is that the `||` conditions for phone/oauth bypass the `botToken` check, but they don't bypass the API key check. Actually re-reading the code, the API key IS checked. The bug report might be wrong about this one. Let me verify... The condition is:
```ts
name.trim().length > 0 && (apiKey.trim().length > 0 || aiEngine === 'ollama') && (
  platform === 'twitter' ? (...) :
  (platform === 'telegram' && tgAuthType === 'phone') || (platform === 'discord' && dcAuthType === 'oauth') || botToken.trim().length > 0
)
```
The API key check is AND'd with the platform check. So API key IS required for all platforms. The bug report is incorrect about this — the API key is not skipped. But the UX issue is that there's no feedback when canNext is false (#3).

### 3.5 fill() breaks React controlled inputs (#4)
**File:** All controlled inputs in `AddBotModal.tsx`
**Bug:** Playwright `fill()` and browser autofill bypass React's synthetic `onChange`, leaving state empty.
**Fix:** This is a fundamental React issue. The proper fix is to add `onInput` handlers alongside `onChange` for critical fields. `onInput` fires for both programmatic and user input:
```tsx
onChange={e => setName(e.target.value)}
onInput={e => setName((e.target as HTMLInputElement).value)}
```
Apply to: name, botToken, phone, otpCode, password2fa, twitterUsername, twitterEmail, twitterPassword, twitterTotpSecret, scrapeOtp, systemPrompt, apiKey.

---

## Wave 4: Input Validation (4 bugs)

### 4.1 No maxLength on bot name (#12)
**File:** `AddBotModal.tsx:438`
**Fix:** Add `maxLength={100}` to the name input.

### 4.2 No min/max on Max Tokens (#13)
**File:** `AddBotModal.tsx:720-725`, `BotConfigForm.tsx:125-130`
**Fix:** Add `min={1} max={128000}` to both Max Tokens inputs.

### 4.3 Twitter password no show/hide toggle (#15)
**File:** `AddBotModal.tsx:669-674`
**Fix:** Add show/hide toggle like the API key field uses. Add state `showTwitterPassword` and toggle button.

### 4.4 OTP input — already fixed in Wave 2 (#33)
Already addressed in 2.2.

---

## Wave 5: UX Fixes (8 bugs)

### 5.1 Next button silently fails (#3)
**File:** `AddBotModal.tsx:100-105`
**Bug:** No feedback when `canNext` is false. User clicks Next, nothing happens.
**Fix:** Add validation error messages. When user clicks Next and `canNext` is false, show specific error messages:
- "Bot name is required" if name is empty
- "API key is required" if apiKey is empty (and not ollama)
- "Bot token is required" if platform needs token and it's empty
- "Twitter credentials are required" for twitter

Add `showValidation` state that becomes `true` on attempted Next click. Show red error text below each invalid field.

### 5.2 Send Verification Code does nothing (#5)
**File:** `AddBotModal.tsx:109`
**Bug:** When phone state is empty, `handleSendCode` silently returns.
**Fix:** Already handled by #5.1 validation — the phone field will show "Phone number is required" when user tries to proceed. But also add inline validation to the Send Code button:
```tsx
onClick={() => {
  if (!phone.trim()) {
    setError('Please enter your phone number first');
    return;
  }
  handleSendCode();
}}
```

### 5.3 Scraper skips loading state (#7)
**File:** `AddBotModal.tsx:191-203`
**Bug:** `handleScrapeStart` sets `scrapeStep('started')` but the `started` state renders a spinner that's barely visible before jumping to `awaiting_otp`.
**Fix:** The `started` state already shows "Opening my.telegram.org..." with a spinner (lines 523-528). The issue is that the API call completes too fast. This is actually working correctly — the loading state IS shown, it's just fast. No code change needed, but add a minimum display time of 500ms for the loading state so users see it:
```ts
const handleScrapeStart = async () => {
  if (!phone.trim()) return;
  setScrapeStep('started');
  setError(null);
  const startTime = Date.now();
  try {
    const result = await telegramApi.scrapeCredentialsStart(phone.trim());
    const elapsed = Date.now() - startTime;
    if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));
    setScrapeSessionKey(result.session_key);
    setScrapeStep('awaiting_otp');
  } catch (err: any) {
    // ...
  }
};
```

### 5.4 Empty state text mismatch (#25)
**File:** `BotGrid.tsx:20`
**Bug:** Says "Click 'Add New Bot'" but button says "Add Bot".
**Fix:** Change to `Click "Add Bot" to get started`.

### 5.5 ProviderAuth dropdown outside click (#27)
**File:** `ProviderAuth.tsx:164`
**Bug:** Dropdown stays open until button re-clicked.
**Fix:** Add a click-outside listener using a ref on the dropdown container:
```ts
const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!showProviderDropdown) return;
  const handler = (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setShowProviderDropdown(false);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [showProviderDropdown]);
```
Wrap the dropdown container in a `ref={dropdownRef}` div.

### 5.6 Action buttons invisible on mobile (#28)
**File:** `BotCard.tsx:76`
**Bug:** `opacity-0 group-hover:opacity-100` — no hover on touch devices.
**Fix:** Change to always show on mobile, hide on desktop hover:
```tsx
className="flex items-center justify-end gap-1 px-3 py-2 bg-zinc-950/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
```

### 5.7 Cancel doesn't reset form state (#29)
**File:** `BotConfigForm.tsx:153`
**Bug:** Cancel just switches tabs, doesn't reset form.
**Fix:** Reset form to initial values on cancel:
```tsx
<button onClick={() => {
  setForm({ ...initialRef.current });
  setIsDirty(false);
  setSaveStatus('idle');
  onCancel();
}}>Cancel</button>
```

### 5.8 Temperature slider missing labels (#30)
**File:** `AddBotModal.tsx:711-716`
**Bug:** No labels showing what 0 vs 2 means.
**Fix:** Add labels like BotConfigForm has:
```tsx
<div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
  <span>Precise</span>
  <span>Creative</span>
</div>
```

---

## Wave 6: State Management (5 bugs)

### 6.1 Cancel kills ALL bot polling (#20)
**File:** `BotsPage.tsx:135-136`
**Bug:** `intervalsRef.current.forEach(clearInterval)` clears ALL bots' polling.
**Fix:** Track intervals per bot. Change `intervalsRef` from `number[]` to `Map<string, number[]>`:
```ts
const intervalsRef = useRef<Map<string, number[]>>(new Map());

// When adding interval for a bot:
const botIntervals = intervalsRef.current.get(botId) || [];
botIntervals.push(pollInterval);
intervalsRef.current.set(botId, botIntervals);

// When cancelling a bot:
const botIntervals = intervalsRef.current.get(id) || [];
botIntervals.forEach(id => clearInterval(id));
intervalsRef.current.delete(id);
```

### 6.2 Stale closure in restart handler (#21)
**File:** `BotsPage.tsx:434`
**Bug:** `const bot = bots.find(b => b.id === id)` captures old `bots` reference.
**Fix:** Use functional state access or pass bot data through the handler. The simplest fix: use a ref for bots:
```ts
const botsRef = useRef(bots);
useEffect(() => { botsRef.current = bots; }, [bots]);

// In restart handler:
const bot = botsRef.current.find(b => b.id === id);
```

### 6.3 Bulk delete no rollback (#22)
**File:** `BotsPage.tsx:381-394`
**Bug:** Deletes optimistically, no rollback on partial failure.
**Fix:** Collect failed IDs and restore them:
```ts
onDeleteAll={async () => {
  if (!confirm(`Delete ${selected.size} bots? This cannot be undone.`)) return;
  const selectedIds = Array.from(selected);
  const snapshot = bots.filter(b => selected.has(b.id));
  setBots(prev => prev.filter(b => !selected.has(b.id)));
  setSelected(new Set());
  const failedIds: string[] = [];
  for (const id of selectedIds) {
    try {
      await botApi.deleteWorkspace(id);
    } catch {
      failedIds.push(id);
    }
  }
  if (failedIds.length > 0) {
    const failedBots = snapshot.filter(b => failedIds.includes(b.id));
    setBots(prev => [...prev, ...failedBots].sort((a, b) => a.name.localeCompare(b.name)));
  }
}}
```

### 6.4 Modal close doesn't abort API calls (#23)
**File:** `AddBotModal.tsx:334`
**Bug:** `resetAndClose()` doesn't abort in-flight API calls.
**Fix:** Add an `AbortController` ref. Pass its signal to API calls. Abort on close:
```ts
const abortRef = useRef<AbortController | null>(null);

// In handleNext, before API calls:
abortRef.current = new AbortController();

// In resetAndClose:
abortRef.current?.abort();
```
Note: The API service may not support AbortController signals. If not, use a `cancelled` ref instead:
```ts
const cancelledRef = useRef(false);

// In resetAndClose:
cancelledRef.current = true;

// After each await, check:
if (cancelledRef.current) return;
```

### 6.5 QR modal auto-closes too fast (#24)
**File:** `QRCodeModal.tsx:17-23`
**Bug:** Auto-closes after 1.8s. User barely sees success.
**Fix:** Increase to 3s and add a "Done" button so user can dismiss manually:
```ts
const timer = setTimeout(() => {
  onConnected?.();
  onClose();
}, 3000);
```

---

## Wave 7: Detail Panel Fixes (2 bugs)

### 7.1 Restart disabled in error state (#32)
**File:** `BotDetailPanel.tsx:101`
**Bug:** `disabled={bot.status !== 'connected'}` — can't restart error bots.
**Fix:** Enable restart for error state:
```tsx
disabled={bot.status !== 'connected' && bot.status !== 'error'}
```

### 7.2 Start button — also enable for error state
**File:** `BotDetailPanel.tsx:85`
**Bug:** Start is disabled when `connected || starting || pending_qr`, but should be enabled for `error` state (to retry).
**Fix:** The current logic already allows start for error state (it's disabled only for starting/connected/pending_qr). This is correct. The issue is that restart is disabled for error — fixed in 7.1.

---

## Wave 8: Inconsistencies (3 bugs)

### 8.1 AddBotModal field order (#31)
**File:** `AddBotModal.tsx` config step
**Bug:** Different field order than BotConfigForm.
**Fix:** Reorder AddBotModal to match BotConfigForm: Name → System Prompt → AI Provider → API Key → Model → Temperature → Max Tokens. (Currently: Name → AI Provider → API Key → Model → System Prompt → Temperature → Max Tokens)

### 8.2 No form validation feedback (#26)
**File:** `AddBotModal.tsx`
**Bug:** Only disabled button, no error messages.
**Fix:** Already addressed in Wave 5.1 — add `showValidation` state and error messages below fields.

### 8.3 PLATFORM_CONFIG shows all 7 platforms (#35)
**File:** `PlatformSelector.tsx`
**Bug:** Only 3 are functional but all 7 are shown (4 disabled with "Soon" badge).
**Fix:** This is intentional design — showing upcoming platforms with "Soon" badges is standard UX. No change needed. The "Soon" badge already clearly marks unsupported ones.

---

## Execution Order

1. **Wave 1** — Crash fixes (3 changes, 3 files)
2. **Wave 2** — PhoneInput (2 changes, 2 files)
3. **Wave 3** — Core form fixes (4 changes, 2 files)
4. **Wave 4** — Input validation (3 changes, 2 files)
5. **Wave 5** — UX fixes (8 changes, 5 files)
6. **Wave 6** — State management (5 changes, 2 files)
7. **Wave 7** — Detail panel (1 change, 1 file)
8. **Wave 8** — Inconsistencies (1 change, 1 file)

## Bug-to-Wave Mapping

| Bug # | Wave | Status |
|-------|------|--------|
| 1 | Wave 2 | PhoneInput country reversion |
| 2 | Wave 2 | Phone reformatted |
| 3 | Wave 5 | Next button no feedback |
| 4 | Wave 3 | fill() breaks React |
| 5 | Wave 5 | Send Code does nothing |
| 6 | — | Info only, no fix needed |
| 7 | Wave 5 | Scraper loading state |
| 8 | Wave 3 | Model selector no-op |
| 9 | Wave 3 | API key cleared |
| 10 | Wave 3 | canNext validation (verify) |
| 11 | Wave 3 | Max tokens 0 |
| 12 | Wave 4 | No maxLength |
| 13 | Wave 4 | No min/max tokens |
| 14 | Wave 2 | OTP strips spaces |
| 15 | Wave 4 | Twitter password toggle |
| 16 | Wave 1 | scanned crash |
| 17 | Wave 1 | scanned mapping |
| 18 | Wave 1 | null config crash |
| 19 | — | Needs backend API, skip |
| 20 | Wave 6 | Cancel kills all polling |
| 21 | Wave 6 | Stale closure |
| 22 | Wave 6 | Bulk delete rollback |
| 23 | Wave 6 | Modal abort |
| 24 | Wave 6 | QR auto-close |
| 25 | Wave 5 | Empty state text |
| 26 | Wave 5 | Validation feedback |
| 27 | Wave 5 | Dropdown outside click |
| 28 | Wave 5 | Mobile buttons |
| 29 | Wave 5 | Cancel reset |
| 30 | Wave 5 | Temp labels |
| 31 | Wave 8 | Field order |
| 32 | Wave 7 | Restart in error |
| 33 | Wave 2 | OTP alphanumeric |

## Bugs Not Fixed (require backend or are non-issues)
- **#6** — Info only, backend works fine
- **#19** — activeLeads/messagesToday hardcoded to 0 — needs a backend API endpoint to return per-bot analytics. Cannot fix frontend-only.
- **#35** — PLATFORM_CONFIG shows all 7 — intentional design with "Soon" badges. Not a bug.

## Success Criteria
- [ ] No runtime crashes for any BotStatus value
- [ ] PhoneInput preserves selected country across re-renders
- [ ] Model selector saves selected model
- [ ] API key shows "saved" status after save
- [ ] All inputs have proper validation with user-visible error messages
- [ ] Mobile action buttons are always visible
- [ ] Cancel resets form state
- [ ] Polling is per-bot, not global
- [ ] Bulk delete rolls back on failure
- [ ] Restart works in error state
