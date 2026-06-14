# External Integrations

_Last updated: 2026-06-14 (refreshed after auth stabilization + bot sync hardening)_

---

## Evolution API (WhatsApp Bridge)

**Purpose:** WhatsApp messaging platform — creates instances (bots), manages QR code pairing, sends/receives messages, handles webhooks.

**Version:** v2.3 (Postman collection coverage)

**Location:** `src/adapters/evolutionApi.ts` (624 lines — primary adapter)
Also: `src/routes/whatsapp.routes.ts` (legacy proxy, partial duplication — see Concerns)

**Auth Method:** `apikey` header sent with every request.
```
headers: { apikey: process.env.EVOLUTION_API_KEY }
```
Webhook security: `authorization: Bearer EVOLUTION_API_SECRET` sent in webhook payload headers.

**HTTP Client:** Custom proxied axios client (`createProxiedClient`) with:
- Base URL: `EVOLUTION_API_URL` (default: `http://localhost:8081`)
- Timeout: 15s
- Max retries: 2
- Cache TTL: 10s

**Endpoints Used:**

| Category         | Endpoint Pattern                           | Function                        |
|------------------|--------------------------------------------|---------------------------------|
| Instance         | POST `/instance/create`                    | `createInstance()`              |
| Instance         | GET `/instance/fetchInstances`             | `fetchInstances()`              |
| Instance         | GET `/instance/connect/:name`              | `connectInstance()` (QR)        |
| Instance         | POST `/instance/restart/:name`             | `restartInstance()`             |
| Instance         | GET `/instance/connectionState/:name`      | `getConnectionState()` ← startup sync |
| Instance         | DELETE `/instance/logout/:name`            | `logoutInstance()`              |
| Instance         | DELETE `/instance/delete/:name`            | `deleteInstance()`              |
| Messaging        | POST `/message/sendText/:name`             | `sendText()`                    |
| Messaging        | POST `/message/sendMedia/:name`            | `sendMedia()`                   |
| Messaging        | POST `/message/sendWhatsAppAudio/:name`    | `sendAudio()`                   |
| Messaging        | POST `/message/sendReaction/:name`         | `sendReaction()`                |
| Chat             | POST `/chat/findContacts/:name`            | `findContacts()`                |
| Chat             | POST `/chat/findMessages/:name`            | `findMessages()`                |
| Chat             | POST `/chat/findChats/:name`               | `findChats()`                   |
| Chat             | POST `/chat/markMessageAsRead/:name`       | `markMessagesRead()`            |
| Profile          | POST `/chat/fetchProfilePictureUrl/:name`  | `fetchProfilePicture()`         |
| Settings         | POST `/settings/set/:name`                 | `setSettings()`                 |
| Labels           | GET `/label/findLabels/:name`              | `findLabels()`                  |
| Groups           | POST `/group/create/:name`                 | `createGroup()`                 |

**DB Sync Pattern:** Key lifecycle operations auto-sync the `Bot` table:
- `createInstance()` → upserts Bot with `status: 'pending_qr'`
- `getConnectionState()` → updates Bot status `connected` / `disconnected`
- `logoutInstance()` → sets Bot status `disconnected`
- `deleteInstance()` → deletes Bot row

**Webhook Events Received (at `/gateway/whatsapp/:tenantId`):**
- `QRCODE_UPDATED` — QR code refreshed
- `MESSAGES_UPSERT` — New inbound message → normalized → queued to BullMQ
- `MESSAGES_UPDATE` — Message status update
- `CONNECTION_UPDATE` — Bot connected/disconnected → DB status sync

**Known Issues:**
- `src/routes/whatsapp.routes.ts` hardcodes instance name as `tenant_{tenantId}_bot`, conflicting with the actual naming convention `bot_{botIdNoDashes}` used by the primary adapter. This legacy route is largely superseded by the gateway + adapter pattern but still mounted.

---

## Clerk (Authentication)

**Purpose:** User identity, session management, multi-tenant onboarding.

**Backend SDK:** `@clerk/express` v2.1.19
**Frontend SDK:** `@clerk/clerk-react` v5.61.6

**Backend Integration:**
1. **Global middleware** (`index.ts`): `clerkMiddleware({ secretKey, publishableKey })` — populates `getAuth(req)` on every request.
2. **Auth middleware** (`src/middleware/auth.ts`): `authenticateToken` — verifies Clerk JWT via `getAuth(req).userId`.
3. **JIT Sync**: If a Clerk user authenticates but no DB `User` record exists (webhook missed), the auth middleware calls `clerkClient.users.getUser()` and creates the tenant+user in a transaction.
4. **Webhook handler** (`/api/webhooks/clerk` — `src/routes/webhooks.ts`): Handles `user.created`, `user.updated`, `user.deleted`. Verified using `svix` HMAC signature. Creates Tenant + User on `user.created`, updates Clerk public metadata with `tenantId`.

