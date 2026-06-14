# Phase 5: Frontend Component Rebuild

**Goal:** Build every frontend page with complete component trees, all tabs, buttons, interactions, and 7-platform support. Mock data only — backend connection later.

**Mode:** 2 waves, parallel agents per wave.

---

## Architecture Notes

- **UI Framework:** React 19 + TypeScript + Tailwind CSS + Radix UI + shadcn/ui
- **Routing:** React Router v7
- **Charts:** Recharts
- **Icons:** Lucide React
- **State:** Local state + mock services (no Redux/Zustand yet)
- **Mock Data:** `src/services/mockData.ts` + `src/services/mockApi.ts`
- **7 Platforms:** WhatsApp, Telegram, Discord, FB Messenger, Instagram, MS Teams, Twitter/X
- **Auth:** JWT tokens, stored in localStorage, auth context provider
- **Shared Layout:** Sidebar (8 items) + TopBar + main content area

---

## Wave 1: Core Pages (4 pages, 6 agents)

### Plan 1: Dashboard + Login/Register + Auth Provider

**Files:**
- `src/contexts/AuthContext.tsx` — NEW (auth state, login/logout, JWT storage)
- `src/components/auth/ProtectedRoute.tsx` — NEW (redirect to /login if no JWT)
- `src/pages/LoginPage.tsx` — NEW
- `src/pages/RegisterPage.tsx` — NEW
- `src/pages/DashboardPage.tsx` — REWRITE
- `src/components/dashboard/KPICard.tsx` — NEW
- `src/components/dashboard/ActivityFeed.tsx` — NEW
- `src/components/dashboard/LeadPipelineFunnel.tsx` — NEW
- `src/components/dashboard/BotHealthGrid.tsx` — NEW
- `src/components/dashboard/MessagesOverTimeChart.tsx` — NEW
- `src/components/dashboard/PlatformBreakdown.tsx` — NEW (7-platform pie chart)
- `src/components/layout/AppLayout.tsx` — NEW (sidebar + topbar + outlet)
- `src/components/layout/Sidebar.tsx` — REWRITE (collapsible, badges, platform indicators)
- `src/components/layout/TopBar.tsx` — REWRITE (search, notifications, user menu)
- `src/App.tsx` — REWRITE (add auth routes, protected layout)

**LoginPage components:**
- Email input, Password input
- "Remember me" checkbox
- "Forgot password?" link
- Login button → POST /api/auth/login
- "Create account" link → /register
- Error display for invalid credentials

**RegisterPage components:**
- Company name, Email, Password, Confirm Password
- Password strength indicator
- Terms checkbox
- Register button → POST /api/auth/register
- "Already have account?" link → /login

**DashboardPage components:**
- 6 KPI cards: Active Bots, Open Conversations, New Leads (7d), Conversion Rate, Messages Today, Active Workflows
- Each KPI card: icon, value, label, trend arrow (+/- %), click drills to relevant page
- Activity Feed: chronological events (new lead, message, workflow completed, bot connected)
- Lead Pipeline Funnel: horizontal bars (new → contacted → qualified → converted)
- Bot Health Grid: mini cards per bot with status dot, last message time, platform icon
- Messages Over Time: Recharts line chart (inbound vs outbound, 7d/30d toggle)
- Platform Breakdown: pie chart showing message volume per platform

---

### Plan 2: Bots Page (7-platform management)

**Files:**
- `src/pages/BotsPage.tsx` — REWRITE
- `src/components/bots/BotCard.tsx` — REWRITE (platform icon, status, metrics)
- `src/components/bots/BotGrid.tsx` — NEW (filterable grid)
- `src/components/bots/AddBotModal.tsx` — REWRITE (platform selector, credential fields)
- `src/components/bots/BotDetailPanel.tsx` — NEW (slide-over with full config)
- `src/components/bots/BotConfigForm.tsx` — NEW (system prompt, AI model, temperature)
- `src/components/bots/BotAnalytics.tsx` — NEW (per-bot metrics)
- `src/components/bots/BotConnectionStatus.tsx` — NEW (platform-specific connection state)
- `src/components/bots/PlatformSelector.tsx` — NEW (7-platform grid with icons)
- `src/components/bots/QRCodeModal.tsx` — REWRITE (WhatsApp-specific)
- `src/components/bots/BulkActions.tsx` — NEW (select all, delete selected, stop selected)

