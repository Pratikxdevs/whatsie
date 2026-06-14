# Phase 5: Full Frontend Rebuild — Component-Level Plan

**Goal:** Rebuild all 13 CRM pages with production-quality components, 7-platform support, consistent hero layout, and comprehensive mock data. Frontend-only — backend integration is Phase 6.

**Why now:** Current frontend has 7 critical bugs, 15 warnings, 8 dead code files, and most pages are stubs with `console.log` handlers. The 7-platform CRM needs every page fully componentized before wiring to backend.

**Design System (enforced on every page):**
- Hero: 280px/320px, heroBg image, gradient overlays, `UnifiedTopBar`, giant title `clamp(52px, 9vw, 108px)`
- Cards: `CursorCard` with consistent illumination props
- Colors: bg `#09090b`, card bg `#141415`, borders `white/5` or `white/10`, text `zinc-200`/`zinc-400`/`white`
- Spacing: `px-6 md:px-12 lg:px-16`, sections `space-y-8`, cards gap `[17px]`
- Icons: Heroicons `@heroicons/react/24/outline` with `strokeWidth={1.5}`
- Toasts: `sonner` — no `alert()` or `confirm()`
- Status dots: green `#4ADE80`, yellow `#FBBF24`, red `#F87171`

**7 Platforms supported across all pages:**
1. WhatsApp (green `#25D366`)
2. Telegram (blue `#0088cc`)
3. Instagram (pink `#E4405F`)
4. Facebook Messenger (blue `#1877F2`)
5. Discord (indigo `#5865F2`)
6. SMS/Twilio (purple `#A855F7`)
7. Email/SMTP (gray `#6B7280`)

---

## Wave 1: Core Pages (5 pages, 5 plans)

### P01 — Dashboard Page

**File:** `frontend/src/pages/DashboardPage.tsx`
**Current state:** Static mockup with hardcoded data, not connected to API
**Action button:** None (overview page)

**Components to build:**

1. **PlatformStatusGrid** — 7 platform cards showing connection status
   - Each card: platform icon (Heroicon or SVG), name, status dot (connected/disconnected/warning), active bots count, messages today
   - Click card → navigates to that platform's bots filtered view
   - Mock data: 4 connected, 1 warning, 2 disconnected

2. **StatsRow** — 4 key metric cards
   - Total Messages (with % change), Active Campaigns, Response Rate, New Leads
   - Each card: icon, 3xl value, label, change badge (green/red/neutral)

3. **MessageVolumeChart** — 7-day bar chart (reuse existing component)
   - Fix CR-01: use flat array not `data.data`
   - Add date range toggle: 7d / 30d / 90d

4. **PlatformBreakdownChart** — Pie/donut chart by platform
   - Shows message distribution across 7 platforms
   - Legend with platform colors

5. **RecentActivityFeed** — Last 10 events
   - Each row: type icon (message/campaign/lead/bot), title, description, time, platform badge
   - Scrollable, max-h-80

6. **QuickActions** — 3 action cards
   - "New Campaign" → /campaigns, "View Analytics" → /analytics, "Add Bot" → /bots

7. **PlatformPerformanceTable** — Table with per-platform metrics
   - Columns: Platform, Messages, Response Rate, Avg Response Time, Status
   - Sortable headers, hover rows

**Tabs:** None (single view)
**Dead code to remove:** All local mock arrays, replace with `analyticsApi` calls

---

### P02 — Bots Page (Enhance Existing)

**File:** `frontend/src/pages/BotsPage.tsx`
**Current state:** Functional but has stale 1-bot limit, alert() dialogs, missing platform filtering
**Action button:** "Add Bot" → opens BotSetupModal

**Components to build/fix:**

1. **PlatformFilterBar** — Row of 7 platform filter pills
   - Each pill: platform icon + name, active state, count badge
   - "All" pill selected by default
   - Filters bot grid by platform

2. **BotCard** (enhance existing) — Add platform indicator
   - Add platform icon/badge to each card (WhatsApp, Telegram, etc.)
   - Add platform-specific status (WhatsApp: QR needed, Telegram: webhook status)
   - Remove stale 1-bot limit (CR-05)

