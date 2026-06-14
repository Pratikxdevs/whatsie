# Phase 17: Twitter/X Platform Integration

**Goal:** Wire a standalone Twitter/X platform layer into the CRM using `twikit` (Python) — fully isolated from other platforms, integrated into shared infrastructure. Python FastAPI service container with HTTP bridge to Node.js CRM.

**Mode:** default

---

## Context

**Why now:** WhatsApp and Telegram are fully wired. Discord integration is in progress (Phase 16). Twitter/X is the next platform in ARCHITECTURE.txt. The frontend already has `'twitter'` in the Platform union type.

**Library choice:** `twikit` (https://github.com/d60/twikit) — Python async library, 4.4k GitHub stars, MIT license. Hits Twitter's internal GraphQL + v1.1 REST endpoints (no official API key needed). Key advantages over `rettiwt-api`:
- **DM sending supported** (rettiwt-api could only read DMs)
- **Built-in rate limit handling** with auto-unlock
- **Username+email+password auth** with TOTP 2FA support
- **Session persistence** via cookie JSON files
- **Streaming** for DM events and engagement metrics
- **Larger community** (4.4k stars vs 834)

**Architecture pattern:** Same as Hydrogram/Telegram — separate Python FastAPI container running `twikit`, exposing HTTP API to the Node.js CRM backend. The CRM communicates via HTTP requests to the Python service, which handles all Twitter API interactions.

**Library deviation from ARCHITECTURE.txt:** Lines 108-111 specify `twitter-api-v2` (official v2 API wrapper). We use `twikit` instead because: (1) username+password auth avoids paid API tier costs, (2) provides full tweet/DM/user/media operations including DM sending, (3) built-in rate limit handling, (4) mature Python library with 4.4k GitHub stars. The tradeoff: requires a separate Python service container (like Telegram), and relies on internal Twitter endpoints that can change.

**Key differences from other platforms:**
- **Python service container** — runs as separate Docker container (like Hydrogram/Telegram), NOT in-process
- **Username+password auth** — not a bot token or cookie API_KEY. User provides Twitter credentials.
- **DM sending supported** — unlike rettiwt-api, twikit can send DMs, react to DMs, manage DM groups
- **Built-in rate limits** — twikit handles rate limiting internally; CRM still enforces its own limits
- **Session persistence** — cookies saved to JSON file in container volume
- **Streaming** — DM events via WebSocket-like async iteration (engagement metrics stream available too)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              platforms/twitter-api/ (Python FastAPI)              │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐│
│  │  FastAPI     │  │  Twikit     │  │  Session Manager         ││
│  │  Routes      │  │  Client     │  │  (cookie persistence)    ││
│  │  (HTTP API)  │  │             │  │                          ││
│  └──────┬───────┘  └──────┬──────┘  └────────────┬─────────────┘│
│         │                 │                       │             │
│  ┌──────┴───────┐  ┌──────┴──────┐  ┌────────────┴─────────────┐│
│  │  Webhook     │  │  Rate Limit │  │  Streaming               ││
│  │  Push to CRM │  │  (built-in) │  │  (DM events)             ││
│  └──────────────┘  └─────────────┘  └──────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
         │ HTTP                    ▲ HTTP
         ▼                         │
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js CRM Backend                           │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐│
│  │  Twitter     │  │  Twitter    │  │  Twitter Workers         ││
│  │  Adapter     │  │  Normalizer │  │  (BullMQ)                ││
│  │  (HTTP→py)   │  │             │  │                          ││
│  └──────┬───────┘  └──────┬──────┘  └────────────┬─────────────┘│
│         │                 │                       │             │
│  ┌──────┴───────┐  ┌──────┴──────┐  ┌────────────┴─────────────┐│
│  │  Rate        │  │  BullMQ     │  │  Redis Sync State        ││
│  │  Limiter     │  │  Queues     │  │  (cursors, timestamps)   ││
│  └──────────────┘  └─────────────┘  └──────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
         │                    │                       │
         ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Shared Infrastructure (existing)                    │
│  Prisma/PostgreSQL · Redis · SessionManager · CRM Service       │
│  ResponseRouter · IntentClassifier · RuleEngine · AI Orchestrator│
│  BillingUsage · Metrics · Socket.IO · Debug Server (9222)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plans

### Wave 1: Python Service + Core Adapter

#### Plan P01 — Create Twitter Python Service (FastAPI + twikit)

**Files to create:**
- `platforms/twitter-api/requirements.txt` — Python dependencies
- `platforms/twitter-api/Dockerfile` — Docker container definition
- `platforms/twitter-api/main.py` — FastAPI application entry point
- `platforms/twitter-api/client.py` — Twikit client wrapper (session management, auth)
- `platforms/twitter-api/routes/` — HTTP API route modules
- `platforms/twitter-api/routes/__init__.py`
- `platforms/twitter-api/routes/auth.py` — Authentication endpoints
- `platforms/twitter-api/routes/tweets.py` — Tweet CRUD endpoints
- `platforms/twitter-api/routes/dms.py` — DM endpoints
- `platforms/twitter-api/routes/users.py` — User/profile endpoints
- `platforms/twitter-api/routes/sync.py` — Sync/polling endpoints
- `platforms/twitter-api/routes/health.py` — Health check endpoint
- `platforms/twitter-api/models.py` — Pydantic request/response models
- `platforms/twitter-api/session_store.py` — Cookie persistence to disk

**What to do:**

1. **Create `platforms/twitter-api/requirements.txt`:**
   ```
   twikit>=2.3.1
   fastapi>=0.115.0
   uvicorn[standard]>=0.34.0
   pydantic>=2.0
   httpx>=0.27.0
   python-multipart>=0.0.9
   ```

2. **Create `platforms/twitter-api/Dockerfile`:**
   ```dockerfile
   FROM python:3.12-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   VOLUME ["/app/sessions"]
   EXPOSE 8083
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8083"]
   ```

3. **Create `platforms/twitter-api/client.py`** — TwikitClient wrapper class:
   - `__init__()` — initialize twikit.Client()
   - `async login(username, email, password, totp_secret?)` — authenticate, save cookies
   - `async restore_session(session_name)` — load cookies from file
   - `async save_session(session_name)` — persist cookies to `/app/sessions/{session_name}.json`
   - `async get_session_status()` — verify session is valid
   - Expose all twikit operations as async methods:
     - `create_tweet(text, media?, reply_to?, quote_tweet?)` → `client.create_tweet()`
     - `delete_tweet(tweet_id)` → `client.delete_tweet()`
     - `retweet(tweet_id)` / `unretweet(tweet_id)`
     - `like(tweet_id)` / `unlike(tweet_id)`
     - `send_dm(user_id, text, media?)` → `client.send_dm()`
     - `get_dm_history(user_id)` → `client.get_dm_history()`
     - `delete_dm(message_id)` → `client.delete_dm()`
     - `get_dm_inbox()` → `client.get_inbox()`
     - `search_tweets(query)` → `client.search_tweet()`
     - `get_user_by_username(username)` → `client.get_user_by_screen_name()`
     - `get_user_tweets(user_id)` → `client.get_user_tweets()`
     - `get_timeline()` → `client.get_timeline()`
     - `get_latest_timeline()` → `client.get_latest_timeline()`
     - `get_mentions()` → `client.get_notifications(type='_mentions')`
     - `get_notifications()` → `client.get_notifications()`
     - `get_followers(user_id)` / `get_following(user_id)`
     - `follow_user(user_id)` / `unfollow_user(user_id)`
     - `upload_media(file_path)` → `client.upload_media()`
     - `get_scheduled_tweets()` / `create_scheduled_tweet()` / `delete_scheduled_tweet()`

4. **Create `platforms/twitter-api/routes/auth.py`:**
   - `POST /auth/login` — authenticate with username+email+password, save cookies, return session name
   - `POST /auth/restore` — restore session from saved cookies
   - `GET /auth/status/{session_name}` — check if session is valid
   - `POST /auth/logout` — clear session

5. **Create `platforms/twitter-api/routes/tweets.py`:**
   - `POST /tweets` — create tweet (text, media, reply, quote)
   - `DELETE /tweets/{tweet_id}` — delete tweet
   - `POST /tweets/{tweet_id}/retweet` / `DELETE /tweets/{tweet_id}/retweet`
   - `POST /tweets/{tweet_id}/like` / `DELETE /tweets/{tweet_id}/like`
   - `GET /tweets/search?q={query}` — search tweets
   - `GET /tweets/{tweet_id}` — get tweet details
   - `POST /tweets/media/upload` — upload media (multipart form)

6. **Create `platforms/twitter-api/routes/dms.py`:**
   - `GET /dm/inbox` — get DM inbox
   - `GET /dm/conversation/{user_id}` — get DM conversation history
   - `POST /dm/send` — send DM (user_id, text, media?)
   - `DELETE /dm/{message_id}` — delete DM
   - `POST /dm/{message_id}/react` — add reaction
   - `DELETE /dm/{message_id}/react` — remove reaction

7. **Create `platforms/twitter-api/routes/users.py`:**
   - `GET /users/{username}` — get user by username
   - `GET /users/{user_id}/followers` / `GET /users/{user_id}/following`
   - `POST /users/{user_id}/follow` / `DELETE /users/{user_id}/follow`
   - `GET /users/{user_id}/tweets` — get user's tweets

8. **Create `platforms/twitter-api/routes/sync.py`:**
   - `GET /sync/dms?since_id={id}` — poll new DMs since last ID
   - `GET /sync/timeline?since_id={id}` — poll timeline since last ID
   - `GET /sync/notifications?since_id={id}` — poll notifications since last ID
   - `GET /sync/mentions?since_id={id}` — poll mentions since last ID

9. **Create `platforms/twitter-api/routes/health.py`:**
   - `GET /health` — return service status, twikit session validity, uptime

10. **Create `platforms/twitter-api/models.py`** — Pydantic models for all request/response types

11. **Create `platforms/twitter-api/session_store.py`:**
    - `save_cookies(session_name, cookies)` — write to `/app/sessions/{session_name}.json`
    - `load_cookies(session_name)` — read from file
    - `delete_session(session_name)` — remove file
    - `list_sessions()` — list all saved sessions

12. **Create `platforms/twitter-api/main.py`:**
    - FastAPI app with all route modules mounted
    - CORS middleware for local development
    - Startup: load all saved sessions
    - Mount routes: `/auth`, `/tweets`, `/dm`, `/users`, `/sync`, `/health`

**Critical rules:**
- Session cookies MUST be persisted to `/app/sessions/` volume (survives container restarts)
- Never re-login if cookies are valid — Twitter monitors login frequency
- All endpoints return JSON with consistent error format
- Input validation via Pydantic models
- Structured logging with session_name context
- Graceful error handling — never expose raw twikit exceptions to HTTP responses

**Verify:** `docker build -t twitter-api ./platforms/twitter-api` succeeds. Container starts on port 8083. `GET /health` returns 200.

---

#### Plan P02 — Node.js Twitter Adapter (HTTP Client to Python Service)

**Files to create:**
- `src/adapters/twitterApi.ts` — raw HTTP client to the Python Twitter service
- `src/adapters/twitter.adapter.ts` — thin rate-limited wrapper for BullMQ workers

**What to do:**

1. **Create `src/adapters/twitterApi.ts`** — HTTP client wrapping the Python service:
   - `TWITTER_API_URL` from env var (default: `http://localhost:8083`)
   - `login(username, email, password, totp_secret?)` → `POST /auth/login`
   - `restoreSession(sessionName)` → `POST /auth/restore`
   - `getSessionStatus(sessionName)` → `GET /auth/status/{sessionName}`
   - `postTweet(sessionName, text, media?, replyTo?)` → `POST /tweets`
   - `deleteTweet(sessionName, tweetId)` → `DELETE /tweets/{tweetId}`
   - `retweet(sessionName, tweetId)` / `unretweet(sessionName, tweetId)`
   - `like(sessionName, tweetId)` / `unlike(sessionName, tweetId)`
   - `sendDm(sessionName, userId, text)` → `POST /dm/send`
   - `getDmInbox(sessionName)` → `GET /dm/inbox`
   - `getDmConversation(sessionName, userId)` → `GET /dm/conversation/{userId}`
   - `searchTweets(sessionName, query)` → `GET /tweets/search`
   - `getUserByUsername(sessionName, username)` → `GET /users/{username}`
   - `getUserTweets(sessionName, userId)` → `GET /users/{user_id}/tweets`
   - `getTimeline(sessionName)` → `GET /sync/timeline`
   - `getMentions(sessionName)` → `GET /sync/mentions`
   - `getNotifications(sessionName)` → `GET /sync/notifications`
   - `getFollowers(sessionName, userId)` / `getFollowing(sessionName, userId)`
   - `uploadMedia(sessionName, filePath)` → `POST /tweets/media/upload`
   - `healthCheck()` → `GET /health`
   - All methods: wrap HTTP calls with error handling, parse responses, throw on failure
   - Axios instance with 30s timeout, retry on 5xx

2. **Create `src/adapters/twitter.adapter.ts`** — thin rate-limited wrapper:
   - `TwitterAdapter` class wrapping `twitterApi.ts`
   - `sendMessage(sessionName, userId, text)` — rate-limited DM send
   - `sendTweetReply(sessionName, tweetId, text)` — rate-limited tweet reply
   - `postTweet(sessionName, text)` — rate-limited tweet post
   - Uses `sendWithRateLimit('twitter', ...)` from rate limiter
   - Same pattern as `telegram.adapter.ts` and `whatsapp.adapter.ts`

**Critical rules:**
- Adapter is STATELESS — all session state lives in the Python service
- Errors bubble up to the gateway/worker layer
- Retry logic handled by BullMQ, not the adapter
- HTTP timeout: 30s for most operations, 60s for media upload

**Verify:** `npx tsc --noEmit` passes. `TwitterAdapter` importable. `healthCheck()` returns valid response.

---

#### Plan P03 — Twitter Normalizer

**Files to create:**
- `src/normalizer/twitter.ts` — inbound DM/tweet/notification → NormalizedMessage

**What to do:**

1. Create `normalizeTwitterDm(tenantId, rawDm)` function:
   - Extract: sender ID, text, media attachments, timestamp
   - Map to `NormalizedMessage` with `platform: 'twitter'`
   - `type`: text, image, video, audio, file based on DM content
   - `metadata.raw`: preserve full response from Python service
   - `metadata.conversationType`: `'dm'`
   - `userId`: sender's Twitter user ID (string)
   - `conversationId`: DM conversation ID

2. Create `normalizeTwitterTweet(tenantId, rawTweet)` function:
   - For mention/reply notifications → NormalizedMessage
   - Extract: tweeter ID, text, media, reply-to info
   - `metadata.mentionOf`: if tweet mentions the bot account
   - `metadata.replyTo`: parent tweet ID if reply
   - `metadata.tweetId`: the tweet ID for outbound reply targeting
   - `metadata.conversationType`: `'tweet'`

3. Create `normalizeTwitterNotification(tenantId, rawNotification)` function:
   - For follow, like, retweet notifications → event metadata
   - `type`: 'text' with notification details in text field
   - `metadata.notificationType`: 'follow' | 'like' | 'retweet' | 'mention'

**Critical rules:**
- `metadata.raw` must always preserve the full response
- `userId` must be the Twitter user ID (numeric string), NOT the screen name
- Handle missing/null fields gracefully
- Support all media types (images, videos, GIFs)
- `metadata.conversationType` is critical — used by ResponseRouter to determine outbound dispatch strategy

**Verify:** `npx tsc --noEmit` passes. Unit test with mock payloads produces correct NormalizedMessage.

---

#### Plan P04 — Twitter Queue + Rate Limiter + Error Codes

**Files to modify:**
- `src/queue/setup.ts` — add `twitterMessagesQueue` and `twitterSyncQueue`
- `src/rateLimiter/index.ts` — add Twitter rate limiters
- `src/errors/codes.ts` — add `TW_*` error codes

**What to do:**

1. Add `twitterMessagesQueue` to queue setup:
   ```ts
   export const twitterMessagesQueue = new Queue('twitter-messages', {
     connection: redisConnection,
     defaultJobOptions: {
       attempts: 5,
       backoff: { type: 'exponential', delay: 60000 },
       removeOnComplete: { age: 24 * 3600 },
       removeOnFail: { age: 7 * 24 * 3600 }
     }
   });
   ```

2. Add `twitterSyncQueue` for periodic sync jobs:
   ```ts
   export const twitterSyncQueue = new Queue('twitter-sync', {
     connection: redisConnection,
     defaultJobOptions: {
       attempts: 3,
       backoff: { type: 'exponential', delay: 30000 }
     }
   });
   ```

3. Add Twitter rate limiters to `src/rateLimiter/index.ts`:
   ```ts
   // Twitter rate limits (CRM-level, in addition to twikit's built-in limits)
   // DMs: 187 per 15min (twikit limit) → CRM enforces ~50/day safe default
   // Tweets: 300 per 3hrs (Twitter limit)
   export const twitterDmLimiter = new RedisRateLimiter('twitterDm', 1728000); // ~50 DMs/day
   export const twitterTweetLimiter = new RedisRateLimiter('twitterTweet', 36000); // ~300 tweets/3hrs
   ```

4. Add error codes to `src/errors/codes.ts`:
   ```ts
   TW_001: 'TW_001', // Invalid credentials (login failed)
   TW_002: 'TW_002', // Rate limit exceeded
   TW_003: 'TW_003', // Send DM failed
   TW_004: 'TW_004', // Post tweet failed
   TW_005: 'TW_005', // Media upload failed
   TW_006: 'TW_006', // Session expired — needs re-auth
   TW_007: 'TW_007', // Account suspended/locked
   TW_008: 'TW_008', // Sync failed
   TW_009: 'TW_009', // Twitter API service unavailable
   TW_010: 'TW_010', // CAPTCHA required
   ```

5. Update `sendWithRateLimit` to accept Twitter platform keys:
   ```ts
   twitterDm: twitterDmLimiter,
   twitterTweet: twitterTweetLimiter,
   ```

**Verify:** `npx tsc --noEmit` passes. Queues importable. Error codes exist in registry.

---

### Wave 2: Workers + Sync System

#### Plan P05 — Twitter Message Worker

**Files to create:**
- `src/workers/twitterWorker.ts` — isolated Twitter message worker

**Files to modify:**
- `src/workers/index.ts` — import and register `twitterWorker`

**What to do:**

1. Create `src/workers/twitterWorker.ts` with the same 13-step pipeline as WhatsApp/Telegram:
   - **Consumer-side idempotency check** — before processing, check Redis `idempotency:twitter:msg:{messageId}`. If exists, skip. Set key with 24h TTL after processing.
   - Session Manager load (workflow state)
   - CRM write (processInboundMessageDbUpdates)
   - Billing usage recording
   - Event logging
   - Socket.IO emit (`new_message`)
   - Context window push
   - Workflow engine check
   - Intent classification
   - Workflow trigger
   - Rule engine
   - AI fallback
   - **Conditional ResponseRouter dispatch** — for DM conversations, dispatch via `TwitterAdapter.sendMessage()`. For tweet/mention conversations, dispatch via `TwitterAdapter.sendTweetReply()`. Both are supported (unlike rettiwt-api).
   - Billing usage (outbound)

2. Export `twitterWorker` consuming from `'twitter-messages'` queue, concurrency 5

3. Import `twitterWorker` in `src/workers/index.ts` alongside existing workers

4. Add `'failed'` event listener for permanent failure logging

**Critical rules:**
- Worker is completely isolated — no references to WhatsApp/Telegram workers
- Same pipeline logic as other workers (reuse shared functions)
- Error handling: catch → log → throw (BullMQ retry)
- DM sending IS supported — unlike rettiwt-api, dispatch outbound for DM conversations

**Verify:** `npx tsc --noEmit` passes. Worker importable from `src/workers/index.ts`.

---

#### Plan P06 — Twitter Sync Workers (Polling)

**Files to create:**
- `src/workers/twitterSync.ts` — periodic DM/timeline/notification sync

**What to do:**

1. Create `twitterSyncWorker` consuming from `'twitter-sync'` queue

2. Three sync job types:
   - `sync-dms`: Call Python service `GET /sync/dms?since_id={lastId}`, normalize new DMs, enqueue to `twitter-messages`
   - `sync-timeline`: Call `GET /sync/timeline?since_id={lastId}`, normalize mentions/replies, enqueue
   - `sync-notifications`: Call `GET /sync/notifications?since_id={lastId}`, normalize, enqueue

3. Sync state stored in Redis:
   - Key: `twitter:sync:{tenantId}:{accountId}:dms:lastId`
   - Key: `twitter:sync:{tenantId}:{accountId}:timeline:lastId`
   - Key: `twitter:sync:{tenantId}:{accountId}:notifs:lastId`

4. Job scheduling (via repeatable jobs):
   - DM sync: every 30 seconds per account
   - Timeline sync: every 60 seconds per account
   - Notification sync: every 120 seconds per account

5. Deduplication:
   - Before enqueuing to `twitter-messages`, check Redis idempotency: `idempotency:twitter:{msgId}`
   - Same pattern as WhatsApp/Telegram webhook idempotency

6. Reconnect/recovery:
   - On session expiry (HTTP 401 from Python service), mark bot as `disconnected` in DB, emit Socket.IO `bot_status_change`
   - On Python service unavailable (HTTP 503/connection refused), retry with backoff
   - On account suspension, mark bot as `error` with descriptive config

**Critical rules:**
- Sync workers are COMPLETELY isolated from message workers
- Each account's sync runs independently (one failing doesn't block others)
- Sync intervals are configurable per-account via bot config
- Handle cursor-based pagination correctly
- Python service handles rate limits internally — CRM just needs to handle HTTP errors

