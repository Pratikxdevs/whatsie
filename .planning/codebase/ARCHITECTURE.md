# ARCHITECTURE.md — System Design
**Last mapped:** 2026-06-14

---

## Pattern

**Multi-tenant SaaS — Event-driven backend with REST/WebSocket frontend**

```
[WhatsApp User]
      │
      ▼
[Evolution API] ──webhook──▶ POST /gateway/whatsapp/:tenantId
                                   │
                              gateway.ts validates HMAC signature
                                   │
                              normalizer/whatsapp.ts → NormalizedMessage
                                   │
                              BullMQ Queue (Redis)
                                   │
                              workers/index.ts
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             SessionManager  IntentClassifier  RuleEngine
                    │              │              │
                    └──────────────┴──────────────┘
                                   │
                             WorkflowEngine
                                   │
                             AI Orchestrator (OpenRouter/Groq/OpenAI)
                                   │
                             ResponseRouter → WhatsAppAdapter
                                   │
                             Evolution API sendText
```

---

## Authentication Flow

```
Frontend request
      │
      ├─ Has X-API-KEY header? → HMAC-SHA256 verify against DB (peppered)
      │
      └─ Has Authorization: Bearer <Clerk JWT>?
              │
              ├─ getAuth(req).userId → verify with Clerk
              │
              └─ JIT sync: ensure User row exists in DB for tenantId
```

---

## Real-time (Socket.IO)

- Server-side: `io.to(tenantId).emit(event, data)` — tenant-isolated rooms
- Client-side: `socketManager.ts` singleton — connects once on auth
- Events: `new_message`, `bot_status_change`, `conversation_update`, `lead_update`
- Auth: Clerk JWT passed in `auth` handshake object, verified server-side

---

## Multi-tenancy

- Every DB model has `tenantId` field
- All routes extract `tenantId` from `req.user.tenantId` (set by auth middleware)
- `src/middleware/tenant.ts` exists but is **not used in index.ts** — routes rely on auth middleware alone
- No PostgreSQL RLS — isolation enforced at query level only

---

## Key Abstractions

| Layer | File | Purpose |
|-------|------|---------|
| Auth middleware | `src/middleware/auth.ts` | Clerk JWT + API key dual-strategy |
| Request validation | `src/middleware/validate.ts` | Zod schema validation |
| HTTP proxy | `src/middleware/httpProxy.ts` | Axios with circuit breaker + retry + cache |
| EvoAPI adapter | `src/adapters/evolutionApi.ts` | Full typed Evolution API client |
| WhatsApp adapter | `src/adapters/whatsapp.adapter.ts` | Outbound message sending |
| AI orchestrator | `src/ai/orchestrator.ts` | Multi-provider AI dispatch |
| Worker | `src/workers/index.ts` | BullMQ consumer, pipeline orchestration |
| CRM service | `src/crm/crmService.ts` | Lead/conversation DB operations |
| Response router | `src/router/index.ts` | Routes AI reply to correct platform adapter |

---

## Data Flow: Inbound Message

```
1. Evolution API → POST /gateway/whatsapp/:tenantId
2. HMAC-SHA256 signature validation (EVOLUTION_API_SECRET)
3. normalizeWhatsAppWebhook() → NormalizedMessage
4. bullmq.add('process-message', normalizedMessage)
5. worker picks up job:
   a. SessionManager.getOrCreate(conversationId)
   b. CrmService.findOrCreateLead(phone)
   c. IntentClassifier.classify(text)
   d. RuleEngine.evaluate(intent, rules)
   e. WorkflowEngine.execute(workflow)
   f. AI Orchestrator → LLM response
   g. ResponseRouter.route(platform) → WhatsAppAdapter.sendMessage()
   h. BillingUsage.record('messages_sent')
```

---

## ⚠️ Architecture Issues

1. **`src/middleware/tenant.ts` is dead** — imported nowhere in `src/index.ts`. Tenant enforcement relies entirely on auth middleware. Any route that skips `authenticateToken` has zero tenant isolation.

2. **`src/router/index.ts` (ResponseRouter) imports WhatsApp adapter** but also has references to `NormalizedMessage.platform` checks — still has the multi-platform branching logic even after platform removal.

3. **`src/normalizer/` contains `whatsapp.test.ts`** — test file living in non-test directory alongside production code.

4. **Debug server (`src/debug/server.ts`)** runs on a separate port (9222) with its own HTTP server — not integrated into Express middleware chain. Has raw `innerHTML` assignments with filtered user data (XSS risk if filter bypassed).

5. **`src/api/auth.ts`** implements a full register/login flow with bcrypt + JWT but **Clerk is the production auth**. This entire file is dead code in production.
