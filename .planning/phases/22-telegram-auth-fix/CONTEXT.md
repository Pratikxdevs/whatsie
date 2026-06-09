# Phase 22 Context: Telegram Scraper Fix — ACTUAL Root Cause

## Source
User: "scraper is showing error, I executed Phase 22 but it didn't fix it"

## Confirmed Root Cause
The circuit breaker in `httpProxy.ts` uses hostname-only domain keys. `getDomain("http://localhost:8082")` returns `"localhost"` — same as any other localhost service. When my.telegram.org rate-limits the scraper (causing 5xx from telegram-api), the circuit breaker opens for ALL localhost services.

## Evidence
```bash
# Direct to telegram-api (port 8082) — WORKS
curl -X POST http://localhost:8082/auth/scrape-credentials-start?phone=+919310226301
→ {"status":"awaiting_otp","session_key":"scraper_ 919310226301_...","message":"OTP sent..."}

# Through backend proxy (port 3000) — BLOCKED
curl -X POST http://localhost:3000/api/workspaces/telegram/scrape-credentials-start -d '{"phone":"+919310226301"}'
→ {"error":"Failed to start credential scraper","details":"Circuit breaker open for localhost"}
```

## Architecture
```
Frontend (scraperApi, 120s timeout)
  → Backend Express (port 3000)
    → httpProxy circuit breaker (domain = "localhost") ← BLOCKED HERE
      → Telegram API Service (port 8082)
        → my.telegram.org (direct HTTP)
```

## Key Files
- `src/middleware/httpProxy.ts:57-63` — `getDomain()` returns hostname only (BUG)
- `src/adapters/telegramAdapter.ts:36-44` — scraper client config
- `platforms/telegram-api/main.py:817-1062` — scraper implementation
- `frontend/src/services/api.ts:21-27` — `scraperApi` with 120s timeout (already fixed)