**Verify:** `npx tsc --noEmit` passes. Sync worker creates jobs on `twitter-sync` queue. Idempotency keys set correctly.

---

#### Plan P07 — Twitter ResponseRouter Integration

**Files to modify:**
- `src/router/index.ts` — add `'twitter'` case to ResponseRouter.dispatch()

**What to do:**

1. Add `case 'twitter':` to the switch in `ResponseRouter.dispatch()`:
   ```ts
   case 'twitter': {
     const twitterBot = await prisma.bot.findFirst({
       where: { tenantId: msg.tenantId, platform: 'twitter', status: 'connected' },
     });
     if (!twitterBot?.sessionName) {
       throw new Error(`No connected Twitter bot found for tenant ${msg.tenantId}`);
     }
     // DM conversations → send DM via twikit (supported!)
     // Tweet/mention conversations → reply to tweet
     const conversationType = (msg.metadata as any).conversationType;
     if (conversationType === 'dm') {
       await TwitterAdapter.sendMessage(twitterBot.sessionName, msg.userId, responseText);
     } else {
       const replyToId = (msg.metadata as any).replyTo || (msg.metadata as any).tweetId;
       if (replyToId) {
         await TwitterAdapter.sendTweetReply(twitterBot.sessionName, replyToId, responseText);
       } else {
         await TwitterAdapter.postTweet(twitterBot.sessionName, responseText);
       }
     }
     messagesSentTotal.inc({ platform: 'twitter', tenantId: msg.tenantId });
     break;
   }
   ```

