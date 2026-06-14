# Phase 17 Research: Twitter/X Platform Integration (twikit)

**Date:** 2026-05-24
**Library:** `twikit` — https://github.com/d60/twikit
**Researcher:** gsd-phase-researcher

---

## 1. Library: `twikit`

### Overview
- **Language:** Python (async, uses asyncio/httpx)
- **Install:** `pip install twikit`
- **Latest:** 2.3.1 (Feb 2025), MIT license
- **Stars:** 4.4k | **Forks:** 539
- **Docs:** https://twikit.readthedocs.io
- **Approach:** Hits Twitter/X's internal GraphQL + v1.1 REST endpoints (no official API key needed)

### Authentication
- **Method:** Username + email + password login against Twitter's internal `onboarding/task.json` endpoint
- **TOTP supported:** Yes, via `totp_secret` parameter for 2FA accounts
- **Session persistence:** Cookies (`ct0` + `auth_token`) saved/loaded from JSON file
- **Guest mode:** Can obtain guest token for read-only access
- **Captcha:** Supports Capsolver integration
- **Delegate accounts:** `set_delegate_account(user_id)` for acting as another account

**Critical guidance:** Reuse cookies aggressively. Login is "closely monitored" — repeated logins trigger bans. One login, save cookies, reload forever.

### Full API Surface

**Tweets (18+):** create_tweet, delete_tweet, get_tweet_by_id, get_tweets_by_ids, search_tweet, get_similar_tweets, get_user_tweets, get_user_highlights_tweets, favorite_tweet, unfavorite_tweet, retweet, delete_retweet, get_retweeters, get_favoriters, create_scheduled_tweet, get_scheduled_tweets, delete_scheduled_tweet, get_community_note

**DMs (6+):** send_dm (with media + reply support), get_dm_history, delete_dm, add_reaction_to_message, remove_reaction_from_message, group DM operations

**Users (20+):** get_user_by_screen_name, get_user_by_id, follow_user, unfollow_user, block_user, unblock_user, mute_user, unmute_user, get_user_followers, get_user_following, get_user_verified_followers, get_latest_followers, get_latest_friends, get_followers_ids, get_friends_ids, get_user_subscriptions

**Timelines:** get_timeline (For You), get_latest_timeline (Following)

**Media:** upload_media (images, video, long video), check_media_status, create_media_metadata

**Notifications:** get_notifications (All / Mentions / Verified types)

**Lists:** get_list, get_lists, get_list_tweets, get_list_members, add_list_member, remove_list_member, create_list, edit_list

**Bookmarks:** bookmark_tweet, delete_bookmark, get_bookmarks, delete_all_bookmarks, create_bookmark_folder

**Trends/Geo:** get_trends, get_available_locations, get_place_trends, reverse_geocode, search_geo, get_place

**Communities:** Community operations exist via Community/CommunityMember models

### Rate Limits

All limits reset every **15 minutes**:

| Operation | Limit/15min |
|---|---|
| `follow_user` | 15 |
| `search_tweet`/`search_user` | 50 |
| `get_user_followers` | 50 |
| `get_user_by_screen_name` | 95 |
| `get_tweet_by_id` | 150 |
| `get_notifications` | 180 |
| `send_dm` | 187 |
| `get_timeline` / `get_latest_timeline` | 500 |
| `get_bookmarks` | 500 |
| `get_trends` | 20,000 |

**Handling:** Built-in automatic rate limit handling. `request()` method accepts `auto_unlock=True`.

### Session/Cookie Persistence
- `save_cookies(path)` / `load_cookies(path)` — JSON file persistence
- `get_cookies()` / `set_cookies(cookies)` — programmatic access
- **Must reuse cookies** — never re-login if cookies are valid

### Streaming

`StreamingSession` supported:

| Topic | Events |
|---|---|
| `tweet_engagement` | Real-time like_count, retweet_count, view_count, quote_count, reply_count |
| `dm_update` | New/updated DM in a conversation |
| `dm_typing` | Typing indicator in DM |
| `config` | Session config (heartbeat, subscription TTL) |

