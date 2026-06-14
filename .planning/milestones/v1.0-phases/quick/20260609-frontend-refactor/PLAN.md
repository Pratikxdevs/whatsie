# Frontend Refactor — Full Plan

## Objective
Remove dead pages, rebuild Conversation page with full Evolution API integration, restructure Settings page, and fix all visual inconsistencies.

---

## Phase 1: Cleanup — Remove Dead Pages & Components

### 1A. Delete unused page files
- `frontend/src/pages/WorkflowsPage.tsx` — dead (no route in App.tsx)
- `frontend/src/pages/ContactsPage.tsx` — remove per user request
- `frontend/src/pages/CampaignsPage.tsx` — remove per user request
- `frontend/src/pages/ReportsPage.tsx` — hardcoded fake data, no API
- `frontend/src/pages/IntegrationsPage.tsx` — hardcoded fake data, no API
- `frontend/src/pages/OnboardingPage.tsx` — one-time wizard, not needed in nav

### 1B. Delete orphaned component files
- `frontend/src/components/BotCard.tsx` — superseded by `components/bots/BotCard.tsx`
- `frontend/src/components/BotSetupModal.tsx` — superseded by `components/bots/AddBotModal.tsx`
- `frontend/src/components/NavBar.tsx` — superseded by `components/layout/Navbar.tsx`
- `frontend/src/components/TopNav.tsx` — superseded by `components/layout/Navbar.tsx`
- `frontend/src/components/TopBar.tsx` — superseded by `components/layout/Navbar.tsx`

### 1C. Remove routes from App.tsx
- Remove: `/campaigns`, `/contacts`, `/reports`, `/integrations`, `/onboarding`
- Keep: `/dashboard`, `/bots`, `/conversations`, `/leads`, `/analytics`, `/billing`, `/settings`, `/team`

### 1D. Clean up navigation (Navbar.tsx)
- Remove: Workflows, Contacts links
- Keep: Overview, Bots, Conversations, Leads, Analytics, Settings, Team

---

## Phase 2: Build Settings Page

### What the Settings page should contain (user-facing):

| Tab | Purpose | Backend Support |
|-----|---------|-----------------|
| **General** | Company name, timezone, default language | Custom config (store in DB or localStorage) |
| **Profile** | User profile — name, email, avatar | Clerk / User table |
| **Team** | Invite members, manage roles | `/api/team` routes (TeamPage.tsx) |
| **API Keys** | Manage per-user AI provider keys | `/api/credentials` routes |
| **Billing** | Usage meters, plan info | `/api/billing` routes |
| **Danger Zone** | Delete account, data export | Placeholder |

### Settings Page Structure:
```
/settings
├── GeneralTab        — Company name, timezone, language
├── ProfileTab        — User info, avatar (Clerk)
├── TeamTab           — Team members, roles, invite
├── APIKeysTab        — AI provider API keys (Groq, OpenAI, etc.)
├── BillingTab        — Usage stats, plan comparison
└── DangerZoneTab     — Account deletion, data export
```

### Remove from Settings:
- **IntegrationsTab** — moves to Bots page (platform-specific)
- **CredentialsTab** — merge into API Keys tab

---

## Phase 3: Rebuild Conversation Page

### Current state:
- 3-panel layout (list, messages, contact sidebar)
- Uses only Prisma DB for messages (no Evolution API chat history)
- Basic text/media send only
- Socket.IO real-time works

### New Conversation Page — Full Evolution API Integration:

#### 3A. New backend routes to add:

| Route | Method | Evolution API Call | Purpose |
|-------|--------|-------------------|---------|
| `/api/whatsapp/chats` | GET | `findChats(sessionName)` | List all WhatsApp chats |
| `/api/whatsapp/contacts` | GET | `findContacts(sessionName)` | Search WhatsApp contacts |
| `/api/whatsapp/messages/:jid` | GET | `findMessages(sessionName, { remoteJid })` | Fetch chat history |
| `/api/whatsapp/read` | POST | `markMessagesRead(sessionName, messages)` | Mark as read |
| `/api/whatsapp/typing` | POST | `sendPresenceToChat(sessionName, opts)` | Typing indicator |
| `/api/whatsapp/profile/:jid` | GET | `fetchProfilePicture(sessionName, jid)` | Contact avatar |
| `/api/whatsapp/profile` | GET | `fetchProfile(sessionName, number)` | Own profile |

