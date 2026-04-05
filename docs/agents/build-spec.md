# build-spec
# build-spec.md — Project-Specific Configuration
# Version: 1.0
# Scope: Personal OS — this project only
# Location: docs/agents/build-spec.md

# Project Identity
* **Project name:** Personal OS
* **Description:** A markdown-first personal productivity PWA for capturing, processing, writing, and reviewing all areas of life.
* **Type:** PWA
* **Status:** Active build

---

# Stack

### Frontend
* **Framework:** Vite + React
* **Language:** JavaScript
* **Styling:** CSS Modules
* **UI library:** None
* **Animation:** None
* **Forms:** None — plain React state

### Backend / Data
* **Database:** Supabase
* **Local/offline DB:** None — not required for v1
* **Auth:** Supabase Auth
* **Storage:** None for v1

### Infrastructure
* **Deployment:** Vercel
* **CI/CD:** None for v1
* **Email:** None for v1
* **Payments:** None for v1

### Package manager
* **Detected from lockfile:** npm

---

# File Structure
```
src/
├── app/                  # App entry, providers, global setup
├── routes/               # TanStack Router route definitions
│   ├── index.tsx         # Home
│   ├── inbox.tsx         # Inbox
│   ├── items.tsx         # Items list
│   ├── items.$id.tsx     # Item editor
│   ├── templates.tsx     # Template list
│   ├── settings.tsx      # Settings
│   ├── trash.tsx         # Trash
│   ├── auth/
│   │   ├── signin.tsx
│   │   ├── signup.tsx
│   │   ├── forgot.tsx
│   │   └── reset.tsx
├── components/
│   ├── ui/               # Primitive components — Button, Modal, Input
│   ├── layout/           # Nav, FAB, shell, sidebar
│   └── shared/           # CommandSheet, Editor, Backlinks, ItemRow
├── features/
│   ├── capture/          # Quick capture, rapid log
│   ├── inbox/            # Inbox list, processor
│   ├── editor/           # CodeMirror editor, frontmatter parser
│   ├── templates/        # Template management
│   ├── daily/            # Daily note logic
│   └── trash/            # Trash view, restore, permanent delete
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── cuid.ts           # CUID generator
│   ├── frontmatter.ts    # YAML frontmatter parser and serializer
│   └── wikilinks.ts      # Wikilink resolver and backlink queries
├── hooks/                # useItems, useTemplates, useDaily, useInbox
└── styles/
    ├── reset.css
    └── variables.css     # CSS custom properties — spacing, color, type
```

---

# Forbidden (this project)
* No Tailwind
* No shadcn/ui
* No component libraries except CodeMirror
* No auto-save — save is always explicit
* No animations for v1
* No offline support for v1 — do not introduce service workers or IndexedDB
* No social auth providers for v1
* Do not add tables to the database without disclosure and approval

---

# Core Product Rules

* **Primary viewport:** Both mobile and desktop — functionally identical
* **Touch targets:** 44px minimum
* **Offline support:** Not required for v1 — architect to not block future addition
* **Data source of truth:** Supabase
* **UI pattern:** Server-confirmed — no optimistic updates for v1
* **Haptic feedback:** Not required
* **Accessibility standard:** Basic
* **Sync strategy:** Last-write-wins on updated_at

---

# Performance Budgets
* **Initial JS bundle:** Not specified for v1
* **Per-route chunk:** Not specified for v1
* **Target TTI (mobile):** Not specified for v1
* **Dynamic import threshold:** Not specified for v1

---

# Design Constraints
* **Design system / tokens:** src/styles/variables.css
* **Breakpoints:**
  * Mobile: 390px
  * Tablet: 744px
  * Desktop: 1024px
* **Font stack:** System font stack — not yet defined
* **Color palette:** Minimal — defined in variables.css after functionality complete

---

# Database Schema Reference

All tables live in Supabase. Do not add tables without disclosure and approval.

| **Table** | **Purpose** | **Notes** |
|---|---|---|
| items | Every item in the system — notes, tasks, projects, templates, logs, reviews | Primary table. All document types are items. Templates have is_template: true |
| item_history | Full markdown snapshot on every save | change_type: created, updated, trashed, restored |
| habit_logs | Individual habit log entries | Companion table for log: habit items |
| finance_entries | Individual revenue and expense entries | Companion table for log: finance items |
| user_settings | Persisted user preferences | Stores the selected daily note template per user |