**BotCard components:**
- Platform icon (colored per platform)
- Bot name + status badge (Connected/Disconnected/Error)
- Phone/username display
- AI engine badge (Groq/OpenAI/Gemini)
- Active leads count
- Messages today count
- Quick actions: Edit, Start/Stop, Delete

**AddBotModal components:**
- Step 1: Platform selector (7 cards with platform logos)
- Step 2: Platform-specific credentials
  - WhatsApp: Evolution API instance name, API key
  - Telegram: Bot token (from @BotFather)
  - Discord: Bot token, guild ID
  - FB Messenger: Page token, verify token
  - Instagram: Page token
  - MS Teams: App ID, app password, tenant ID
  - Twitter/X: API key, API secret, bearer token
- Step 3: Bot config (name, system prompt, AI model)
- Step 4: Test connection → show success/failure

**BotDetailPanel components:**
- Tabs: Overview, Configuration, Analytics, Conversations, Leads
- Overview: connection info, uptime, platform-specific details
- Configuration: editable system prompt, AI model, temperature, max tokens
- Analytics: messages/day chart, response time, lead conversion
- Conversations: list of conversations for this bot
- Leads: list of leads captured by this bot

---

### Plan 3: Conversations Page (3-panel inbox)

**Files:**
- `src/pages/ConversationsPage.tsx` — REWRITE (3-panel layout)
- `src/components/conversations/ConversationList.tsx` — REWRITE (search, filter tabs, platform badges)
- `src/components/conversations/ConversationListItem.tsx` — NEW (avatar, name, preview, timestamp, unread)
- `src/components/conversations/MessageThread.tsx` — REWRITE (bubbles, timestamps, auto-scroll)
- `src/components/conversations/MessageBubble.tsx` — NEW (inbound/outbound styling, media types)
- `src/components/conversations/MessageInput.tsx` — NEW (text, attach, emoji, quick replies, send)
- `src/components/conversations/ContactSidebar.tsx` — NEW (lead info, status, attributes, notes)
- `src/components/conversations/QuickReplyPicker.tsx` — NEW (template dropdown)
- `src/components/conversations/MediaPreview.tsx` — NEW (image lightbox, audio player, document link)
- `src/components/conversations/TypingIndicator.tsx` — NEW ("AI is typing...")
- `src/components/conversations/PlatformBadge.tsx` — NEW (colored platform icon per conversation)

**ConversationList components:**
- Search bar (name, phone, message content)
- Filter tabs: All / Open / Closed / Unread
- Platform filter dropdown (7 platforms)
- Conversation rows with: avatar/initials, name, platform icon, last message preview, timestamp, unread badge, status dot (green=open, gray=closed)

**MessageThread components:**
- Header: contact name, phone, platform badge, lead status badge, linked bot name
- Message bubbles: outbound (right, green), inbound (left, dark)
- Timestamp separators between message groups
- Message types: text, image thumbnail, audio player, document link, location map
- Auto-scroll to bottom on new messages
- Typing indicator

**MessageInput components:**
- Text area (Enter to send, Shift+Enter for newline)
- Attach media button (image, audio, document, location)
- Emoji picker (basic)
- Quick reply templates dropdown
- Send button
- Toggle: "Bot auto-reply ON/OFF"

**ContactSidebar components:**
- Lead info: name, phone, email, source, status
- Quick status change dropdown (new → contacted → qualified → converted)
- Attributes list (key-value pairs, add/edit/delete)
- Active workflow indicator
- Conversation metadata: platform, created date, message count
- "Assign to agent" button
- Notes section (add/view notes)

---

### Plan 4: Leads Page (table + kanban + detail)

**Files:**
- `src/pages/LeadsPage.tsx` — REWRITE (view toggle, filters, table/kanban)
- `src/components/leads/LeadTable.tsx` — REWRITE (sortable, paginated, bulk select)
- `src/components/leads/LeadKanban.tsx` — NEW (drag-and-drop columns)
- `src/components/leads/KanbanColumn.tsx` — NEW (status column with cards)
- `src/components/leads/KanbanCard.tsx` — NEW (compact lead card)
- `src/components/leads/LeadDetail.tsx` — REWRITE (slide-over with tabs)
- `src/components/leads/LeadDetailTabs.tsx` — NEW (Overview, Timeline, Notes, AI Score)
- `src/components/leads/LeadFilters.tsx` — REWRITE (status, source, bot, date range, search)
- `src/components/leads/LeadImportModal.tsx` — NEW (CSV upload)
- `src/components/leads/LeadExportButton.tsx` — NEW (CSV/JSON export)
- `src/components/leads/AddLeadModal.tsx` — NEW (manual lead creation)
- `src/components/leads/BulkActions.tsx` — NEW (export, delete, assign, tag)