3. **BotSetupModal** (enhance existing) — Multi-platform setup
   - Add platform selector step (Step 1: choose platform)
   - WhatsApp: QR code flow (existing)
   - Telegram: Bot token input + webhook setup
   - Other platforms: API key/secret inputs
   - Remove `alert()` calls, use toasts (CR-06, CR-07)

4. **BotStatsSummary** — 3 summary cards above grid
   - Total Bots, Active Connections, Messages Today (across all bots)

5. **Empty state** — When no bots exist
   - Illustration, "Create your first bot" CTA, platform quick-start cards

**Tabs:** None (single view with platform filter)

---

### P03 — Conversations Page (Enhance Existing)

**File:** `frontend/src/pages/ConversationsPage.tsx`
**Current state:** Basic list + thread, no platform filtering, no search
**Action button:** None

**Components to build/fix:**

1. **ConversationList** (enhance existing) — Left panel
   - Add search bar at top (by contact name, phone, email)
   - Add platform filter tabs (All, WhatsApp, Telegram, Instagram, etc.)
   - Each conversation row: avatar, contact name, platform icon, last message preview, timestamp, unread badge
   - Sortable: Recent, Unread, Platform

2. **MessageThread** (enhance existing) — Right panel
   - Fix: proper message bubbles (sent = right/blue, received = left/gray)
   - Add: message status indicators (sent, delivered, read — checkmarks)
   - Add: timestamp on each message
   - Add: platform-specific message types (WhatsApp: voice/location/contact, Telegram: stickers/polls)
   - Add: attachment preview (images inline, docs as cards)
   - Add: typing indicator animation

3. **ConversationHeader** — Top bar of thread panel
   - Contact name, phone, platform badge, status (online/offline)
   - Action buttons: View Lead, Block, Archive

4. **MessageComposer** — Bottom of thread panel
   - Text input with placeholder "Type a message..."
   - Send button (Heroicon `PaperAirplaneIcon`)
   - Attachment button (paperclip icon) — placeholder for future
   - Quick reply buttons (if AI suggests responses)

5. **ConversationEmptyState** — When no conversation selected
   - "Select a conversation" message with icon

**Tabs:** Platform filter tabs in conversation list

---

### P04 — Campaigns Page (Full Build)

**File:** `frontend/src/pages/CampaignsPage.tsx`
**Current state:** Static mock data, console.log handlers, no real functionality
**Action button:** "New Campaign" → opens CreateCampaignModal

**Components to build:**

1. **CampaignStatsRow** — 4 summary cards
   - Total Campaigns, Active, Total Sent, Avg Open Rate

2. **CampaignFilterBar** — Filters row
   - Status filter pills: All, Draft, Active, Paused, Completed
   - Platform filter dropdown
   - Search input

3. **CampaignTable** — Main data table
   - Columns: Campaign name, Status badge, Platform icon, Sent, Opened, Clicked, Open rate %, Created date, Actions (View/Edit/Pause/Delete)
   - Sortable columns
   - Row click → opens campaign detail

4. **CreateCampaignModal** — Multi-step modal
   - Step 1: Name, Description, Platform selector (7 platforms)
   - Step 2: Audience — select contacts segment or tags
   - Step 3: Message — compose message template with variables ({{name}}, {{company}})
   - Step 4: Schedule — send now or schedule date/time
   - Step 5: Review & Confirm
   - Buttons: Back, Next, Launch Campaign

5. **CampaignDetailPanel** — Slide-over panel
   - Campaign info, message preview, audience count, schedule
   - Performance stats (sent, delivered, opened, clicked)
   - Action buttons: Edit, Pause/Resume, Duplicate, Delete

6. **CampaignEmptyState** — No campaigns yet

**Tabs:** Status filter pills

---

### P05 — Contacts Page (Full Build)

**File:** `frontend/src/pages/ContactsPage.tsx`
**Current state:** Stub with console.log handlers
**Action button:** "Add Contact" → opens AddContactModal

**Components to build:**

1. **ContactStatsRow** — 4 summary cards
   - Total Contacts, New This Week, By Platform (WhatsApp count, Telegram count, etc.)

2. **ContactFilterBar** — Filters row
   - Search input (name, phone, email)
   - Platform filter dropdown
   - Tag filter (multi-select)
   - Segment filter dropdown
   - Sort: Name, Date Added, Last Activity

