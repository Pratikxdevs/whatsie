# Phase 22: Telegram Scraper — ACTUAL Fix

## Goal
Fix the credential scraper so it works end-to-end: phone → OTP → scrape api_id/api_hash.

## Root Cause (CONFIRMED)

The circuit breaker in `src/middleware/httpProxy.ts` uses **hostname-only** domain keys. The telegram-api service runs at `http://localhost:8082`, but `getDomain()` extracts just `localhost`. When my.telegram.org returns rate-limit errors (429/5xx), the telegram-api service propagates them as 502s. After 5 failures, the circuit breaker opens for `localhost` — and **blocks ALL requests to every localhost service** (telegram-api, evolution-api, twitter-api, everything).

```
getDomain("http://localhost:8082") → "localhost"
getDomain("http://localhost:8081") → "localhost"  ← SAME key!
```

**Evidence:**
- Direct call to telegram-api (port 8082) returns 200: `{"status":"awaiting_otp", ...}`
- Call through backend proxy (port 3000) returns 502: `{"error":"Circuit breaker open for localhost"}`

## Fix

### 1. Fix domain key to include port
**File:** `src/middleware/httpProxy.ts` — `getDomain()` function (line 57-63)

**Current:**
```ts
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;  // ← "localhost" (no port)
  } catch {
    return url;
  }
}
```

**Fix:** Use `hostname:port` as the domain key:
```ts
function getDomain(url: string): string {
  try {
    const u = new URL(url);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80');
    return `${u.hostname}:${port}`;
  } catch {
    return url;
  }
}
```

This makes `localhost:8082` and `localhost:8081` separate circuit breaker domains.

### 2. Add scraper-specific retry config
**File:** `src/adapters/telegramAdapter.ts` — `scraper` client (line 36-44)

**Current:**
```ts
const scraper = createProxiedClient({
  baseURL: TG_URL,
  timeout: 90_000,
  proxy: { logPrefix: '[TG-SCRAPER]', maxRetries: 1, backoffBase: 5000 },
});
```

**Fix:** Increase circuit breaker threshold for scraper (my.telegram.org is flaky):
```ts
const scraper = createProxiedClient({
  baseURL: TG_URL,
  timeout: 90_000,
  proxy: {
    logPrefix: '[TG-SCRAPER]',
    maxRetries: 1,
    backoffBase: 5000,
    circuitBreakerThreshold: 10,  // Higher tolerance for my.telegram.org flakiness
    circuitBreakerResetMs: 30_000, // Reset faster
  },
});
```

### 3. Don't propagate my.telegram.org errors as 5xx
**File:** `platforms/telegram-api/main.py` — `scrape_credentials_start` (line 876-878)

**Current:** All errors become HTTP 500:
```python
except Exception as exc:
    raise HTTPException(500, f"Failed to start credential scraper: {str(exc)}")
```

**Fix:** Return 4xx for client errors (rate limit, invalid phone) so circuit breaker doesn't count them:
```python
except Exception as exc:
    error_msg = str(exc)
    if any(kw in error_msg for kw in ["too many", "rate limit", "PHONE_NUMBER_INVALID", "PHONE_NUMBER_FLOOD"]):
        raise HTTPException(429, error_msg)  # 429 = don't count as circuit breaker failure
    raise HTTPException(500, f"Failed to start credential scraper: {error_msg}")
```

### 4. Same fix for verify endpoint
**File:** `platforms/telegram-api/main.py` — `scrape_credentials_verify` (line 1053-1062)

Return 4xx for OTP errors (incorrect, expired) instead of 500:
```python
if any(kw in error_msg for kw in ["OTP", "expired", "incorrect", "Two-factor"]):
    raise HTTPException(400, error_msg)  # Client error, not server error
```

## Files to Modify

1. `src/middleware/httpProxy.ts` — fix `getDomain()` to include port (1 line change)
2. `src/adapters/telegramAdapter.ts` — increase circuit breaker threshold for scraper
3. `platforms/telegram-api/main.py` — return 4xx for client errors, 500 only for real server errors

## Verification

1. Call `POST /api/workspaces/telegram/scrape-credentials-start` through port 3000 → should return 200
2. Call `POST /api/workspaces/telegram/scrape-credentials-verify` with wrong code → should return 400 (not 500)
3. Call any other localhost endpoint → should NOT be blocked by scraper circuit breaker
4. Trigger 5 failures on one service → other localhost services should still work
