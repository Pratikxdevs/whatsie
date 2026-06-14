# Plan P07 Summary: Fix WhatsApp Connect Flow

## Status: COMPLETED

## Tasks Completed

### Task 1-3: Verification (read-only)
- **createInstance** (`src/adapters/evolutionApi.ts:149-201`): Sets `qrcode: true` by default, webhook events include `QRCODE_UPDATED` and `CONNECTION_UPDATE`, Bot created with `status: 'pending_qr'` when `tenantId` provided. ✅
- **connectInstance** (`src/adapters/evolutionApi.ts:212-217`): Calls `/instance/connect/{instanceName}`, returns QR code data. ✅
- **getConnectionState** (`src/adapters/evolutionApi.ts:232-251`): Reads `data?.instance?.state`, maps `open` → `connected`, `close` → `disconnected`. ✅
- **connection.update handler** (`src/routes/gateway.ts:100-136`): Extracts `connState`/`sessionName`, updates bot status in DB, emits `bot_status_change` Socket.IO event. ✅

### Task 4: Fix POST /api/workspaces
**File:** `src/routes/workspaces.ts`
- Changed bot creation status from `'starting'` to `'pending_qr'` (line 123)
- Updated session name prefix from `bot_` to `whatsapp_` (line 97)
- **Rationale:** Since `createInstance` is called with `qrcode: true`, the QR code is immediately available. Bot should reflect `pending_qr` from creation.

### Task 5: Fix AddBotModal QR code flow
**File:** `frontend/src/components/bots/AddBotModal.tsx`
- Added Socket.IO imports (`io as ioClient`, `Socket`, `getSocketUrl`)
- Added `useEffect` that creates a Socket.IO connection when a bot is being connected
- Joins `'default'` tenant room (matching BotsPage pattern)
- Listens for `bot_status_change` events for the specific bot ID
- On `connected` status: clears polling timers, updates status, calls `onComplete`
- **Rationale:** Provides real-time connection status updates instead of relying solely on 3-second polling.

### Task 6: Verify QRCodeModal (read-only)
- QR image rendering: `<img src={qrCode} alt="QR Code" className="w-48 h-48 object-contain" />` ✅
- Status flow: loading → pending_qr → scanned → connected ✅
- Auto-close on connected: `useEffect` with 3s delay ✅

### Task 7: Verification
- Backend TypeScript: 2 pre-existing errors in `leads.ts` (not in changed files)
- Frontend TypeScript: Compiles cleanly
- End-to-end flow traced: create → QR → scan → connected

## Files Modified
| File | Change |
|------|--------|
| `src/routes/workspaces.ts` | Status `starting` → `pending_qr`, session prefix `bot_` → `whatsapp_` |
| `frontend/src/components/bots/AddBotModal.tsx` | Added Socket.IO listener for `bot_status_change` |

## Commits
1. `a162fdd` — fix: set bot status to pending_qr on creation, use whatsapp_ prefix for session names
2. `05b2060` — feat: add Socket.IO listener in AddBotModal for real-time bot_status_change events

## End-to-End Flow
1. User fills config → clicks Next
2. `POST /api/workspaces` creates Evolution API instance (qrcode: true) + Bot (status: pending_qr)
3. Frontend calls `POST /:id/start` → `connectInstance` returns QR code
4. QR displayed in modal, polling starts (3s interval) + Socket.IO listener active
5. User scans QR with WhatsApp → `connection.update` webhook fires
6. Gateway updates bot to `connected` + emits `bot_status_change` via Socket.IO
7. Frontend receives event → shows connected → auto-closes modal
