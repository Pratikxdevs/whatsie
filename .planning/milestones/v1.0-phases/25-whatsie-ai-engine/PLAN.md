# Phase 25: Whatsie AI Engine Integration Plan

## Goal
Implement the dynamic Whatsie AI Engine to eliminate hardcoded model lists and static pricing tables, replacing them with dynamic OpenRouter metadata pipelines, brand resolution logo engines, secure vault storage, and resilient error/rate-limit handlers.

## Context
- **Backend**: Currently has static model selections. Needs a proxy endpoint (`POST /api/ai/verify`) to securely query OpenRouter's `/auth/key` and `/models` endpoints without leaking user credentials to frontend code.
- **Frontend**: Currently hardcodes model names (e.g. GPT-4, Llama) and pricing cards. Needs a searchable selector with live provider logos, custom obfuscation in local storage, and rate-limiting cool-down states.

## Success Criteria
- [ ] Backend endpoint `/api/ai/verify` validates keys and fetches/normalizes models in parallel.
- [ ] Dynamic logo resolver fallback chain renders brand logos correctly, defaulting to initial avatars if offline/missing.
- [ ] `whatsie_vault` stores keys in `localStorage` using salt + Base64 obfuscation.
- [ ] Searchable model selector lists 200+ models grouped by provider with interactive spec cards.
- [ ] Warning cards display for zero balance or rate limit cool-downs.

## Precondition
- OpenRouter API key available for development testing.
- Target endpoints and environment variables defined.

## Tasks

### Task 1: Backend Verification Route (`POST /api/ai/verify`)
**Files:** `src/routes/ai.ts`, `src/app.ts` (or equivalent server router mount)
- Create new routing file `src/routes/ai.ts` and register it in the main application loader.
- Implement endpoint `POST /api/ai/verify` to receive `{ apiKey }`.
- Perform parallel HTTP requests to:
  - `https://openrouter.ai/api/v1/auth/key`
  - `https://openrouter.ai/api/v1/models`
- Normalization logic:
  - Deduct usage from limit to compute dynamic balance credits.
  - Map model IDs to extract the first segment before the slash as `providerSlug`.
  - Format output values to match the frontend contract.
- Return response codes (200 for valid/no-credits, 400 for bad payloads, 401 for invalid keys).

### Task 2: API Services Integration
**Files:** `frontend/src/services/api.ts`
- Add `aiApi` helper to client services:
  ```typescript
  export const aiApi = {
    verifyKey: (apiKey: string) => api.post("/ai/verify", { apiKey }),
  };
  ```

### Task 3: Brand Logo Resolver & Fallback Chain
**Files:** `frontend/src/lib/brand-resolver.ts`, `frontend/src/components/ui/brand-logo.tsx`
- Create utility file `/frontend/src/lib/brand-resolver.ts` mapping slug strings to domains and hex colors.
- Design reusable component `<BrandLogo providerSlug={...} className={...} />`.
- Implementation:
  - State variable tracks active index in fallback URL array (`img.logo.dev` -> `logo.clearbit.com` -> `icon.horse`).
  - Render standard `<img>` that switches index on `onError`.
  - If all image requests fail, render text initials inside a stylized circular tag styled with `BRAND_COLORS[slug]`.

### Task 4: Client Key Vault Obfuscator
**Files:** `frontend/src/lib/vault.ts`
- Create helper file `frontend/src/lib/vault.ts` with salt-shuffled Base64 encoder/decoder functions (`obfuscateKey`, `deobfuscateKey`).
- Add storage hooks to interact with `whatsie_vault` object in `localStorage`.

### Task 5: Setup Key Input UI (Dropdown list & Health Card)
**Files:** `frontend/src/components/settings/ApiKeySettings.tsx` (or settings page key setup tab)
- Build dynamic input wrapper:
  - Input focus shows dropdown list of previously saved vault entries.
  - List items render provider logo, masked key, and stored wallet balance.
  - Selecting a key decodes it and fills the input.
- Render dynamic Health Card below the input:
  - Wallet balance displayed in green if active and verified.
  - Live heartbeat dot with interval timer showing minutes since last verification check.

### Task 6: Advanced Searchable Model Selector
**Files:** `frontend/src/components/settings/ModelSelector.tsx` (or workflow/bot config sheets)
- Create or update model dropdown/selector to render Radix/Shadcn Command palette.
- Group available models under Provider group headings (e.g. "Google", "Meta", "Anthropic").
- Show context limit and cost metrics on each model row.
- Integrate an interactive Spec Sheet panel beside or below the list displaying full cost breakdown per million tokens.

### Task 7: No-Void Error & Rate Limit Handling
**Files:** `frontend/src/components/settings/ApiKeySettings.tsx`
- Disable "Save" button and display wallet warning if key is valid but balance is $0.
- Handle 429 rate limit responses by displaying a cool-down timer counting down active seconds.
- Handle timeout states with retry prompts.

## Dependencies
- Task 1 must be completed and tested before Task 2.
- Task 3, 4 are utility setups (Wave 1, after Task 1-2).
- Task 5, 6, 7 are visual bindings (Wave 2, after Task 3-4).

## Out of Scope
- Backend database persistence for individual model lists (keeps models dynamically queried to stay up to date).
- Automatic wallet refilling from inside Whatsie UI.