3. **ContactTable** — Main data table
   - Columns: Avatar+Name, Phone, Email, Platform, Tags (badges), Last Activity, Actions (View/Edit/Delete)
   - Selectable rows for bulk actions
   - Row click → opens contact detail

4. **AddContactModal** — Form modal
   - Fields: Name, Phone, Email, Platform, Tags (multi-select), Notes
   - Buttons: Cancel, Save

5. **ContactDetailPanel** — Slide-over panel
   - Contact info card (name, phone, email, platform, tags, notes)
   - Conversation history tab (list of past conversations)
   - Activity timeline tab (messages, campaigns, status changes)
   - Lead status (if linked to a lead)
   - Action buttons: Edit, Delete, Start Conversation, Convert to Lead

6. **BulkActionsBar** — Appears when rows selected
   - Actions: Tag, Delete, Export, Add to Campaign

7. **ContactEmptyState** — No contacts yet

**Tabs:** All / WhatsApp / Telegram / Instagram / Facebook / Discord / SMS / Email

---

## Wave 2: Supporting Pages (8 pages, 8 plans)

### P06 — Leads Page (Enhance Existing)

**File:** `frontend/src/pages/LeadsPage.tsx`
**Current state:** Functional with filters and detail, but uses `any` types and mock data mixing
**Action button:** "Add Lead" → opens AddLeadModal

**Components to fix/build:**

1. **LeadFilters** (enhance existing) — Add platform filter, source filter, date range
2. **LeadTable** (enhance existing) — Fix `any` types, add platform column, add bulk select
3. **LeadDetail** (enhance existing) — Add tabs: Overview, Conversations, Activity, Notes
4. **AddLeadModal** — Form: Name, Phone, Email, Source, Platform, Tags
5. **LeadStatsRow** — Total Leads, New Today, By Status (New/Contacted/Qualified/Converted/Lost)
6. **KanbanView** — Toggle between table and kanban board view by status

**Tabs:** Table view / Kanban view toggle

---

### P07 — Analytics Page (Fix & Enhance)

**File:** `frontend/src/pages/AnalyticsPage.tsx`
**Current state:** Charts broken (CR-01, CR-02), basic layout
**Action button:** "Export Report" → downloads CSV

**Components to fix/build:**

1. **DateRangeSelector** (enhance existing) — Add custom date picker
2. **StatsCards** — Fix data access pattern (CR-01)
3. **MessageVolumeChart** (fix) — Use flat array, add platform breakdown toggle
4. **ConversionFunnel** (fix) — Use flat array (CR-02)
5. **PlatformBreakdownChart** — New: pie chart by platform
6. **ResponseTimeChart** — New: line chart of avg response time over time
7. **AIUsageChart** — New: AI token usage over time
8. **TopPerformingBots** — New: table of bots ranked by message volume
9. **ExportButton** — Download analytics as CSV/PDF

**Tabs:** Overview / Messages / AI Usage / Performance

---

### P08 — Billing Page (Enhance Existing)

**File:** `frontend/src/pages/BillingPage.tsx`
**Current state:** Basic usage table with month filter
**Action button:** None

**Components to build:**

1. **PlanOverviewCard** — Current plan name, price, billing period, usage limits
2. **UsageSummaryCards** — Messages sent, AI tokens used, Storage used
3. **UsageTrendChart** — Line chart of daily usage over selected month
4. **UsageTable** (enhance existing) — Add platform column, export button
5. **InvoiceList** — Table of past invoices with download links
6. **PlanUpgradeCard** — Upgrade CTA with plan comparison

**Tabs:** Usage / Invoices / Plan

---

### P09 — Integrations Page (Full Rebuild)

**File:** `frontend/src/pages/IntegrationsPage.tsx`
**Current state:** Static mock data with hardcoded integrations
**Action button:** None

**Components to build:**

1. **PlatformConnectionCards** — 7 platform cards (WhatsApp, Telegram, Instagram, Facebook, Discord, SMS, Email)
   - Each: icon, name, status (connected/available/error), connection details
   - Connected: show connected account, disconnect button
   - Available: "Connect" button → opens ConnectModal
   - Error: retry button, error message

