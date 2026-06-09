---
title: External Integrations
last_mapped_commit: f683cc9578043d8141583bd2d2d84c7ebcaea9d4
last_updated: 2026-06-09
---

# External Integrations

## Databases
- **PostgreSQL 15** — Primary data store via Prisma ORM (`DATABASE_URL`)
- **Redis 7** — BullMQ job queues, rate limiting cache, session state (`REDIS_URL`)
- **Evolution API PostgreSQL** — Separate `evolution_db` schema for WhatsApp session data (shared PostgreSQL instance)

## APIs

### Messaging Platforms
| Platform | Adapter | Protocol | Endpoint |
|----------|---------|----------|----------|
| WhatsApp | `evolutionApi.ts` | HTTP REST | Evolution API v2.3 at `EVOLUTION_API_URL` |
| Telegram | `telegramAdapter.ts` | HTTP REST | Hydrogram MTProto API at `TELEGRAM_API_URL` |
| Discord | `discordAdapter.ts` | WebSocket (discord.js) | Discord Gateway (in-process) |
| Twitter | `twitterApi.ts` | HTTP REST | twikit Python service at `TWITTER_API_URL` |

### AI Providers
| Provider | Module | Notes |
|----------|--------|-------|
| OpenAI | `ai/providers/openai.ts` | Chat completions |
| Anthropic | `ai/providers/anthropic.ts` | Claude models |
| Google Gemini | `ai/providers/gemini.ts` | `@google/generative-ai` SDK |
| Groq | `ai/providers/groq.ts` | Fast inference |
| Mistral | `ai/providers/mistral.ts` | Mistral models |
| Cohere | `ai/providers/cohere.ts` | Command models |
| xAI | `ai/providers/xai.ts` | Grok models |
| Together | `ai/providers/together.ts` | Open-source models |
| Fireworks | `ai/providers/fireworks.ts` | Fast inference |
| AWS Bedrock | `ai/providers/bedrock.ts` | Managed AI |
| Ollama | `ai/providers/ollama.ts` | Local models |
| OpenRouter | `ai/providers/openrouter.ts` | Multi-provider gateway |
| Cerebras | `ai/providers/cerebras.ts` | Fast inference |
| DeepSeek | `ai/providers/deepseek.ts` | DeepSeek models |

### External Services
- **Sentry** (`@sentry/node`) — Error tracking and performance monitoring at `SENTRY_DSN`
- **Discord OAuth2** — Bot auto-creation flow via `discord.com/api/v10/oauth2/token`
- **my.telegram.org** — Credential scraping for Telegram API ID/hash via Obscura browser automation

## Authentication
- **Clerk** (`@clerk/express`, `@clerk/clerk-react`) — Primary auth provider
  - Backend: `CLERK_SECRET_KEY` for API calls, `CLERK_WEBHOOK_SECRET` for signature verification
  - Frontend: `VITE_CLERK_PUBLISHABLE_KEY` for React integration
  - Webhook at `/api/webhooks/clerk` — syncs `user.created`, `user.updated`, `user.deleted`
- **JWT** (`jsonwebtoken`) — Custom token generation for API keys and gateway auth
- **bcryptjs** — Password hashing for local auth fallback
- **Svix** — Webhook signature verification for Clerk webhooks

## Webhooks

### Inbound (Received)
| Source | Route | Handler | Purpose |
|--------|-------|---------|---------|
| Clerk | `/api/webhooks/clerk` | `webhooks.ts` | User lifecycle sync (create/update/delete) |
| Evolution API | `/gateway/whatsapp/:tenantId` | `gateway.ts` | WhatsApp inbound messages (MESSAGES_UPSERT, QRCODE_UPDATED, etc.) |
| Telegram | `/gateway/telegram/:tenantId` | `gateway.ts` | Telegram inbound messages via Hydrogram webhook |

### Outbound (Emitted)
| Target | Method | Purpose |
|--------|--------|---------|
| Evolution API | HTTP POST webhook config | Register webhook URL per WhatsApp instance |
| Telegram | HTTP POST webhook init | Register webhook URL per Telegram session |

### Real-time
- **Socket.IO** — Bidirectional events to frontend clients
  - `new_message` — New inbound message in conversation
  - `bot_status_change` — Bot connection status changes
  - `join_tenant` — Client joins tenant-specific room

## Message Queues
| Queue Name | Purpose | Backoff |
|------------|---------|---------|
| `whatsapp-messages` | Process inbound WhatsApp messages | Exponential, 60s, 5 attempts |
| `telegram-messages` | Process inbound Telegram messages | Exponential, 60s, 5 attempts |
| `discord-messages` | Process inbound Discord messages | Exponential, 60s, 5 attempts |
| `twitter-messages` | Process inbound Twitter DMs | Exponential, 60s, 5 attempts |
| `twitter-sync` | Periodic Twitter timeline/notification sync | Exponential, 30s, 3 attempts |

All queues backed by Redis via BullMQ with dead-letter handling and configurable retry policies.

## Monitoring
- **Prometheus** — Metrics scraping from `/metrics` endpoint (prom-client)
- **Grafana** — Dashboard visualization (port 3001)
- **Pino** — Structured JSON logging with debug server ring buffer