**LeadTable components:**
- Sortable columns: Name, Phone, Source, Status, Bot, Platform, Created, Last Activity
- Row checkbox for bulk select
- Pagination (10/25/50 per page)
- Click row → open LeadDetail slide-over
- Status badge (colored per status)
- Source badge (platform icon)

**LeadKanban components:**
- 5 columns: New, Contacted, Qualified, Converted, Lost
- Drag-and-drop cards between columns (change status)
- Cards show: name, phone, source badge, bot name
- Card count per column
- Click card → open LeadDetail

**LeadDetail slide-over tabs:**
- Overview: contact info, status dropdown, attributes editor, linked bot + conversation
- Timeline: every touchpoint (messages, status changes, workflow events)
- Notes: agent notes with timestamps, add new note
- AI Score: score, reasoning, recommendations (if qualifier bot ran)

---

## Wave 2: Supporting Pages (10 pages, 5 agents)

### Plan 5: Workflows Page

**Files:**
- `src/pages/WorkflowsPage.tsx` — NEW (list + builder)
- `src/components/workflows/WorkflowCard.tsx` — NEW
- `src/components/workflows/WorkflowBuilder.tsx` — NEW (step editor)
- `src/components/workflows/WorkflowStepEditor.tsx` — NEW
- `src/components/workflows/WorkflowTriggerConfig.tsx` — NEW
- `src/components/workflows/ExecutionMonitor.tsx` — NEW

**WorkflowCard:** name, trigger type, step count, active executions, actions (edit, duplicate, delete, run log)
**WorkflowBuilder:** vertical timeline of steps, drag to reorder, add/remove steps, condition branching
**WorkflowStepEditor:** step key, prompt text, expected input type, conditions
**WorkflowTriggerConfig:** trigger type (keyword/intent/manual/new_conversation), keywords, bot assignment, fallback
**ExecutionMonitor:** table of executions (lead name, current step, status, started, duration), click to see collected data, retry/cancel/reset

---

### Plan 6: Contacts + Campaigns Pages

**Files:**
- `src/pages/ContactsPage.tsx` — REWRITE
- `src/components/contacts/ContactTable.tsx` — NEW
- `src/components/contacts/ContactDetail.tsx` — NEW
- `src/components/contacts/ContactImportModal.tsx` — NEW
- `src/pages/CampaignsPage.tsx` — REWRITE
- `src/components/campaigns/CampaignCard.tsx` — NEW
- `src/components/campaigns/CampaignBuilder.tsx` — NEW

**ContactTable:** searchable, filterable by tags, bulk operations (tag, export, delete)
**ContactDetail:** full info, conversation history across all bots, lead link, custom fields, notes
**CampaignCard:** name, status, target audience, scheduled date, sent count
**CampaignBuilder:** message template, target filters, schedule, platform selector

---

### Plan 7: Analytics Page

**Files:**
- `src/pages/AnalyticsPage.tsx` — REWRITE
- `src/components/analytics/MessagingMetrics.tsx` — NEW
- `src/components/analytics/LeadMetrics.tsx` — NEW
- `src/components/analytics/AIPerformance.tsx` — NEW
- `src/components/analytics/BotPerformance.tsx` — NEW
- `src/components/analytics/DateRangePicker.tsx` — NEW
- `src/components/analytics/ChartCard.tsx` — NEW (reusable card with title, controls, chart)
- `src/components/analytics/HeatmapChart.tsx` — NEW (busiest hours)
- `src/components/analytics/ExportButton.tsx` — NEW (PNG/CSV)

**Page tabs:** Messaging, Leads, AI Performance, Bots
**Messaging tab:** messages over time (line), messages by bot (stacked bar), avg response time, busiest hours heatmap
**Leads tab:** leads over time (line), pipeline funnel, conversion rate by bot, source breakdown (pie), avg time to conversion
**AI tab:** token usage over time, cost by model, workflow completion rate, fallback/escalation rate
**Bots tab:** uptime per bot, conversations per bot, leads per bot, error rate
**Controls:** date range picker (7d/30d/90d/custom), bot filter, export buttons

---

### Plan 8: Settings Page (6 tabs)

