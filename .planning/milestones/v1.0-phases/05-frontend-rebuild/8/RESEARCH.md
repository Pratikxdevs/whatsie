# Phase 8 Research: Frontend-to-Backend Wiring

## Infrastructure State
- All services running: Frontend (5173), Backend (3000), Postgres (7777), Redis (6379), Evolution API (8081)
- Vite proxy is LIVE (`VITE_USE_MOCK` not set)
- Prisma client generated
- BillingUsage schema drift: `createdAt` column missing in DB but referenced by Prisma

## Backend API Surface (all query real Prisma DB)

| Route | Endpoints | DB? |
|---|---|---|
| `/api/workspaces` | GET (list), POST (create), PUT (update), DELETE, GET /:id/waha-status | Yes |
| `/api/leads` | GET (list+filter+search), GET /:id (detail+conversations), PATCH /:id | Yes |
| `/api/conversations` | GET (list), GET /:id/messages, POST /:id/messages | Yes (but POST only creates DB record, doesn't send) |
| `/api/analytics` | GET message-volume (raw SQL), GET conversion-funnel (groupBy), GET dashboard-stats | Yes |
| `/api/billing` | GET usage, GET usage/history, GET ai-logs | Yes |
| `/api/auth` | POST register, login, refresh, logout | Yes |
| `/api/whatsapp` | POST create, GET connectionState, DELETE logout | No (Evolution API proxy) |
| `/bot` | 18 endpoints | No (Evolution API proxy) |
| `/gateway` | POST whatsapp/:tenantId, POST telegram/:tenantId | Yes (tenant auth) + Redis (idempotency) |

## Evolution API Flow
1. `POST /api/workspaces` → creates Bot in DB → calls `EvoApi.createInstance()` → webhook URL set to `/gateway/whatsapp/{tenantId}`
2. `GET /api/workspaces/:id/waha-status` → calls `EvoApi.getConnectionState()` → if not connected, calls `EvoApi.connectInstance()` for QR code
3. WhatsApp webhook → `/gateway/whatsapp/:tenantId` → HMAC verify → Redis idempotency → BullMQ queue
4. Worker pipeline: quota → session → CRM upsert (lead+conversation+message) → event log → context push → workflow → intent → rules → AI → `ResponseRouter.dispatch()` → `WhatsAppAdapter.sendMessage()` → `EvoApi.sendText()`

## Frontend Page-to-API Mapping

| Page | Current Source | Has API Function? | Action |
|---|---|---|---|
| Dashboard | Inline hardcoded | Yes (3 functions) | Wire to API |
| Bots | Uses api.ts | Yes (5 functions) | Fix start/stop |
| Leads | mockData.ts | Yes (3 functions) | Wire to API |
| Conversations | Inline mock | Yes (3 functions) | Wire to API |
| Analytics | mockData.ts | Yes (2 functions) | Wire to API |
| Billing | mockData.ts | Yes (2 functions) | Wire to API |
| Campaigns | Inline mock | No | Out of scope |
| Contacts | Inline mock | No | Out of scope |
| Reports | Inline mock | No | Out of scope |
| Settings | Inline mock | No | Out of scope |
| Team | Inline mock | No | Out of scope |
| Integrations | Inline mock | No | Out of scope |
| Workflows | Inline mock | No | Out of scope |

## Critical Gap: Send Message
`POST /api/conversations/:id/messages` in `src/routes/conversations.ts` only creates a DB record. It does NOT dispatch via Evolution API. Need to add: look up conversation's bot session name and external user ID → call `WhatsAppAdapter.sendMessage()` → update message status.

## Socket.IO
- Server broadcasts `qrcode.updated` and `connection.update` to tenant rooms
- DLQ monitor broadcasts `dlq.alert` globally
- New inbound messages are NOT broadcast — need to add this for real-time conversation updates