2. Both DM and tweet reply dispatch are supported — unlike the rettiwt-api plan

**Verify:** `npx tsc --noEmit` passes. ResponseRouter handles `'twitter'` platform correctly.

---

### Wave 3: API Routes + Lifecycle

#### Plan P08 — Twitter Workspace Routes

**Files to modify:**
- `src/routes/workspaces.ts` — add Twitter platform branching to all CRUD operations

**What to do:**

1. Update `POST /api/workspaces` — Twitter bot creation:
   ```ts
   if (botPlatform === 'twitter') {
     if (!username || !email || !password) {
       return res.status(400).json({ error: 'username, email, and password are required for Twitter' });
     }
     
     // Login via Python service
     const loginResult = await TwitterApi.login(username, email, password, totp_secret);
     if (!loginResult.success) {
       return res.status(402).json({ error: 'Twitter login failed', details: loginResult.error });
     }
     
     const sessionName = `twitter_${loginResult.userId}`;
     const bot = await prisma.bot.create({
       data: {
         tenantId, userId: validUserId || undefined,
         displayName: name || `@${loginResult.screenName}`,
         platform: 'twitter', status: 'connected',
         sessionName,
         config: {
           system_prompt: system_prompt || null,
           ai_engine: ai_engine || null, api_key: api_key || null,
           temperature: temperature ?? 0.7, max_tokens: max_tokens ?? 1024,
           twitter_user_id: loginResult.userId,
           screen_name: loginResult.screenName,
           // NEVER store raw password — only session cookies in Python service
         }
       }
     });
     return res.status(201).json({ workspace: mapBotToWorkspace(bot) });
   }
   ```