**Files:**
- `src/pages/SettingsPage.tsx` — REWRITE (tabbed layout)
- `src/components/settings/GeneralTab.tsx` — NEW
- `src/components/settings/TeamTab.tsx` — NEW
- `src/components/settings/APIKeysTab.tsx` — NEW
- `src/components/settings/IntegrationsTab.tsx` — NEW
- `src/components/settings/BillingTab.tsx` — NEW
- `src/components/settings/DangerZoneTab.tsx` — NEW

**General tab:** tenant name, default AI model dropdown, default system prompt, timezone, language
**Team tab:** user list (email, role, status, last active), invite user (email + role), change role, remove user
**APIKeys tab:** key list (name, created, last used), generate new key (show once, copy), revoke key
**Integrations tab:** 7 platform configs (API keys, webhook URLs), AI provider keys (Groq/OpenAI/Gemini), webhook URL
**Billing tab:** current plan, usage meters (messages, AI tokens, storage), invoices, upgrade/downgrade
**DangerZone tab:** delete tenant (type confirm), export all data

---

### Plan 9: Billing + Reports + Team + Integrations Pages

**Files:**
- `src/pages/BillingPage.tsx` — REWRITE
- `src/components/billing/PlanCard.tsx` — NEW
- `src/components/billing/UsageChart.tsx` — NEW
- `src/components/billing/InvoiceTable.tsx` — NEW
- `src/pages/ReportsPage.tsx` — REWRITE
- `src/components/reports/ReportTemplateCard.tsx` — NEW
- `src/components/reports/ReportBuilder.tsx` — NEW
- `src/pages/TeamPage.tsx` — REWRITE
- `src/components/team/MemberCard.tsx` — NEW
- `src/components/team/InviteModal.tsx` — NEW
- `src/pages/IntegrationsPage.tsx` — REWRITE
- `src/components/integrations/PlatformCard.tsx` — NEW (7 platform cards)
- `src/components/integrations/IntegrationConfigModal.tsx` — NEW

**PlanCard:** plan name, price, features list, current/upgrade button
**UsageChart:** messages, AI tokens, storage over time
**InvoiceTable:** date, amount, status, download
**ReportTemplateCard:** template name, description, preview
**PlatformCard:** platform logo, name, connection status, configure button, connect/disconnect toggle
**IntegrationConfigModal:** platform-specific credential fields, test connection button

---

### Plan 10: Onboarding Page

**Files:**
- `src/pages/OnboardingPage.tsx` — REWRITE
- `src/components/onboarding/OnboardingWizard.tsx` — REWRITE (5 steps)
- `src/components/onboarding/WelcomeStep.tsx` — NEW
- `src/components/onboarding/PlatformStep.tsx` — NEW
- `src/components/onboarding/BotStep.tsx` — NEW
- `src/components/onboarding/WorkflowStep.tsx` — NEW
- `src/components/onboarding/CompleteStep.tsx` — NEW

**Steps:**
1. Welcome: company name, logo upload
2. Platform: select primary platform (7 choices), enter credentials
3. Bot: configure first bot (name, system prompt, AI model)
4. Workflow: optionally create first workflow (or skip)
5. Complete: success message, link to Dashboard

---

## Execution Plan

### Wave 1 (6 agents, parallel)
| Agent | Pages | Est. Components |
|-------|-------|-----------------|
| 1 | Dashboard + Login/Register + Auth + Layout | 15 files |
| 2 | Bots (7-platform) | 11 files |
| 3 | Conversations (3-panel inbox) | 11 files |
| 4 | Leads (table + kanban + detail) | 12 files |

### Wave 2 (5 agents, parallel)
| Agent | Pages | Est. Components |
|-------|-------|-----------------|
| 5 | Workflows | 6 files |
| 6 | Contacts + Campaigns | 8 files |
| 7 | Analytics | 8 files |
| 8 | Settings (6 tabs) | 7 files |
| 9 | Billing + Reports + Team + Integrations | 12 files |
| 10 | Onboarding | 6 files |

### Total: ~96 component files across 14 pages

---

## Success Criteria

- [ ] All 14 pages have complete component trees
- [ ] Every page works with mock data (no backend required)
- [ ] 7 platforms represented in all platform-aware components
- [ ] Sidebar navigation works with badges
- [ ] Login/Register flow works (JWT stored in localStorage)
- [ ] All modals, slide-overs, and tabs functional
- [ ] Responsive layout (works on desktop + tablet)
- [ ] Consistent design system (Tailwind + Radix + shadcn patterns)