Features: async iteration, auto-reconnect, dynamic subscribe/unsubscribe, heartbeat keep-alive.

### Known Limitations
1. **Account ban risk** — unofficial API usage. Accounts can be banned if used incorrectly
2. **Login monitoring** — each login tracked. Must reuse cookies
3. **DM monitoring** — Twitter monitors DM activity closely
4. **Fragile** — relies on internal GraphQL endpoints that can change
5. **No official support** — 132 open issues, community-maintained

---

## 2. Architecture: Python Service Pattern (like Hydrogram/Telegram)

Since `twikit` is Python, the architecture follows the same pattern as the Telegram Hydrogram integration:

```
platforms/twitter-api/        — Python FastAPI Docker container
  ├── Dockerfile
  ├── requirements.txt
  ├── main.py                 — FastAPI app entry point
  ├── client.py               — TwikitClient wrapper
  ├── session_store.py        — Cookie persistence
  ├── models.py               — Pydantic request/response models
  └── routes/
      ├── auth.py             — Login, restore, status
      ├── tweets.py           — Tweet CRUD
      ├── dms.py              — DM operations
      ├── users.py            — User/profile operations
      ├── sync.py             — Polling endpoints (DMs, timeline, notifications)
      └── health.py           — Health check

src/adapters/twitterApi.ts    — Node.js HTTP client to Python service
src/adapters/twitter.adapter.ts — Rate-limited wrapper for workers
```

**HTTP bridge:** Node.js CRM → Python service via HTTP (port 8083)

**Session volume:** `/app/sessions/` mounted as Docker volume for cookie persistence

---

## 3. Key Differences from rettiwt-api (previous plan)

| Aspect | rettiwt-api (old) | twikit (new) |
|---|---|---|
| Language | TypeScript/Node.js | Python |
| Auth | Cookie-based API_KEY | Username+email+password |
| DM Sending | **NOT supported** | **Supported** (+ reactions, groups) |
| Rate limits | Manual middleware | Built-in auto-handling |
| Architecture | In-process | Separate Docker container |
| Streaming | Polling-based `AsyncGenerator` | WebSocket-like `StreamingSession` |
| Community | 834 stars | 4.4k stars |
| Session | base64 cookie string | JSON cookie file |

**The DM sending capability is the key differentiator** — the entire outbound flow changes from tweet-reply-only to full DM+tweet support.

---

## 4. Database Schema Impact

**No new Prisma models needed.** Existing models handle Twitter:

- `Bot`: `platform: 'twitter'`, `sessionName` = session identifier (e.g., `twitter_{userId}`), `config` = `{ screen_name, twitter_user_id, system_prompt, ai_engine, ... }`
- `Conversation`: `platform: 'twitter'`, `externalUserId` = Twitter user ID
- `Message`: standard schema, `platformMessageId` = Twitter DM ID or tweet ID
- `Lead`: `source: 'twitter'`

**No schema migration needed.**

---

## 5. Synchronization Architecture

Same polling approach, but now through the Python service HTTP bridge:

1. **DM Sync Worker** → `GET /sync/dms?since_id={id}` on Python service → normalize → enqueue to `twitter-messages`
2. **Timeline Sync Worker** → `GET /sync/timeline?since_id={id}` → normalize → enqueue
3. **Notification Sync Worker** → `GET /sync/notifications?since_id={id}` → normalize → enqueue
4. **Outbound Messages** → `POST /dm/send` or `POST /tweets` on Python service

Sync state in Redis: `twitter:sync:{tenantId}:{accountId}:lastCursors`

---

## 6. Docker Compose Impact

New service added to `docker-compose.yml`:
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

New volume: `twitter_sessions:/app/sessions`

---

## 7. Frontend Impact

- `PLATFORM_CONFIG.twitter.supported = true`
- AddBotModal: `username`, `email`, `password` inputs (no QR, no bot token, no API_KEY)
- Optional `totp_secret` input for 2FA accounts
- Twitter bots: `connected`/`disconnected` status (no QR states)
- Sync status display with last sync timestamps