2. Update `POST /api/workspaces/:id/start` — Twitter start:
   - Restore session via Python service (`POST /auth/restore`)
   - Validate session is still valid (`GET /auth/status/{sessionName}`)
   - Update bot status to `connected`
   - Start sync scheduling (add recurring sync jobs to `twitterSyncQueue`)
   - Emit `bot_status_change` via Socket.IO

3. Update `POST /api/workspaces/:id/stop` — Twitter stop:
   - Remove sync jobs from `twitterSyncQueue`
   - Update bot status to `disconnected`
   - Emit `bot_status_change` via Socket.IO

4. Update `DELETE /api/workspaces/:id` — Twitter delete:
   - Remove sync jobs
   - Delete session from Python service
   - Delete bot record

5. Update `GET /api/workspaces/:id/connection-status` — Twitter status:
   - Call Python service `GET /auth/status/{sessionName}`
   - Update DB status based on result

6. Update `GET /api/workspaces` (list) — Twitter status sync:
   - Add Twitter branch to the `botsWithSession` sync block

7. Update `PUT /api/workspaces/:id` — Twitter config update:
   - Allow updating system_prompt, ai_engine, temperature, max_tokens
   - Do NOT allow updating credentials via this endpoint (separate auth flow)

**Critical rules:**
- All Twitter branches are completely isolated from WhatsApp/Telegram branches
- Use `bot.platform === 'twitter'` to route
- Never store raw Twitter credentials in PostgreSQL — only in Python service session files
- Never share code paths between platforms

