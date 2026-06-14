# Fix ConversationsPage 500 Error

## Problem
The `/api/whatsapp/send` backend route returns HTTP 500 for all Evolution API errors, even when 
Evolution API returns 400 (Bad Request). The frontend gets a 500 and displays a raw error banner.

Root causes:
1. **Number format** — frontend sends JID format (`xxx@s.whatsapp.net`) to backend; backend passes 
   it straight to Evolution API. Evolution only accepts plain phone numbers.
2. **Error propagation** — backend always returns 500, even for 4xx upstream errors from Evolution.
3. **Frontend error display** — raw JSON error shown to user instead of a friendly message.

## Fixes
1. `src/routes/whatsapp-chat.ts` — strip `@s.whatsapp.net` from `number` in `/send` and `/media`
   routes; pass through upstream 4xx status codes instead of always responding 500.
2. `frontend/src/pages/ConversationsPage.tsx` — improve send error display to show friendly message.

## Files Changed
- `src/routes/whatsapp-chat.ts`
- `frontend/src/pages/ConversationsPage.tsx`
