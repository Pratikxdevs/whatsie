---
plan_id: P04
phase: 23
objective: Remove non-WhatsApp Docker services and platform source directories
wave: 1
depends_on: []
files_modified:
  - docker-compose.yml
  - platforms/telegram-api/ (DELETE directory)
  - platforms/twitter-api/ (DELETE directory)
  - platforms/hydrogram/ (DELETE directory)
requirements: []
autonomous: true
---

# Plan P04: Remove Non-WhatsApp Docker Services and Platform Directories

## Tasks

### Task 1: Remove Telegram Docker services from docker-compose.yml
**read_first:**
- `docker-compose.yml`

**acceptance_criteria:**
- `telegram-api` service is removed
- `hydrogram-api` service is removed
- `obscura` service is removed (only used by Telegram)
- `telegram_sessions`, `telegram_data`, `hydrogram_sessions` volumes are removed
- `evolution-api` service remains

**action:**
- In `docker-compose.yml`:
  - Delete the `hydrogram-api` service block (lines 48-59)
  - Delete the `obscura` service block (lines 61-66)
  - Delete the `telegram-api` service block (lines 68-97)
  - Remove volumes `hydrogram_sessions`, `telegram_sessions`, `telegram_data` from the `volumes:` section (lines 152-162)
  - Keep: postgres, redis, prometheus, grafana, evolution-api

### Task 2: Remove Twitter Docker services from docker-compose.yml
**read_first:**
- `docker-compose.yml`

**acceptance_criteria:**
- `twitter-api` service is removed
- `twitter_sessions` volume is removed

**action:**
- In `docker-compose.yml`:
  - Delete the `twitter-api` service block (lines 98-112)
  - Remove `twitter_sessions` from the `volumes:` section

### Task 3: Delete platform source directories
**read_first:**
- `platforms/telegram-api/`
- `platforms/twitter-api/`
- `platforms/hydrogram/`

**acceptance_criteria:**
- `platforms/telegram-api/` directory no longer exists
- `platforms/twitter-api/` directory no longer exists
- `platforms/hydrogram/` directory no longer exists
- `platforms/evolution-api/` directory still exists

**action:**
- Delete `platforms/telegram-api/` recursively
- Delete `platforms/twitter-api/` recursively
- Delete `platforms/hydrogram/` recursively
- Verify `platforms/evolution-api/` still exists

### Task 4: Verify Docker configuration
**read_first:**
- `docker-compose.yml`

**acceptance_criteria:**
- `docker-compose.yml` only defines: postgres, redis, prometheus, grafana, evolution-api
- `docker-compose up -d` syntax is valid (run `docker-compose config` to validate)

**action:**
- Run `docker-compose config` to validate YAML syntax
- Verify remaining services are: postgres, redis, prometheus, grafana, evolution-api

## Verification

**must_haves:**
- [ ] `docker-compose.yml` has no telegram-api, hydrogram-api, obscura, or twitter-api services
- [ ] `docker-compose.yml` has no telegram/twitter/hydrogram volumes
- [ ] `platforms/telegram-api/` deleted
- [ ] `platforms/twitter-api/` deleted
- [ ] `platforms/hydrogram/` deleted
- [ ] `platforms/evolution-api/` still exists
- [ ] `docker-compose config` validates successfully