**Verify:** `npx tsc --noEmit` passes. `POST /api/workspaces` with `platform: 'twitter'` creates a bot. `POST /api/workspaces/:id/start` starts sync jobs.

---

#### Plan P09 — Twitter Sync Lifecycle Management

**Files to create:**
- `src/services/twitterSyncManager.ts` — manages sync job scheduling per account

**What to do:**

1. Create `TwitterSyncManager` class:
   - `startSync(tenantId, accountId, sessionName)` — add recurring sync jobs to `twitterSyncQueue`
   - `stopSync(tenantId, accountId)` — remove all sync jobs for this account
   - `updateSyncInterval(tenantId, accountId, interval)` — change polling frequency
   - `getSyncStatus(tenantId, accountId)` — return last sync timestamps and next scheduled

2. Each sync job is a BullMQ repeatable job:
   ```ts
   await twitterSyncQueue.add('sync-dms', { tenantId, accountId, sessionName }, {
     repeat: { every: 30000 },
     jobId: `twitter-sync-dms-${tenantId}-${accountId}`,
   });
   ```

3. On server startup:
   - Query all Twitter bots with `status: 'connected'`
   - Call `startSync()` for each
   - This handles reconnect/recovery after server restart

4. On bot disconnect/delete:
   - Call `stopSync()` to remove repeatable jobs