2. **ConnectPlatformModal** — Multi-step connection wizard
   - Platform-specific fields:
     - WhatsApp: Evolution API URL + API Key + Secret
     - Telegram: Bot Token + Webhook URL (auto-generated)
     - Instagram: Meta Business login flow
     - Facebook: Meta Business login flow
     - Discord: Bot Token + Guild ID
     - SMS/Twilio: Account SID + Auth Token + Phone Number
     - Email/SMTP: Host + Port + Username + Password
   - Test Connection button
   - Save & Activate

3. **WebhookConfigSection** — Webhook URLs for each platform
   - Display webhook URL (copyable)
   - Secret key (masked, reveal button)
   - Test webhook button

4. **APIKeysSection** — Manage API keys
   - List of keys with name, created date, last used
   - Create new key, revoke key

5. **IntegrationStats** — Total connected, messages per platform, health status

**Tabs:** Platforms / API Keys / Webhooks

---

### P10 — Reports Page (Full Build)

**File:** `frontend/src/pages/ReportsPage.tsx`
**Current state:** Stub with console.log handlers
**Action button:** "Generate Report" → opens ReportBuilder

**Components to build:**

1. **ReportTemplateGallery** — Pre-built report templates
   - Templates: Message Summary, Lead Conversion, Campaign Performance, AI Usage, Platform Comparison
   - Each card: icon, name, description, "Use Template" button

2. **ReportBuilder** — Custom report creation
   - Step 1: Select metrics (messages, leads, campaigns, AI tokens)
   - Step 2: Select dimensions (platform, time, bot, campaign)
   - Step 3: Select date range
   - Step 4: Preview & Generate

3. **ReportPreview** — Table/chart preview of report data
   - Toggle between table and chart view

4. **SavedReportsList** — Previously generated reports
   - Each row: name, type, date generated, actions (View, Download, Delete)

5. **ExportOptions** — Download as CSV, PDF, or JSON

**Tabs:** Templates / My Reports / Builder

---

### P11 — Team Page (Full Build)

**File:** `frontend/src/pages/TeamPage.tsx`
**Current state:** Stub with console.log handlers
**Action button:** "Invite Member" → opens InviteModal

**Components to build:**

1. **TeamStatsRow** — Total Members, Active, By Role (Admin/Agent/Viewer)

2. **MemberTable** — Team members list
   - Columns: Avatar, Name, Email, Role badge, Status (active/invited/inactive), Last Active, Actions (Edit/Remove)
   - Role badges: Admin (red), Agent (blue), Viewer (gray)

3. **InviteMemberModal** — Form: Email, Role selector, Personal message
   - Send Invite button

4. **RoleManagement** — Role permissions matrix
   - Table: Permission / Admin / Agent / Viewer
   - Permissions: Manage Bots, Send Messages, View Analytics, Manage Team, Billing Access, API Access

5. **ActivityLog** — Recent team activity
   - Each row: member avatar, action, timestamp, details

6. **TeamEmptyState** — "Invite your first team member"

**Tabs:** Members / Roles / Activity

---

### P12 — Settings Page (Full Build)

**File:** `frontend/src/pages/SettingsPage.tsx`
**Current state:** Has tabs but all buttons non-functional, toggles have no state
**Action button:** None

**Components to build/fix:**

1. **ProfileTab** (fix existing)
   - Form: Full Name, Email, Company, Avatar upload
   - Save button → toast confirmation
   - State management for all fields

2. **AccountTab** (fix existing)
   - Change Password form (current, new, confirm)
   - Two-Factor Authentication toggle (with setup flow)
   - Sessions list (active sessions with revoke)
   - Danger Zone: Delete Account (confirmation modal)

3. **NotificationsTab** (fix existing)
   - Toggle switches with proper state and `aria-checked`
   - Categories: Email notifications, Push notifications, Weekly reports, Marketing emails, Campaign alerts, Lead alerts
   - Save button

4. **APIKeysTab** (fix existing)
   - List of API keys: Name, Key (masked), Created, Last Used, Actions (Copy, Revoke)
   - Create New Key button → modal with key name input
   - Show full key once on creation (copy button)

5. **PlatformDefaultsTab** — New tab
   - Default AI model selector (dropdown)
   - Default system prompt template
   - Default language
   - Timezone selector

