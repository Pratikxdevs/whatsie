# Phase 28: Ship-Ready — Auth, Cleanup & User-Facing Polish

**Goal:** Transform the app from a dev-bypass prototype into a real, user-facing product where every page is auth-gated, broken code is removed, stale platform references are purged, and pages that require bots display proper empty states instead of errors.

---

## Research Findings

### 🔴 Critical: Auth is 100% Fake
- `frontend/src/contexts/AuthContext.tsx` — hardcodes `DEV_USER` with `isAuthenticated: true`. Login/Register forms are decorative; they call no-op functions.
- `frontend/src/components/auth/ProtectedRoute.tsx` — technically works, but `useAuth()` always returns `isAuthenticated: true`, so it never blocks.
- `.env` still has `DEV_AUTH_BYPASS=true` — the backend `src/routes/gateway.ts:38` still checks this to skip webhook signature verification.
- The backend `src/middleware/auth.ts` is correctly hardened (Clerk JWT + API Key only, fail-closed), but the frontend never sends real Clerk tokens. The `api.ts` interceptor tries `window.__clerk` which doesn't exist because Clerk is never mounted.

### 🔴 Critical: Backend Crashes on Startup
- `src/index.ts:102` — `FRONTEND_URL` env var is required but missing from `.env`, causing `process.exit(1)`.

### 🟡 Stale Multi-Platform References (User-Visible)
- `LoginPage.tsx:62-75` — Shows 7 platform badges (Telegram, Discord, Instagram, etc.) that don't exist.
- `RegisterPage.tsx:75` — Says "7 platform integrations" in marketing copy.
- `PlatformBreakdown.tsx` — Dashboard pie chart with hardcoded data for 7 platforms (all fake).
- `BotsPage.tsx:308` — Platform filter dropdown iterates `PLATFORM_CONFIG` (only WhatsApp now, but UI structure implies multi-platform).

### 🟡 Pages That Need Bot-Gate Logic
These pages fetch data that only exists if bots are connected. Without bots, they show errors or empty content with no guidance:
- **Conversations** — fetches chats from bots; without bots → empty + confusing.
- **Analytics** — all charts show zeros with no context.
- **Leads** — leads come from bot conversations; empty with no guidance.

### 🟡 Broken/Dead Components
- `PlatformBreakdown.tsx` — entirely hardcoded fake data for deleted platforms. Never fetches real data. Should be removed or replaced.
- `QRCodeModal.tsx` — imported in `BotsPage.tsx` but the add-bot flow was consolidated into `AddBotModal.tsx`. Possibly dead.
- `frontend/src/components/onboarding/` — 5 onboarding wizard components exist but are never routed to or rendered anywhere in `App.tsx`.

### 🟢 Already Working
- Backend auth middleware (`src/middleware/auth.ts`) — correctly fail-closed.
- Prisma tenant isolation — global middleware injects tenantId.
- Bot CRUD, WhatsApp connection flow, Evolution API adapter — functional.
- All UI pages render without TS errors (frontend compiles clean).

---

## Plan

### Wave 1: Environment & Backend Boot Fix (P01)

**File:** `.env`, `src/index.ts`

**Tasks:**
1. Add `FRONTEND_URL=http://localhost:5173` to `.env`.
2. Remove `DEV_AUTH_BYPASS=true` from `.env`.
3. Remove the `DEV_AUTH_BYPASS` check in `src/routes/gateway.ts:37-40` — webhook signature verification should always run.
4. Remove `DEFAULT_TENANT_ID` from `.env` (stale concept).
5. Verify backend starts successfully with `npm run dev`.

---

### Wave 1: Real Clerk Auth Integration (P02)

**Files:** `frontend/src/contexts/AuthContext.tsx`, `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/components/auth/ProtectedRoute.tsx`, `frontend/src/services/api.ts`

**Tasks:**
1. **Wrap App in ClerkProvider** — In `main.tsx` or `App.tsx`, wrap the tree in `<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>`.
2. **Rewrite AuthContext** — Replace the hardcoded `DEV_USER` with real Clerk hooks:
   - Use `useUser()` and `useAuth()` from `@clerk/clerk-react`.
   - `isAuthenticated` should be `isSignedIn` from Clerk.
   - `isLoading` should be `isLoaded` inverted.
   - `user` should map from Clerk's user object to the app's User interface.
   - `login`/`register` functions should redirect to Clerk's sign-in/sign-up flows or be removed (Clerk handles these via hosted UI or components).
   - `logout` should call `signOut()` from Clerk.
3. **Update ProtectedRoute** — It already works correctly with `useAuth()`, so it will automatically start blocking unauthenticated users once AuthContext returns real data.
4. **Fix API token attachment** — The `api.ts` interceptor currently looks for `window.__clerk` which is incorrect. Use `useAuth().getToken()` from Clerk's React hooks, or use `@clerk/clerk-react`'s `useSession` to get tokens. Since interceptors can't use hooks, use Clerk's `clerkClient` from the browser instance.
5. **Update Login/Register pages** — Either:
   - (a) Replace custom forms with Clerk's `<SignIn />` and `<SignUp />` components, or
   - (b) Keep the custom UI but wire the submit handlers to Clerk's `signIn.create()` / `signUp.create()` methods.

---