5. Store sync state in Redis for persistence across worker restarts

**Verify:** `npx tsc --noEmit` passes. `TwitterSyncManager.startSync()` creates repeatable jobs. `stopSync()` removes them.

---

#### Plan P10 — Startup Status Sync + Docker Compose + Health

**Files to modify:**
- `src/index.ts` — add Twitter bot status reconciliation on startup
- `docker-compose.yml` — add `twitter-api` service
- `src/debug/server.ts` — add Twitter health check

**What to do:**

1. In the startup bot status reconciliation IIFE, add Twitter branch:
   ```ts
   if (bot.platform === 'twitter') {
     try {
       const status = await TwitterApi.getSessionStatus(bot.sessionName!);
       const newStatus = status.connected ? 'connected' : 'disconnected';
       if (newStatus !== bot.status) {
         await prisma.bot.updateMany({ where: { id: bot.id }, data: { status: newStatus } });
       }
       if (status.connected) {
         TwitterSyncManager.startSync(bot.tenantId, bot.id, bot.sessionName!);
       }
     } catch { /* keep DB status — Python service may be down */ }
   }
   ```

2. Add `twitter-api` service to `docker-compose.yml`:
   ```yaml
   twitter-api:
     build: ./platforms/twitter-api
     container_name: twitter-api
     ports:
       - "8083:8083"
     volumes:
       - twitter_sessions:/app/sessions
     environment:
       - TWITTER_API_TOKEN=${TWITTER_API_TOKEN:-changeme}
     restart: unless-stopped
     healthcheck:
       test: ["CMD", "curl", "-f", "http://localhost:8083/health"]
       interval: 30s
       timeout: 10s
       retries: 3
   ```