6. **BillingTab** — Link to /billing page, current plan summary

**Tabs:** Profile / Account / Notifications / API Keys / Platform Defaults

---

### P13 — Onboarding Page (Fix & Enhance)

**File:** `frontend/src/pages/OnboardingPage.tsx`
**Current state:** Has OnboardingWizard but it imports mockBotApi directly (CR-04)
**Action button:** None

**Components to fix/build:**

1. **OnboardingWizard** (fix CR-04) — Use `botApi` not `mockBotApi`
   - Step 1: Welcome + Company info
   - Step 2: Choose platform (7 platform cards)
   - Step 3: Platform-specific setup (WhatsApp QR / Telegram token / etc.)
   - Step 4: AI Configuration (model, system prompt)
   - Step 5: Test conversation
   - Step 6: Go Live

2. **PlatformSelector** — 7 platform cards with icons, descriptions
   - Single select, visual feedback

3. **AIConfigStep** — Model dropdown, system prompt textarea, temperature slider

4. **TestConversation** — Simulated chat interface
   - Send test message, see AI response
   - "Looks good" / "Adjust settings" buttons

5. **ProgressIndicator** — Step indicator (1-6) with completed/active/pending states

**Tabs:** Wizard steps (not traditional tabs)

---

## Shared Components (build once, use everywhere)

### S01 — Shared UI Components

1. **PageLayout** — Extract hero section into reusable component
   - Props: title, subtitle, actionButton, children
   - Enforces consistent hero height, gradients, nav

2. **StatsCard** — Reusable metric card
   - Props: icon, value, label, change, changeType

3. **DataTable** — Reusable table with sortable headers, row selection, hover states
   - Props: columns, data, onRowClick, selectable, bulkActions

4. **FilterBar** — Reusable filter row
   - Props: search, filters (dropdowns), status pills

5. **EmptyState** — Reusable empty state
   - Props: icon, title, description, actionButton

6. **Modal** — Reusable modal wrapper
   - Props: isOpen, onClose, title, children, size
   - Consistent styling matching BotSetupModal

7. **SlideOverPanel** — Reusable slide-over for detail views
   - Props: isOpen, onClose, title, children

8. **StatusBadge** — Reusable status badge
   - Props: status, size
   - Consistent colors for connected/disconnected/warning/draft/active/paused/completed

9. **PlatformIcon** — Platform icon component
   - Props: platform, size
   - Returns correct icon/color for each of 7 platforms

10. **ConfirmDialog** — Replace all `confirm()` calls
    - Props: isOpen, title, message, onConfirm, onCancel, variant (danger/warning/info)

---

## Execution Strategy

**Wave 1** (5 plans, 5 agents in parallel):
- Agent 1: P01 Dashboard + S01 shared components
- Agent 2: P02 Bots + P03 Conversations
- Agent 3: P04 Campaigns
- Agent 4: P05 Contacts
- Agent 5: S01 shared components (runs first, others import from it)

Actually: S01 must build first (Wave 0), then 5 parallel agents for P01-P05.

**Wave 0** (prerequisite): Build S01 shared components
**Wave 1** (5 parallel agents): Dashboard, Bots+Conversations, Campaigns, Contacts, Leads
**Wave 2** (5 parallel agents): Analytics, Billing, Integrations, Reports+Team, Settings+Onboarding

**Total:** 13 plans across 3 waves (0, 1, 2)
**Estimated components:** ~60 components across 13 pages + 10 shared

---

## Success Criteria

- [ ] All 13 pages have fully functional UI with mock data
- [ ] Consistent hero layout on every page
- [ ] 7 platforms represented with icons, colors, filtering
- [ ] Zero `alert()` or `confirm()` calls — all replaced with toasts/modals
- [ ] Zero `console.log` handlers — all buttons have real handlers or "Coming Soon" toasts
- [ ] Zero dead code files
- [ ] All `any` types replaced with proper interfaces
- [ ] All forms have state management and validation
- [ ] All modals open/close properly
- [ ] All tables are sortable and filterable
- [ ] All charts render correctly (fix CR-01, CR-02)
- [ ] OnboardingWizard uses real API layer (fix CR-04)
- [ ] No hardcoded API keys in bundle (fix CR-03)