### items table columns
```sql
id uuid primary key default gen_random_uuid()
user_id uuid references auth.users(id) on delete cascade
cuid text unique not null
is_template boolean default false
type text
subtype text
title text
filename text
status text
access text default 'private'
area text
workbench boolean default false
resources jsonb default '[]'
dependencies jsonb default '[]'
blocked boolean default false
slug text
published boolean default false
tier text
growth text
rating integer
series text
series_position integer
format text
medium text
genre text
platform text
collection text
source text
chains jsonb default '[]'
manuscript text
project text
principle text
course text
asset_type text
contact_type text
contact_status text
contacted_last date
next_follow_up date
deal_status text
deal_value numeric
institution text
instructor text
url text
isbn text
bookmark boolean default false
repo text
stack jsonb default '[]'
modules jsonb default '[]'
be_and_feel jsonb default '[]'
for_sale boolean default false
price numeric
currency text default 'CHF'
sold boolean default false
exhibited boolean default false
dimensions text
year integer
outcome text
problem text
solution text
delivery text
lag_measure text
lag_target numeric
lag_unit text
lag_actual numeric default 0
score_overall numeric
week text
month text
year_label text
theme text
date_delivered timestamptz
recording_link text
attendees integer default 0
duration_target text
episode integer
season integer
cover_link text
cover_alt_text text
certificate_link text
unit text
target numeric
frequency jsonb default '[]'
total_sent integer default 0
total_comments integer default 0
total_responses integer default 0
currency_primary text default 'CHF'
currency_secondary text default 'USD'
month_revenue_chf numeric default 0
month_expenses_chf numeric default 0
month_profit_chf numeric default 0
date_field date
mood text
chapter_count integer default 0
issue integer
author text
subtitle text
description text
date_start date
date_end date
content text
frontmatter jsonb default '{}'
date_created timestamptz
date_modified timestamptz
date_trashed timestamptz
tags jsonb default '[]'
created_at timestamptz default now()
updated_at timestamptz default now()
```

---

# Navigation and Routing

* **Router:** TanStack Router
* **Top-level routes:**
  * / — Home (daily note, inbox count, workbench)
  * /inbox — Unprocessed inbox items
  * /items — All items, filterable and searchable
  * /items/$id — Item editor
  * /templates — Template list and management
  * /settings — Settings, account, shortcuts reference
  * /trash — Trashed items with restore and delete
  * /auth/signin — Sign in
  * /auth/signup — Sign up
  * /auth/forgot — Forgot password
  * /auth/reset — Reset password