**Frontend Integration:**
- `ClerkProvider` wraps the entire app.
- `AuthContext.tsx` bridges Clerk state into app `User` interface — extracts `tenantId` from `clerkUser.publicMetadata`.
- `window.__clerkGetToken` exposed for the Axios interceptor to attach `Authorization: Bearer <token>` to every request.
- `window.__clerkLogout` exposed for the API interceptor to handle 401/403 responses gracefully.
- Routes `/login/*` and `/register/*` use Clerk's hosted `<SignIn>` / `<SignUp>` components.

**Socket.IO Auth:** `verifyToken(token, { secretKey })` from `@clerk/express` — validates Clerk JWT in the socket handshake. Falls back to API key auth.

**Config env vars required:** `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET` (for webhook handler), `VITE_CLERK_PUBLISHABLE_KEY` (frontend).

---

## OpenRouter (AI Engine)

**Purpose:** Multi-model LLM proxy — provides access to OpenAI, Llama, Mistral, and other models through one OpenAI-compatible API.

**SDK:** `openai` ^6.42.0 with `baseURL: 'https://openrouter.ai/api/v1'`

**Location:** `src/ai/orchestrator.ts`

**API Key Resolution (priority order):**
1. Bot config JSON (`bot.config.api_key`) — per-bot override
2. User credential from DB (`UserCredential` table, `provider: 'openrouter'`)
3. `OPENROUTER_API_KEY` environment variable — global fallback

**Client Caching:** `openRouterClients` Map keyed by API key — avoids re-instantiating on every call.

**Bot Config Caching:** `botCache` Map with 60s TTL — reduces DB calls per message.

**Default Model:** `meta-llama/llama-3-8b-instruct` (overridable via `DEFAULT_MODEL` env or bot config).

**Response Format:** JSON object mode (`response_format: { type: 'json_object' }`). AI returns structured output: `{ response, intent, isLead, sessionSummary }`.

**Billing Tracking:** After each completion, `recordAiUsage()` writes `promptTokens`, `completionTokens` to `AiLog` table.

---

## Redis

**Purpose:** BullMQ job persistence, session state storage, rate limiting store.

**Client:** `ioredis` ^5.10.1

**Connection:** `REDIS_URL` env var (default: `redis://localhost:6379`)

**Usage:**

| Use Case              | Implementation                              |
|-----------------------|---------------------------------------------|
| BullMQ job queue      | `whatsapp-messages` queue (5 concurrent workers) |
| Session state         | `SessionManager` — conversation context per user |
| Rate limiting         | `rate-limit-redis` store for HTTP rate limiter |
| DLQ monitoring        | `src/workers/dlq.ts` — dead letter queue handling |

---

## Sentry (Error Tracking)

**Purpose:** Production error reporting.

**SDK:** `@sentry/node` ^10.53.1

**Integration:** Optional — only initializes if `SENTRY_DSN` env var is set:
```ts
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
```
Error handler mounted after all routes via `Sentry.setupExpressErrorHandler(app)`.

---

## Prometheus (Metrics)

**Purpose:** Application performance metrics.

**SDK:** `prom-client` ^15.1.3

**Location:** `src/metrics/index.ts`

**Exposed at:** `GET /metrics` (no auth — direct Prometheus scraping)

**Tracked Metrics:**
- `http_request_duration_seconds` — request latency histogram
- `messages_received_total` — inbound messages by platform + tenantId
- `messages_sent_total` — outbound messages
- `errors_total` — error counts

---

## Integration Health Summary

| Integration   | Status  | Notes                                                             |
|---------------|---------|-------------------------------------------------------------------|
| Evolution API | ✅ Live | Full adapter coverage, DB sync, startup reconciliation            |
| Clerk Auth    | ✅ Live | JIT sync + webhook sync, both paths fully implemented             |
| OpenRouter    | ✅ Live | Per-bot/user/global key resolution, 60s bot config cache          |
| Redis/BullMQ  | ✅ Live | 5 concurrent workers, exponential backoff retry                   |
| Sentry        | ⚠️ Optional | Only active with SENTRY_DSN env var                          |
| Prometheus    | ✅ Live | Scraped at /metrics, no auth gate                                 |
| Legacy whatsapp.routes.ts | ⚠️ Stale | Hardcodes instance name — superseded by gateway + adapter |