#### 3B. Frontend Conversation Page layout:
```
┌─────────────────────────────────────────────────────────────┐
│  CONVERSATIONS PAGE                                         │
│                                                             │
│  ┌──────────┐  ┌────────────────────┐  ┌──────────────┐   │
│  │ CHAT LIST │  │ MESSAGE THREAD     │  │ CONTACT INFO │   │
│  │          │  │                    │  │              │   │
│  │ Search   │  │ Messages with      │  │ Avatar       │   │
│  │ Filters: │  │ timestamps,        │  │ Name         │   │
│  │ All      │  │ direction (in/out) │  │ Phone        │   │
│  │ Unread   │  │ Read receipts      │  │ Status       │   │
│  │ Groups   │  │ Media previews     │  │ Actions:     │   │
│  │          │  │                    │  │ - Block      │   │
│  │ Chat     │  │ ┌──────────────┐   │  │ - Archive    │   │
│  │ cards:   │  │ │ Typing...    │   │  │ - Profile    │   │
│  │ - Avatar │  │ └──────────────┘   │  │              │   │
│  │ - Name   │  │                    │  │ Chat Actions: │   │
│  │ - Last   │  │ ┌──────────────┐   │  │ - Read       │   │
│  │   msg    │  │ │ Input:       │   │  │ - Unread     │   │
│  │ - Time   │  │ │ Text + Send  │   │  │ - Archive    │   │
│  │ - Unread │  │ │ + Attach     │   │  │ - Delete     │   │
│  │   badge  │  │ └──────────────┘   │  │              │   │
│  └──────────┘  └────────────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 3C. Key features:
1. **Chat list from Evolution API** — `findChats()` instead of just DB conversations
2. **Message history from Evolution API** — `findMessages()` with pagination
3. **Contact avatars** — `fetchProfilePicture()` for each contact
4. **Typing indicators** — `sendPresenceToChat()` when user types
5. **Read receipts** — `markMessagesRead()` when conversation is opened
6. **Block/Unblock** — `updateBlockStatus()` from contact sidebar
7. **Archive** — `archiveChat()` from chat actions
8. **Delete message** — `deleteMessageForEveryone()` context menu
9. **Emoji reactions** — `sendReaction()` on message hover
10. **Search messages** — `findMessages()` with query parameter

#### 3D. Data flow:
```
Frontend                    Backend                     Evolution API
────────                    ───────                     ─────────────
GET /api/whatsapp/chats ──→ findChats(sessionName) ──→ POST /chat/findChats/...
                           Returns chat list             Returns [{jid, name, lastMsg}]

Click chat ───────────────→ GET /api/whatsapp/messages/:jid
                           findMessages(sessionName, { remoteJid: jid })
                           ──→ POST /chat/findMessages/...
                           Returns [{key, message, timestamp}]

Type message ──────────────→ sendPresenceToChat('composing')
                           POST /chat/sendPresence/...

Send message ──────────────→ POST /api/conversations/:id/messages (existing)
                           → evoApi.sendText() → POST /message/sendText/...
                           → prisma.message.create()

Receive message ←────────── webhook → gateway.ts → BullMQ worker → DB → Socket.IO
```

---

## Phase 4: Fix Frontend Visual Issues

### 4A. Add CSS variables to index.css
Add the full shadcn/ui HSL variable set:
```css
:root {
  --background: 0 0% 3.5%;
  --foreground: 0 0% 98%;
  --primary: 142 72% 29%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 10%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 65%;
  --accent: 0 0% 15%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 15%;
  --input: 0 0% 15%;
  --ring: 142 72% 29%;
  --radius: 0.5rem;
}
```

### 4B. Add Inter font to index.html
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```
Update `tailwind.config.js` fontFamily to use Inter.

### 4C. Register tailwindcss-animate plugin
Add to `tailwind.config.js`:
```js
plugins: [require("tailwindcss-animate")]
```

### 4D. Replace hardcoded hex colors
Convert all `bg-[#09090b]` → `bg-zinc-950`, `bg-[#0f0f11]` → `bg-zinc-900/50`, etc.
Target files: All pages, layout components, BotSetupModal.

### 4E. Replace heroicons with lucide-react
Replace `PlusIcon` from `@heroicons/react` → `Plus` from `lucide-react` in any remaining files.

### 4F. Fix page title
`index.html`: `<title>frontend</title>` → `<title>Whatsie</title>`

### 4G. Fix mobile nav background
`components/ui/navbar.tsx`: `bg-[#0c0c0e]` → `bg-zinc-950` (match main navbar)

---

## Execution Order

1. **Phase 1** (Cleanup) — 10 min, zero risk
2. **Phase 4** (Visual fixes) — 20 min, CSS/config only
3. **Phase 2** (Settings page) — 15 min, refactor existing
4. **Phase 3** (Conversation rebuild) — 45 min, new backend routes + frontend

## Verification

- [ ] All dead pages removed, no broken imports
- [ ] Settings page has correct tabs
- [ ] Conversation page loads chats from Evolution API
- [ ] Messages display with avatars and timestamps
- [ ] Typing indicators work
- [ ] No hardcoded hex colors remaining
- [ ] Inter font renders correctly
- [ ] All buttons have proper styling (CSS vars)
- [ ] `tailwindcss-animate` plugin active
