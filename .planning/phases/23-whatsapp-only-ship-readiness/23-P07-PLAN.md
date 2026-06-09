---
plan_id: P07
phase: 23
objective: Fix WhatsApp connect flow (QR code generation, scanning, connection state management)
wave: 3
depends_on: [P05, P06]
files_modified:
  - src/routes/workspaces.ts
  - src/routes/gateway.ts
  - src/adapters/evolutionApi.ts
  - frontend/src/components/bots/AddBotModal.tsx
  - frontend/src/components/bots/QRCodeModal.tsx
requirements: [P05, P06]
autonomous: true
---

# Plan P07: Fix WhatsApp Connect Flow

## Tasks

### Task 1: Verify Evolution API createInstance flow
**read_first:**
- `src/adapters/evolutionApi.ts` lines 148-201 (createInstance)

**acceptance_criteria:**
- `createInstance` creates Evolution API instance with QR code enabled
- `createInstance` upserts Bot record with `status: 'pending_qr'`
- Webhook URL is correctly set for `QRCODE_UPDATED` and `CONNECTION_UPDATE` events

**action:**
- Verify `createInstance` in `src/adapters/evolutionApi.ts`:
  - `qrcode: true` is set by default
  - Webhook events include `QRCODE_UPDATED` and `CONNECTION_UPDATE`
  - Bot record is created with `status: 'pending_qr'`
  - If any issues found, fix them

### Task 2: Verify connectInstance returns QR code
**read_first:**
- `src/adapters/evolutionApi.ts` lines 211-217 (connectInstance)

**acceptance_criteria:**
- `connectInstance` calls `/instance/connect/{instanceName}` endpoint
- Returns QR code data that frontend can display

**action:**
- Verify `connectInstance` function calls the correct Evolution API endpoint
- The response should contain QR code data (base64 image or URL)
- If QR code is not returned, check if `createInstance` with `qrcode: true` is sufficient

### Task 3: Verify connection status polling works
**read_first:**
- `src/adapters/evolutionApi.ts` lines 232-251 (getConnectionState)
- `src/routes/gateway.ts` lines 100-137 (connection.update handler)

**acceptance_criteria:**
- `getConnectionState` correctly reads `data.instance.state` from Evolution API
- Maps `open` → `connected`, `close` → `disconnected`
- `connection.update` webhook handler updates Bot status in DB
- `connection.update` emits `bot_status_change` Socket.IO event to frontend

**action:**
- Verify `getConnectionState` correctly reads state from `data.instance?.state`
- Verify the `connection.update` handler in `gateway.ts`:
  - Extracts `connState` from `rawPayload.data?.state || rawPayload.state`
  - Extracts `sessionName` from `rawPayload.instance`
  - Maps states correctly: `open` → `connected`, `close` → `disconnected`, `connecting` → `starting`
  - Updates bot status in DB
  - Emits `bot_status_change` event with `botId` and `status`

### Task 4: Fix POST /api/workspaces to only create WhatsApp bots
**read_first:**
- `src/routes/workspaces.ts` lines 155-171 (POST / handler start)

**acceptance_criteria:**
- POST `/api/workspaces` always creates WhatsApp bots
- No platform selection logic (platform is always `'whatsapp'`)
- Creates Evolution API instance and returns QR code data

**action:**
- In `src/routes/workspaces.ts` POST `/` handler:
  - After P01/P02/P03, the platform-specific blocks should be gone
  - Ensure the default path creates a WhatsApp bot using `EvoApi.createInstance`
  - The flow should be:
    1. Extract `name`, `system_prompt`, `ai_engine`, `api_key`, `temperature`, `max_tokens` from body
    2. Set `platform = 'whatsapp'`
    3. Generate unique `sessionName`: `whatsapp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    4. Call `EvoApi.createInstance({ instanceName: sessionName, qrcode: true, tenantId, webhookUrl })`
    5. Create Bot record in DB with `status: 'pending_qr'`
    6. Return workspace data with bot ID for QR polling

### Task 5: Fix frontend AddBotModal QR code flow
**read_first:**
- `frontend/src/components/bots/AddBotModal.tsx` (after P05 simplification)

**acceptance_criteria:**
- After config step, POST to `/api/workspaces` with WhatsApp bot data
- After creation, poll for QR code using bot's sessionName
- Display QR code in QRCodeModal
- Listen for `bot_status_change` Socket.IO event for connection confirmation

**action:**
- In `frontend/src/components/bots/AddBotModal.tsx` connect step:
  - After config step, POST to `/api/workspaces` with `{ name, system_prompt, ai_engine, api_key, temperature, max_tokens, platform: 'whatsapp' }`
  - Response should include bot ID and sessionName
  - Start polling `/api/workspaces` or `/api/whatsapp/instance/connect/{sessionName}` for QR code
  - Display QR code in QRCodeModal
  - Listen for `bot_status_change` Socket.IO event
  - When status changes to `connected`, show success and close modal

### Task 6: Fix frontend QRCodeModal QR display
**read_first:**
- `frontend/src/components/bots/QRCodeModal.tsx` (after P05 simplification)

**acceptance_criteria:**
- QR code image is displayed when `status === 'pending_qr'` and `qrCode` is available
- Status indicators work: loading → pending_qr → scanned → connected
- Auto-close on connected status

**action:**
- In `frontend/src/components/bots/QRCodeModal.tsx`:
  - Ensure QR code image rendering works: `<img src={qrCode} alt="QR Code" className="w-48 h-48 object-contain" />`
  - Verify status flow: loading → pending_qr → scanned → connected
  - Auto-close on connected (already implemented)

### Task 7: Verify end-to-end connect flow
**acceptance_criteria:**
- POST `/api/workspaces` creates Evolution API instance
- QR code is returned and displayed in frontend
- User scans QR with WhatsApp
- `connection.update` webhook updates Bot status to `connected`
- Frontend receives `bot_status_change` event
- Bot appears as connected in the UI

**action:**
- Manual verification steps:
  1. Start backend server
  2. POST to `/api/workspaces` with WhatsApp bot config
  3. Verify Evolution API instance is created
  4. Verify QR code is returned
  5. Scan QR with WhatsApp
  6. Verify bot status changes to `connected`
  7. Verify frontend shows connected status

## Verification

**must_haves:**
- [ ] `createInstance` correctly creates Evolution API instance with QR
- [ ] `connectInstance` returns QR code data
- [ ] `getConnectionState` correctly maps states
- [ ] `connection.update` webhook updates Bot status
- [ ] POST `/api/workspaces` creates WhatsApp bot and returns QR
- [ ] Frontend polls for QR and displays it
- [ ] Frontend listens for `bot_status_change` event
- [ ] End-to-end: create → QR → scan → connected works