3. Add Twitter health check to debug server:
   ```ts
   // In GET /api/health
   twitter: await TwitterApi.healthCheck()
   ```

4. Add `TWITTER_API_URL` to environment validation in `src/index.ts`

5. Per ARCHITECTURE.txt Layer 4, `POST /gateway/twitter` is listed — since Twitter uses polling sync workers instead of webhooks, this endpoint is intentionally omitted. Sync workers (P06) replace webhook delivery.

**Verify:** `docker compose up twitter-api` starts the container. `GET http://localhost:8083/health` returns 200. `npx tsc --noEmit` passes.

---

### Wave 4: Frontend Integration

#### Plan P11 — Frontend Twitter Support

**Files to modify:**
- `frontend/src/components/bots/types.ts` — set `twitter.supported = true`
- `frontend/src/components/bots/AddBotModal.tsx` — add Twitter credential inputs
- `frontend/src/components/bots/BotCard.tsx` — platform-aware status for Twitter
- `frontend/src/components/bots/BotDetailPanel.tsx` — Twitter-specific config display
- `frontend/src/components/conversations/PlatformBadge.tsx` — Twitter icon/color
- `frontend/src/pages/BotsPage.tsx` — Twitter start/stop handling
- `frontend/src/services/api.ts` — Twitter-specific API calls

**What to do:**

1. Update `PLATFORM_CONFIG`:
   ```ts
   twitter: { label: 'Twitter/X', color: '#000000', icon: 'AtSign', supported: true }
   ```

2. Update `AddBotModal`:
   - Show `username`, `email`, `password` inputs when Twitter is selected
   - Optional `totp_secret` input for 2FA accounts
   - Show instructions: "Enter your Twitter/X account credentials. Session cookies are saved securely."
   - No QR code flow — direct login on submit
   - Validate credentials on submit before creating bot
   - Store credentials securely (password never stored in DB — only session cookies in Python service)

3. Update `BotCard`:
   - Twitter bots show `connected`/`disconnected` status (no QR states)
   - Status text: "Connected as @screenName" or "Session expired — reconnect"
   - No "Scan QR" button — show "Reconnect" if disconnected

4. Update `BotDetailPanel`:
   - Show Twitter-specific fields: `screen_name`, `twitter_user_id`
   - Sync status: last DM sync, last timeline sync timestamps
   - No password display (credentials stored in Python service only)

5. Update `PlatformBadge`:
   - Twitter: `#000000` background, `AtSign` icon

6. Update API service:
   - `twitterApi` object with methods:
     - `login(username, email, password, totpSecret?)` → `POST /api/workspaces` with `platform: 'twitter'`
     - `getSyncStatus(botId)` → `GET /api/workspaces/:id/connection-status`

**Verify:** Frontend builds: `cd frontend && npm run build`. PLATFORM_CONFIG shows `twitter.supported = true`. AddBotModal shows Twitter credential form.

---

#### Plan P12 — Twitter Sync Status UI

**Files to create:**
- `frontend/src/components/bots/TwitterSyncStatus.tsx` — sync status component

**Files to modify:**
- `frontend/src/components/bots/BotDetailPanel.tsx` — integrate sync status

**What to do:**

1. Create `TwitterSyncStatus` component:
   - Shows: DM sync status, timeline sync status, notification sync status
   - Each shows: last synced time, next sync time, items synced count
   - Shows rate limit status: remaining quota, reset time
   - "Sync Now" button for manual trigger

2. Add to BotDetailPanel for Twitter bots only

3. Socket.IO listeners for real-time sync updates:
   - `twitter_sync_complete` event → update last sync time
   - `twitter_sync_error` event → show error state
   - `twitter_rate_limited` event → show rate limit warning

**Verify:** Frontend builds: `cd frontend && npm run build`. TwitterSyncStatus component renders for Twitter bots.

---

### Wave 5: Metrics + Observability + Polish

#### Plan P13 — Twitter Metrics + Debug Server + DLQ

**Files to modify:**
- `src/metrics/index.ts` — add Twitter-specific metrics
- `src/debug/server.ts` — add Twitter health check
- `src/workers/dlq.ts` — add Twitter DLQ monitor

**What to do:**

1. Add Prometheus metrics:
   - `twitter_sync_total` (Counter) — labels: `tenantId`, `sync_type` (dm/timeline/notif)
   - `twitter_sync_duration_seconds` (Histogram) — sync operation latency
   - `twitter_sync_errors_total` (Counter) — sync failures
   - `twitter_api_calls_total` (Counter) — calls to Python service
   - `twitter_rate_limit_hits_total` (Counter) — rate limit events

2. Add Twitter health check to debug server `GET /api/health`

3. Add DLQ monitor for `twitter-messages` and `twitter-sync` queues

4. Add Twitter queue depth to Grafana dashboard

**Verify:** `npx tsc --noEmit` passes. `GET /metrics` includes `twitter_*` metrics. Debug server shows Twitter health.

---

