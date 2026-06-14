---
phase: 16
plan: 06
type: execute
status: complete
completed: 2026-05-24
---

# Summary: Discord OAuth2 Bot Auto-Generation

## Result
Discord OAuth2 bot auto-generation flow is fully wired end-to-end. Users can click "OAuth2" in the AddBotModal to start the Discord authorization flow, which creates a bot automatically without needing to manually copy tokens.

## Key Changes

### Backend
- **`src/routes/workspaces.ts`** — Added two new routes:
  - `GET /api/workspaces/discord/oauth-url` — Generates Discord OAuth2 authorization URL with `bot` scope and `2147483648` (Send Messages) permissions
  - `POST /api/workspaces/discord/callback` — OAuth2 callback that: exchanges auth code for bot token via Discord API, fetches bot user info, validates connection via DiscordAdapter, creates DB record, and connects the bot

### Frontend
- **`frontend/src/services/api.ts`** — Added `discordApi` with `getOAuthUrl()` and `handleCallback()` functions
- **`frontend/src/components/bots/AddBotModal.tsx`** — Full OAuth2 flow:
  - Token/OAuth2 connection method toggle for Discord (like Telegram's Token/Phone toggle)
  - OAuth2 mode: Next button redirects to Discord authorization page
  - `useEffect` handles the OAuth2 callback redirect (reads `code` and `state` from URL params, calls backend, cleans URL)
  - `canNext` validation updated to allow OAuth2 without bot_token

### Config
- **`.env.example`** — Added `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_OAUTH_REDIRECT_URI` environment variables

## Flow
1. User selects Discord platform, chooses "OAuth2" connection method
2. Clicks Next → frontend calls `GET /api/workspaces/discord/oauth-url`
3. User is redirected to Discord's authorization page with bot scope
4. After authorizing, Discord redirects back with `code` and `state`
5. Frontend `useEffect` detects the code, calls `POST /api/workspaces/discord/callback`
6. Backend exchanges code for token, fetches bot info, validates connection, creates DB record
7. Bot connects automatically via DiscordAdapter

## User Setup Required
- Create Discord application at discord.com/developers/applications
- Enable Message Content Intent under Bot > Privileged Gateway Intents
- Configure OAuth2 redirect URL matching `DISCORD_OAUTH_REDIRECT_URI`
- Set `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in `.env`
