---
status: complete
date: 2026-06-14
---

# Fix ConversationsPage 500 Error

## Summary
Fixed the 500 Internal Server Error when sending WhatsApp messages from the Conversations page.

## Root Causes Found
1. **JID format bug** — Frontend sends `number@s.whatsapp.net` (full JID) as the recipient. 
   Evolution API only accepts plain phone number digits. The `/send` and `/media` backend routes 
   now strip the `@...` suffix before forwarding to Evolution API.

2. **Error masking** — Backend route caught any Evolution API error (including 4xx Bad Request) 
   and always returned HTTP 500. Now properly passes through 4xx upstream status codes.

3. **Raw error display** — Frontend showed raw JSON `AxiosError` to user. Now shows friendly 
   human-readable messages, with specific handling for "number not on WhatsApp" case.

4. **Socket tenant mismatch WARNs** — `socketManager` was emitting `join_tenant` with 
   `clerkUser.id` (Clerk string ID like `user_xxx`) instead of the DB tenant UUID. Since the 
   server auto-joins the tenant room on connection, the `join_tenant` emit was redundant and 
   causing WARN spam. Removed.

## Commits
- `bd026f4` fix: strip JID suffix in /send|/media and improve error propagation
- `caf5bce` fix: remove redundant join_tenant emit causing tenant mismatch WARN logs

## Files Changed
- `src/routes/whatsapp-chat.ts`
- `frontend/src/pages/ConversationsPage.tsx`
- `frontend/src/services/socketManager.ts`