* **Navigation pattern:** Bottom tab bar on mobile, sidebar on desktop. FAB fixed bottom center on all screens.
* **Auth-gated routes:** All routes except /auth/*

---

# Environment and Tooling
* **Node version:** 20.x
* **Typecheck command:** N/A — JavaScript project
* **Lint command:** npx eslint src/
* **Test command:** None for v1
* **Build command:** npm run build
* **Dev command:** npm run dev
* **Local dev URL:** http://localhost:5173

---

# Active Sub-Docs
* [ ] docs/agents/architecture.md
* [ ] docs/agents/frontend.md
* [ ] docs/agents/planner.md
* [x] docs/agents/schema-reference.md — complete type map and all templates
* [x] docs/agents/build-spec.md — full feature specification and definition of done

---

# Known Limitations / Technical Debt
* Auth not yet implemented — RLS policies should be set up from day one
* No test suite — add tests as you go
* Offline not supported in v1 — do not make architectural decisions that prevent adding it later
* Content search not implemented — title search only in v1
* Tag filtering UI not implemented — tags stored but no browsing UI in v1
* Export not implemented — noted for future build
* GTD inbox wizard not implemented — basic processor only in v1
* Reader not implemented — noted for future build
* Area view not implemented — areas open as plain items in editor for v1

---

# Core Build Priorities

Build in this exact order. Do not skip ahead.

1. Project scaffold — Vite + React + TanStack Router + TanStack Query + Supabase JS
2. Database migration — all tables, indexes, RLS policies
3. Template seeding — all 31 subtypes seeded as system template records
4. Authentication — sign up, sign in, sign out, reset password
5. Command sheet — FAB, quick capture, rapid log, slash commands, insert template, search
6. Inbox — list view and basic processor
7. Item editor — CodeMirror with wikilink and tag autocomplete
8. Template management — create, edit, delete with confirmation
9. Daily note — open or create from settings-defined template
10. Navigation — home, inbox, items, templates, settings
11. Trash — soft delete, restore, permanent delete with confirmation
12. Backlinks — resolve wikilinks in frontmatter and body, grouped panel
13. Settings — daily note template picker, keyboard shortcuts reference, slash commands reference

---

# Feature Specifications

## Command Sheet

Single most important UI element. Accessible from every screen via FAB tap.

**FAB:**
- Tap → opens command sheet
- Hold → opens type switcher for direct item creation
- Always visible, fixed bottom center
- Content has bottom padding so FAB never obscures content

**Default state:**
- Single autofocused text input at top
- Shows RECENT items below (most recently modified)
- Shows TEMPLATES below recent

**As user types:**
- Real time title search
- Slash command list when input starts with /

**Quick capture:**
- User types and dismisses or hits capture
- First line (max 280 chars) → title
- Overflow → content
- Saves as type: inbox, status: unprocessed
- Returns to previous screen immediately

**Rapid log mode:**
- Toggle inside command sheet
- Input clears after each capture, ready for next
- Each entry saves as separate inbox item
- All land in inbox with status: unprocessed
- Toggle off or close to exit

**Slash commands:**
All 31 subtypes available as slash commands.
Typing / shows full list. Typing /ta filters to matches.
Selecting creates a new item from the matching template.
```
/daily /istikarah /dream /scratch /devlog
/essay /framework /lesson /manuscript /chapter
/comic /poem /story /artwork /case_study
/workshop /script /slip /identity /principle
/directive /source /literature /quote /guide
/offer /asset /software /course /module
/habit /goal /finance /contact /outreach
/weekly /monthly /yearly /area /task /project
```

**Insert template:**
When command sheet opened while editing an item:
- Insert template section appears above Recent
- Selecting appends template body at cursor position
- Like Obsidian "Templates: Insert template"

**Search and open:**
- Typing searches item titles in real time
- Tapping result opens item in editor
- Command sheet closes after selection

---

## Inbox

- Shows all items where type: inbox and status: unprocessed
- No FAB inbox count badge in v1
- Each row shows title or first line and date captured
- Tap to open inbox processor

**Inbox processor:**
- Shows captured title and content
- User can edit title
- User selects type and subtype
- App applies selected template frontmatter
- Sets status: backlog on completion
- Saves and routes to items view

---

## Item Editor

- CodeMirror showing complete raw markdown — frontmatter + body
- Save: Cmd/Ctrl+S and save button in header
- No auto-save
- Every save writes full snapshot to item_history with change_type: updated
- Workbench toggle in editor header
- Frontmatter parsed on save, columns updated in items table
- Unknown frontmatter keys stored in frontmatter jsonb column

**Wikilink autocomplete:**
- Triggers on [[
- Queries item titles in real time
- Works in both frontmatter and body

**Tag autocomplete:**
- Triggers on #
- Queries existing tags
- Tags stored in tags jsonb column
- No tag filtering UI in v1

**Wikilink resolution:**
- Wikilinks in frontmatter and body resolve to tappable links
- Tapping navigates to that item
- Unresolved wikilinks show visual indicator

**Backlinks panel:**
- Below editor on every item
- Grouped by frontmatter property name
- Body wikilinks appear under Mentions

---

## Template Management

- Template list grouped by type
- Tap to open in CodeMirror editor
- Templates without type or subtype group under Misc.
- Create new template opens blank
- Only user-owned templates participate in runtime flows
- Deletion requires typed confirmation text (case-sensitive)

---

## Daily Note

- Home screen shows Open Today's Note button
- Checks for existing journal: daily item with today's date
- If exists → open in editor
- If not → create from selected user daily template then open
- No implicit fallback template. If none is selected, warn the user to choose one in settings.
- Settings picker to change default template

---

## Trash

- Soft delete sets date_trashed
- Trashed items hidden from all views except trash
- Every trash action writes to item_history with change_type: trashed
- Restore clears date_trashed, writes change_type: restored
- Permanent delete requires typed item title confirmation (case-sensitive)
- Permanent delete removes item and all related records via cascade

---

## Backlinks

- Computed by querying items whose content or frontmatter contains [[this-item-title]]
- Grouped by relationship type
- Named frontmatter properties shown under property name label
- Body mentions shown under Mentions

---

## Settings

- Daily note template picker
- Keyboard shortcuts reference — complete list
- Slash commands reference — complete list
- Account — email display, sign out
- Workspace — trash view link
- Change password and account deletion are not part of the current build sequence.

---

# Template Seeding

Seed all 31 subtypes as system templates with is_template: true and user_id: null.
Add RLS policy allowing all authenticated users to read system templates.
These seeded templates are bootstrap-only data for the build. Runtime template
surfaces should rely on user-owned templates, not on seeded records being
visible in the UI.
Reference schema-reference.md for full content and frontmatter per subtype.

Subtypes to seed:
- journal: daily, istikarah, dream, scratch, devlog
- creation: essay, framework, lesson, manuscript, chapter, comic, poem, story, artwork, case_study, workshop, script
- reference: slip, identity, principle, directive, source, literature, quote, guide, offer, asset, software, course, module
- log: habit, goal, finance, contact, outreach
- review: weekly, monthly, yearly, area
- action: task, project
- inbox: inbox

---

# Future Builds — Out of Scope for V1

- Full content search
- Reader — Readwise-style URL saving and annotation
- GTD inbox processing wizard
- Area view — full planning and strategy UI
- Tag filtering and browsing UI
- Markdown export
- Offline support
- Push notifications and reminders

---

# Definition of Done

V1 is complete when:

### Authentication
- [ ] User can sign up with email and password
- [ ] User can sign in with email and password
- [ ] User can sign out
- [ ] User can reset password via email link
- [ ] Unauthenticated users redirected to sign in

### Database
- [ ] All four tables exist with correct schema
- [ ] All indexes in place
- [ ] RLS policies active and enforced
- [ ] All 31 subtypes seeded as system templates

### Command Sheet
- [ ] FAB visible on every screen
- [ ] Tap opens command sheet
- [ ] Recent items shown by default
- [ ] User templates shown by default
- [ ] Typing searches item titles in real time
- [ ] Typing / shows slash command list
- [ ] Slash commands create correct item from correct template
- [ ] Capturing raw text saves to inbox with status: unprocessed
- [ ] First line to title (max 280 chars), overflow to content
- [ ] Rapid log toggle saves items back to back
- [ ] All rapid log captures land in inbox
- [ ] Insert template works when editing an open item

### Inbox
- [ ] Shows all unprocessed items
- [ ] No FAB inbox count badge in v1
- [ ] Processor allows editing title
- [ ] Processor allows selecting type and subtype
- [ ] Processed items get status: backlog
- [ ] Processing applies correct template frontmatter

### Item Editor
- [ ] All items open in CodeMirror showing raw markdown
- [ ] Frontmatter and body both editable
- [ ] Save with Cmd/Ctrl+S and save button
- [ ] Every save writes snapshot to item_history
- [ ] Frontmatter parsed on save and columns updated
- [ ] Workbench toggle in editor header
- [ ] Wikilink autocomplete triggers on [[
- [ ] Tag autocomplete triggers on #
- [ ] Wikilinks in frontmatter and body resolve to tappable links
- [ ] Tapping wikilink navigates to that item
- [ ] Unresolved wikilinks show visual indicator
- [ ] Backlinks panel below editor grouped by property

### Templates
- [ ] Template list shows all templates grouped by type
- [ ] Templates without type or subtype group under Misc.
- [ ] Templates editable in CodeMirror
- [ ] New templates open blank
- [ ] Only user-owned templates participate in runtime flows
- [ ] Deletion requires typed confirmation text

### Daily Note
- [ ] Home screen shows Open Today's Note button
- [ ] Button opens existing or creates new daily note
- [ ] New daily note uses selected user template from settings
- [ ] No implicit fallback if no daily template is selected

### Navigation
- [ ] Home shows date, daily note button, inbox count, workbench items
- [ ] Inbox tab shows unprocessed items with count badge
- [ ] Items tab shows all items filterable by type and subtype
- [ ] Items tab sortable by date_created, date_modified, title
- [ ] Templates tab shows all templates grouped by type
- [ ] Settings tab shows all settings sections

### Trash
- [ ] Trashed items hidden from all views
- [ ] Trash view accessible from settings
- [ ] Items can be restored
- [ ] Permanent delete requires typed title confirmation
- [ ] Permanent delete removes item and all related records

### Settings
- [ ] Daily note template picker works and persists
- [ ] Keyboard shortcuts reference complete and accurate
- [ ] Slash commands reference complete and accurate
- [ ] Sign out works
- [ ] Account email displayed

### General
- [ ] All features work on mobile
- [ ] All features work on desktop
- [ ] All items scoped to authenticated user via RLS
- [ ] No item from one user visible to another

---

# Changelog
| **Date** | **Change** | **Author** |
|---|---|---|
| 2026-04-02 | Initial build-spec created | Dwayne M Cyrus |
