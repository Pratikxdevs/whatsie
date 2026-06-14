# Phase 3 Frontend: Unified Page Layout

**Phase:** 3 — Platform Expansion & Product UI (Frontend Completion)
**Created:** 2026-05-20
**Total Plans:** 5
**Mode:** default

---

## Overview

Complete the frontend pages from Phase 3 with a unified layout design. All pages will use the same hero section, gradient effects, and NavBar component as BotsPage and DashboardPage for visual consistency across the CRM platform.

---

## Current State

**Existing Pages:**
- BotsPage ✓ - Hero section + NavBar (reference design)
- DashboardPage ✓ - Hero section + NavBar (reference design)
- LeadsPage ✗ - Uses TopBar, simple layout
- AnalyticsPage ✗ - Uses TopBar, simple layout
- BillingPage ✗ - Uses TopBar, simple layout
- ConversationsPage ✗ - Uses TopBar, simple layout
- OnboardingPage ✗ - Minimal, needs hero section

**Target State:**
All pages use:
- Hero section with background image and gradient overlays
- NavBar component for navigation
- Consistent spacing (px-6 md:px-12 lg:px-16)
- CursorCard components for interactive elements
- Dark theme (#09090b background)

---

## Plan 1: Leads Page Redesign

```yaml
phase: 3-frontend
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/pages/LeadsPage.tsx
autonomous: true
requirements: [UI-01]
```

**Objective:** Update LeadsPage to use hero section layout matching BotsPage design.

**Changes:**
1. Replace TopBar import with NavBar
2. Add hero section with "LEADS" title
3. Update subtitle: "Manage and track your leads across all platforms"
4. Move existing content (filters, table, detail panel) into main content area
5. Apply consistent spacing and styling

**Layout Structure:**
```
[Hero Section]
  - Background image with gradients
  - NavBar
  - "LEADS" title
  - Subtitle
[Main Content]
  - LeadFilters
  - LeadTable (in CursorCard wrapper)
  - LeadDetail modal
```

---

## Plan 2: Analytics Page Redesign

```yaml
phase: 3-frontend
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/pages/AnalyticsPage.tsx
autonomous: true
requirements: [UI-02]
```

**Objective:** Update AnalyticsPage to use hero section layout matching BotsPage design.

**Changes:**
1. Replace TopBar import with NavBar
2. Add hero section with "ANALYTICS" title
3. Update subtitle: "Track performance metrics and conversion insights"
4. Wrap stat cards in CursorCard components
5. Wrap charts in CursorCard components
6. Apply consistent spacing and styling

**Layout Structure:**
```
[Hero Section]
  - Background image with gradients
  - NavBar
  - "ANALYTICS" title
  - Subtitle
[Main Content]
  - Stats cards row (4 cards in CursorCardsContainer)
  - Date range selector
  - Charts grid (MessageVolume, ConversionFunnel in CursorCards)
```

---

## Plan 3: Billing Page Redesign

```yaml
phase: 3-frontend
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/pages/BillingPage.tsx
autonomous: true
requirements: [UI-03]
```

**Objective:** Update BillingPage to use hero section layout matching BotsPage design.

**Changes:**
1. Replace TopBar import with NavBar
2. Add hero section with "BILLING" title
3. Update subtitle: "Monitor usage and manage your subscription"
4. Wrap usage stats in CursorCard components
5. Apply consistent spacing and styling

**Layout Structure:**
```
[Hero Section]
  - Background image with gradients
  - NavBar
  - "BILLING" title
  - Subtitle
[Main Content]
  - Usage summary cards
  - Usage details table (in CursorCard)
  - Plan information
```

---

## Plan 4: Conversations Page Redesign

```yaml
phase: 3-frontend
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/pages/ConversationsPage.tsx
autonomous: true
requirements: [UI-04]
```

**Objective:** Update ConversationsPage to use hero section layout matching BotsPage design.

**Changes:**
1. Replace TopBar import with NavBar
2. Add hero section with "CONVERSATIONS" title
3. Update subtitle: "View and manage customer conversations across platforms"
4. Apply consistent spacing and styling

**Layout Structure:**
```
[Hero Section]
  - Background image with gradients
  - NavBar
  - "CONVERSATIONS" title
  - Subtitle
[Main Content]
  - Conversation list
  - Message thread view
```

---

## Plan 5: Onboarding Page Redesign

```yaml
phase: 3-frontend
plan: 05
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/pages/OnboardingPage.tsx
autonomous: true
requirements: [UI-05]
```

**Objective:** Update OnboardingPage to use hero section layout matching BotsPage design.

**Changes:**
1. Add hero section with "GET STARTED" title
2. Update subtitle: "Set up your first bot in minutes"
3. Keep wizard steps in main content area
4. Apply consistent spacing and styling

**Layout Structure:**
```
[Hero Section]
  - Background image with gradients
  - "GET STARTED" title
  - Subtitle
[Main Content]
  - Onboarding wizard steps
```

---

## Success Criteria

- [ ] All pages use NavBar component
- [ ] All pages have hero section with background image and gradients
- [ ] Consistent spacing across all pages (px-6 md:px-12 lg:px-16)
- [ ] CursorCard components used for interactive elements
- [ ] Dark theme (#09090b) applied consistently
- [ ] Navigation works between all pages
- [ ] No visual inconsistencies or layout breaks

---

## Dependencies

- NavBar component (already created)
- CursorCardsContainer/CursorCard components (already exist)
- Hero background image (already exists)

---

## Estimated Time

- Plan 1 (Leads): 10-15 min
- Plan 2 (Analytics): 10-15 min
- Plan 3 (Billing): 10-15 min
- Plan 4 (Conversations): 10-15 min
- Plan 5 (Onboarding): 5-10 min

**Total:** 45-70 min