#### Plan P14 — Twitter Scheduled Posting (OPTIONAL/STRETCH)

**Files to create:**
- `src/services/twitterScheduler.ts` — scheduled tweet posting

**What to do:**

1. Create `TwitterScheduler` service:
   - `schedulePost(tenantId, accountId, tweetText, scheduledAt, media?)` — add delayed job to queue
   - `cancelPost(tenantId, jobId)` — remove scheduled job
   - `getScheduledPosts(tenantId, accountId)` — list pending scheduled posts

2. Implementation via BullMQ delayed jobs:
   ```ts
   await twitterMessagesQueue.add('scheduled-post', { tenantId, accountId, text, media }, {
     delay: scheduledAt.getTime() - Date.now(),
     jobId: `twitter-scheduled-${tenantId}-${Date.now()}`,
   });
   ```

3. Worker handles `scheduled-post` job type:
   - Call `TwitterAdapter.postTweet()`
   - Record in DB as outbound message
   - Emit Socket.IO event for UI update

**Verify:** `npx tsc --noEmit` passes. `TwitterScheduler.schedulePost()` enqueues a delayed job.

---

#### Plan P15 — E2E Verification + Test Suite

**Files to create:**
- `src/normalizer/twitter.test.ts` — unit tests for Twitter normalizer
- `src/workers/twitterWorker.test.ts` — unit tests for Twitter worker

**What to do:**

1. Create `src/normalizer/twitter.test.ts`:
   - Test `normalizeTwitterDm()` with mock DM payload → correct NormalizedMessage
   - Test `normalizeTwitterTweet()` with mock tweet payload → correct NormalizedMessage
   - Test `normalizeTwitterNotification()` with mock notification → correct NormalizedMessage
   - Test missing/null field handling (graceful degradation)
   - Test `metadata.conversationType` is set correctly ('dm' vs 'tweet')

2. Create `src/workers/twitterWorker.test.ts`:
   - Test consumer-side idempotency (duplicate messages skipped)
   - Test DM conversations dispatch via `TwitterAdapter.sendMessage()`
   - Test tweet conversations dispatch via `TwitterAdapter.sendTweetReply()`

3. Run full verification suite:
   ```bash
   npx tsc --noEmit
   npx vitest run
   npx vitest run src/normalizer/twitter.test.ts src/workers/twitterWorker.test.ts
   ```

4. Manual verification checklist:
   - Create Twitter bot via UI → login with credentials → status: `connected`
   - Inbound DM syncs → conversation appears in ConversationsPage
   - Inbound mention → normalize → worker → AI response → tweet reply posted
   - DM reply dispatches via Python service (twikit `send_dm`)
   - Bot disconnect → reconnect → sync resumes
   - Server restart → all connected Twitter bots resume sync
   - Frontend PLATFORM_CONFIG shows Twitter as supported
   - Rate limit hit → sync pauses → resumes after reset
   - Debug server `/api/health` includes Twitter check
   - Docker: `docker compose up twitter-api` starts successfully

**Verify:** All commands pass:
- `npx tsc --noEmit` — zero type errors
- `npx vitest run` — all tests pass (existing + new)
- `docker compose up twitter-api` — container healthy

**Done criteria:**
- [ ] All new files compile without errors
- [ ] All new tests pass
- [ ] All existing tests pass (no regressions)
- [ ] Python service container builds and starts
- [ ] Manual verification checklist items verified

---

## Summary

| Wave | Plans | Description |
|------|-------|-------------|
| **1** | P01-P04 | Python service (twikit + FastAPI), Node.js adapter, normalizer, queue + rate limiter + error codes |
| **2** | P05-P07 | Message worker, sync workers, ResponseRouter |
| **3** | P08-P10 | Workspace routes, sync lifecycle, Docker Compose + startup sync |
| **4** | P11-P12 | Frontend wiring, sync status UI |
| **5** | P13-P15 | Metrics + DLQ, scheduled posting (optional), E2E verification |

**Total: 15 plans across 5 waves**

---

## Success Criteria

- [ ] Twitter Python service starts in Docker container on port 8083
- [ ] Twitter bot created via UI with username+email+password connects and shows `connected`
- [ ] Session cookies persist across container restarts
- [ ] Inbound DMs flow through CRM pipeline (sync → normalize → worker → DB)
- [ ] Inbound mentions/replies flow through CRM pipeline
- [ ] Outbound DMs dispatch via twikit `send_dm` (Python service)
- [ ] Outbound tweet replies dispatch via twikit (Python service)
- [ ] Bot status syncs on startup and on status check
- [ ] Start/stop/delete work for Twitter bots
- [ ] Rate limiter enforces Twitter platform limits (50 DMs/day, 300 tweets/3hrs)
- [ ] Sync workers poll on configurable intervals with cursor tracking
- [ ] Rate limit awareness pauses sync before hitting limits
- [ ] Twitter and other platforms are completely independent code paths
- [ ] Reconnect after server restart resumes all Twitter sync
- [ ] All existing tests pass (no regressions)