### Wave 2: Purge Stale Platform References (P03)

**Files:** Multiple frontend files

**Tasks:**
1. `LoginPage.tsx:62-75` — Remove the 7-platform badge row. Replace with single "WhatsApp" badge or remove entirely.
2. `LoginPage.tsx:56` — Change "7 messaging platforms" copy to "WhatsApp" or "your messaging".
3. `RegisterPage.tsx:75` — Change "7 platform integrations" to "WhatsApp Integration".
4. `PlatformBreakdown.tsx` — Delete the entire file. It renders fake hardcoded data for deleted platforms.
5. Update any dashboard imports that reference `PlatformBreakdown`.
6. `BotsPage.tsx` — Remove the platform filter dropdown (only WhatsApp exists).

---

### Wave 2: Bot-Gate Empty States (P04)

**Files:** `ConversationsPage.tsx`, `AnalyticsPage.tsx`, `LeadsPage.tsx`

**Tasks:**
For each page that requires bots to display meaningful content:
1. At the top of the component, fetch the bot list (`botApi.getBots()` or use a shared context).
2. If `bots.length === 0`, render a full-page empty state with:
   - Icon (Bot icon from lucide)
   - Headline: "Connect a bot to get started"
   - Subtext: "This page shows data from your WhatsApp bots. Connect your first bot to see conversations/leads/analytics here."
   - CTA button: "Add Bot →" that navigates to `/bots`.
3. If bots exist but data is empty, show a softer "No data yet" state (not the bot-gate).

---

### Wave 3: Remove Dead/Broken Components (P05)

**Files:** Multiple

**Tasks:**
1. **Delete `PlatformBreakdown.tsx`** (already planned in P03 but ensure all imports are cleaned).
2. **Audit `QRCodeModal.tsx`** — Check if it's still used in `BotsPage.tsx`. If the add-bot flow was consolidated into `AddBotModal`, remove the QR modal import and component.
3. **Remove onboarding wizard** — The 5 files in `frontend/src/components/onboarding/` (`WelcomeStep.tsx`, `PlatformStep.tsx`, `BotStep.tsx`, `CompleteStep.tsx`, `OnboardingWizard.tsx`) are never rendered. Either wire them into the app flow after registration or delete them to avoid confusion.
4. **Clean up unused imports** — After deletions, run the frontend build (`npm run build`) to catch any broken imports.

---

### Wave 3: Branding & Copy Consistency (P06)

**Files:** `LoginPage.tsx`, `RegisterPage.tsx`, `Navbar.tsx`, `DashboardPage.tsx`

**Tasks:**
1. Replace all instances of "CrmV2" with "Whatsie" (the product name per ROADMAP).
2. Update the Login hero copy: "AI-Powered CRM for Modern Teams" → "WhatsApp AI CRM" or similar.
3. Update the Register hero copy: "7 platform integrations" → "Instant WhatsApp Integration".
4. Ensure the Navbar brand area shows "Whatsie" instead of relying on the workspace name.
5. Update `<title>` in `index.html` to "Whatsie — WhatsApp AI CRM".

---

### Wave 4: Final Smoke Test & Build Verification (P07)

**Tasks:**
1. Run `npx tsc --noEmit` on backend — must pass with 0 errors.
2. Run `npx tsc --noEmit --project frontend/tsconfig.json` on frontend — must pass.
3. Run `npm run build` in frontend — production build must succeed.
4. Manual walkthrough:
   - Visit `/` — should redirect to `/login` (not dashboard).
   - Visit `/login` — should show Clerk sign-in or custom form.
   - After login — should reach `/dashboard`.
   - Visit `/conversations` with no bots — should show bot-gate empty state.
   - Visit `/bots` — should show "Add Bot" flow.
   - No console errors, no broken images, no stale platform references visible.

---

## Suggestions

1. **Clerk vs Custom Auth:** I recommend using Clerk's hosted `<SignIn />` and `<SignUp />` components instead of keeping the custom forms. This eliminates the need to handle password hashing, sessions, and token refresh — Clerk does it all. The custom forms can always be styled later with Clerk's appearance API.

2. **Onboarding Wizard:** The 5 onboarding files are well-built. Consider wiring them in as a post-registration flow (redirect new users to `/onboarding` after their first sign-up). If that's not a priority, delete them.

3. **PlatformBreakdown chart:** Instead of deleting it, we could refactor it to show a "Bot Activity" pie chart (e.g., messages per bot) once real data exists. But for ship-ready, removing fake data is the priority.

---

## Success Criteria

- [ ] No user can access any protected page without signing in via Clerk.
- [ ] Login and Register pages use real Clerk authentication (not no-op functions).
- [ ] Backend starts without crashes (FRONTEND_URL set, no DEV_AUTH_BYPASS).
- [ ] Zero references to Telegram, Discord, Twitter, Instagram, Teams, or Messenger in user-visible UI.
- [ ] Conversations, Analytics, and Leads pages show a proper "Connect a bot" empty state when no bots exist.
- [ ] All dead components removed (PlatformBreakdown, unused onboarding files, QRCodeModal if dead).
- [ ] Product branded as "Whatsie" consistently across Login, Register, Navbar, and page titles.
- [ ] Frontend and backend compile with 0 TypeScript errors.
- [ ] Production build (`npm run build`) succeeds.
