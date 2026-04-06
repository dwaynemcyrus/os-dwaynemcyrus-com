# UI Design System Specification

> **Purpose**: Reference document for an AI agent to redesign an application UI. Patterns extracted from a working mobile-first PWA. Treat these as a starting point — improve where noted.

---

## 1. Design Tokens

### 1.1 Color Palette

| Token | Value (approx.) | Usage |
|---|---|---|
| `--color-bg-app` | `#000000` | Full-screen background behind all content |
| `--color-bg-surface` | `#0D0D0D` – `#111111` | Primary card/container surface |
| `--color-bg-surface-hover` | `#1A1A1A` | Row hover/press state (subtle lift) |
| `--color-border-subtle` | `rgba(255,255,255,0.08)` | Dividers between sections, card outlines |
| `--color-border-card` | `rgba(255,255,255,0.12)` | Rounded card container stroke |
| `--color-text-primary` | `#FFFFFF` | Headings, row labels, active tab |
| `--color-text-secondary` | `rgba(255,255,255,0.5)` | Metadata (type tags, timestamps), inactive tabs |
| `--color-text-muted` | `rgba(255,255,255,0.3)` | Placeholder text, disabled items ("Locked"), ghost CTAs ("Create new...") |
| `--color-text-badge` | `rgba(255,255,255,0.45)` | Count badges on list rows |
| `--color-accent` | `#FFFFFF` | Active tab indicator bar, FAB icon |
| `--color-fab-bg` | `#FFFFFF` / `#1A1A1A` | FAB background (two states — see FAB section) |
| `--color-fab-icon` | `#000000` / `#FFFFFF` | FAB icon color (inverts with bg) |
| `--color-chip-bg` | `rgba(255,255,255,0.08)` | Pill/chip buttons (type filter tags) |
| `--color-chip-text` | `rgba(255,255,255,0.7)` | Chip label text |
| `--color-badge-muted` | `rgba(255,255,255,0.1)` | "SOON" badge background |

**Design direction**: This is a dark-mode-only design. Pure black app background with near-black surfaces creates an OLED-friendly, high-contrast aesthetic. Improve by introducing a single accent color (not white) for interactive affordances.

### 1.2 Typography

| Token | Size (approx.) | Weight | Case | Usage |
|---|---|---|---|---|
| `--font-page-date` | 12–13px | 600 | UPPERCASE, letter-spaced | Date header ("MONDAY, MARCH 30") |
| `--font-section-label` | 11–12px | 600 | UPPERCASE, letter-spaced | Section headers ("RECENT", "TEMPLATES (2)", "Now") |
| `--font-row-title` | 17–18px | 500–600 | Sentence case | List row primary label |
| `--font-row-meta` | 13–14px | 400 | Lowercase | Row metadata / type + timestamp |
| `--font-tab-label` | 14–15px | 500 | Sentence case | Bottom tab bar labels |
| `--font-search-placeholder` | 17–18px | 400 | Sentence case | Search input placeholder |
| `--font-chip` | 13–14px | 500 | Sentence case | Filter chip labels |
| `--font-cta-ghost` | 16px | 400 | Sentence case | "Create new..." ghost text |
| `--font-badge` | 11–12px | 600 | UPPERCASE | Status badges ("SOON") |
| `--font-toggle-label` | 13px | 600 | UPPERCASE | "RAPID LOG" toggle label |

**Font family**: System font stack (San Francisco on iOS). For the redesign, select a distinctive sans-serif — the current system font is functional but generic.

**Improvement opportunity**: Introduce a display typeface for page-level headings. The current type scale is flat — there's no clear hierarchy between page titles and list content.

### 1.3 Spacing & Layout

| Token | Value | Usage |
|---|---|---|
| `--space-screen-pad-x` | 16px | Horizontal padding from screen edge to card |
| `--space-card-pad-x` | 20–24px | Inner horizontal padding within card surfaces |
| `--space-card-pad-y` | 20–24px | Inner vertical padding (top/bottom of card) |
| `--space-row-height` | ~56–60px | Tap target height for list rows |
| `--space-row-gap` | 0px (divider-separated) | Rows sit flush; dividers create separation |
| `--space-section-gap` | 16–20px | Gap between sections (e.g., divider + label gap) |
| `--space-tab-bar-height` | ~50px | Bottom tab bar |
| `--space-fab-bottom` | ~24px | FAB distance from bottom of viewport |
| `--space-card-radius` | 16–20px | Card container border radius |
| `--space-chip-radius` | 20px (full pill) | Filter chip border radius |
| `--space-badge-radius` | 6px | "SOON" badge corner radius |

### 1.4 Elevation & Depth

The design is almost entirely flat. Cards are distinguished from the background by a subtle border stroke rather than shadow. There is no blur, no drop shadow, no layering beyond the modal overlay.

| Layer | Method |
|---|---|
| App background | Pure black `#000` |
| Content card | Slightly lighter surface + 1px border stroke |
| Modal/sheet overlay | Same card treatment, centered on screen with dimmed bg |
| FAB | Sits below the card, outside the content area |

**Improvement opportunity**: Consider adding subtle elevation (soft shadow or backdrop-blur) to the FAB and modal overlays to create clearer depth hierarchy.

---

## 2. Component Patterns

### 2.1 Content Card (Primary Container)

The entire app content lives inside a single rounded-rectangle card that floats over the black background.

```
┌─────────────────────────────────────┐
│  (card content)                     │
│                                     │
│  Tab Bar                            │
└─────────────────────────────────────┘
```

- **Border**: 1px `--color-border-card`, radius `--space-card-radius`
- **Background**: `--color-bg-surface`
- **Width**: Full screen minus `--space-screen-pad-x` on each side
- **Height**: Extends from top safe area to above the FAB
- **Tab bar is INSIDE the card**, flush at the bottom edge

### 2.2 Navigation List Row

The dominant interaction pattern. Used for: task groups, note categories, strategy sections, search results.

```
┌─────────────────────────────────────┐
│  Label                    Meta   ›  │
├─────────────────────────────────────┤
```

- **Layout**: Flexbox row, space-between
- **Left**: Row title (`--font-row-title`, `--color-text-primary`)
- **Right**: Count badge or metadata + chevron `›`
- **Divider**: 1px `--color-border-subtle`, full-width within card padding
- **Tap target**: Full row width, `--space-row-height` tall

**Variants**:

| Variant | Right side content | Example |
|---|---|---|
| Count | Number + chevron | `Notes 8 ›` |
| Chevron only | Just `›` | `Upcoming ›` |
| Disabled | Muted text + badge | `Locked SOON` |
| Meta + timestamp | Type tag + relative time | `project · 3d ago` |

### 2.3 Bottom Tab Bar

Four equal-width tabs, inside the content card.

```
┌─────────────────────────────────────┐
│  Tasks    Strategy    Notes   Sources│
│  ─────                              │
└─────────────────────────────────────┘
```

- **Active state**: White text + 2–3px white bar above the label
- **Inactive state**: `--color-text-secondary`
- **No icons** — text-only tabs
- **Position**: Fixed to bottom of content card

**Note**: The tab labels changed across versions — "Plans" became "Strategy". The tab bar is a core navigation element with 4 slots. The redesign should support configurable tab labels.

**Improvement opportunity**: Text-only tabs work but lack scannability on quick glance. Consider adding subtle iconography above or beside labels.

### 2.4 Floating Action Button (FAB)

Centered at bottom of screen, BELOW the content card. Two visual states observed:

| State | Background | Icon | Behavior |
|---|---|---|---|
| Default (closed) | White `#FFF` | Black dot/circle `○` | Opens creation modal |
| Active (modal open) | Dark `#1A1A1A` | White `✕` | Closes modal |

- **Size**: ~56px diameter
- **Shape**: Rotated 45° square (diamond shape), not a circle
- **Position**: Centered horizontally, fixed ~24px above bottom safe area
- **Sits outside the card** — floats over the black app background

**This is the most distinctive UI element.** The diamond FAB is a strong brand signature. Preserve it in the redesign.

### 2.5 Home Screen (Today View)

Minimal dashboard shown on app launch.

```
MONDAY, MARCH 30

Create Today's Note  ›

Now
Fill your 2 slots for today  ›

Process Inbox  0  ›

Your Workbench Empty  0  ›

Settings  ›
```

- **Date header**: `--font-page-date`, uppercase, letter-spaced
- **"Now" label**: Section divider, `--font-section-label`
- **Rows**: Mix of action CTAs and status summaries
- **No card container** — content sits directly on black background
- **FAB at bottom** (default state)

**Improvement opportunity**: This screen is very sparse. It should be the most information-dense screen in the app — consider adding streak data, quick stats, or progress indicators.

### 2.6 Search / Create Modal

Full-screen modal triggered by FAB.

**Structure**:
```
┌─────────────────────────────────────┐
│  Search or create...                │  ← Search input
├─────────────────────────────────────┤
│  RECENT                             │  ← Section label
│  Project            project · 3d ago│
│  Task                  task · 3d ago│
│  Area                  area · 3d ago│
│  ...                                │
├─────────────────────────────────────┤
│  ○ RAPID LOG          Cancel   Save │  ← Footer toolbar
└─────────────────────────────────────┘
              ✕                          ← FAB (close state)
```

- **Search input**: Top of card, large placeholder text, no visible border — just text on surface
- **Recent items list**: Standard nav rows with type + timestamp metadata
- **Type filter chips** (v2): Horizontal row of pill buttons — `Inbox`, `Task`, `Project`, `Slip`, `Essay`, `Scratch`, `More`
- **Footer**: Toggle ("RAPID LOG") + Cancel/Save actions
- **Empty state**: "No results for [query]" centered in card body
- **FAB switches to close (✕) state**

**Two versions observed**:
1. **v1** (type list): Full type list without chips, type names as row titles
2. **v2** (recent + chips): Recent documents as rows, type chips at bottom for filtering

V2 is the better pattern — it shows recent content first and lets type selection be secondary.

### 2.7 Strategy Tab Content

Nested navigation for 12-Week Year cycle management.

```
Current Cycle    [2026 CYCLE 1 TEST · WNAN]  ›

Scorecard                                      ›
─────────────────────────────────────────────────
Weekly Plans                                 1  ›
Reviews                                      1  ›
Life Arenas                                  2  ›
Archive                                         ›
─────────────────────────────────────────────────
Create new...
```

- **Cycle selector**: Row with pill badge showing cycle name
- **Pill badge style**: `--color-chip-bg` background, `--color-chip-text`, small caps
- **Section dividers** separate logical groups
- **"Create new..."**: Ghost CTA in `--color-text-muted`

### 2.8 Pill / Chip Buttons

Used for type filtering in the search modal.

- **Shape**: Full-radius pill (`border-radius: 9999px`)
- **Background**: `--color-chip-bg`
- **Text**: `--color-chip-text`, `--font-chip`
- **Padding**: ~8px 16px
- **Layout**: Horizontal scroll or wrap row
- **"More" chip**: Same style, acts as overflow

### 2.9 Toggle Control

"RAPID LOG" toggle in search modal footer.

- **Track**: Rounded pill, dark when off
- **Label**: Uppercase, letter-spaced, beside the toggle
- **Positioned**: Bottom-left of modal card

### 2.10 Status Badge

"SOON" badge on disabled rows.

- **Background**: `--color-badge-muted`
- **Text**: `--font-badge`, `--color-text-muted`
- **Border-radius**: `--space-badge-radius`
- **Padding**: ~4px 10px

---

## 3. Layout Architecture

### 3.1 Screen Structure

```
┌──────────── Viewport ────────────────┐
│  ┌──────── Content Card ──────────┐  │
│  │                                │  │
│  │  (screen content)              │  │
│  │                                │  │
│  │  ┌──── Tab Bar ─────────────┐  │  │
│  │  │ Tasks  Strategy  Notes...│  │  │
│  │  └─────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│              ◇ FAB                   │
└──────────────────────────────────────┘
```

- **Single-card layout**: One content card per screen, no split views
- **Tab bar inside card**: Not a system-level nav — it's part of the card
- **FAB outside card**: Floats independently over the app background
- **No top nav bar**: No back buttons, no header bar — tabs handle all navigation
- **Exception**: Home screen has no card — content sits directly on black bg

### 3.2 Navigation Model

```
FAB ──→ Search/Create Modal (overlay)
Tab Bar ──→ Tasks | Strategy | Notes | Sources (card content swap)
List Row ──→ Drill-down (card content swap, presumably with back gesture)
```

- **Primary nav**: Tab bar (4 sections)
- **Creation**: FAB → modal
- **Drill-down**: Row tap → deeper list or detail view
- **Dismissal**: FAB ✕ for modals, presumably swipe-back for drill-downs

### 3.3 Responsive Behavior

The screenshots are mobile-only (iPhone). For the redesign:

- **Mobile** (< 640px): Current single-card layout
- **Tablet** (640–1024px): Consider master-detail split within a wider card
- **Desktop** (> 1024px): Card should max-width at ~480px centered, or expand to sidebar + content

---

## 4. Interaction Patterns

### 4.1 Creation Flow

1. Tap diamond FAB (default state)
2. Modal slides up with search/create interface
3. Type to search existing items, or tap a type chip/row to create new
4. "RAPID LOG" toggle enables quick-capture mode
5. Cancel / Save in footer
6. Tap ✕ FAB to dismiss without saving

### 4.2 List Navigation

1. Tap a list row → drills into that category
2. Chevron `›` indicates navigability
3. Count badges indicate content volume
4. Disabled rows show "SOON" badge, no tap target

### 4.3 Tab Switching

- Tabs swap content within the same card container
- Active tab has white text + indicator bar
- Content likely animates horizontally (not confirmed from statics)

---

## 5. Naming Conventions

### 5.1 Document Types (from search modal)

Primary types: `Project`, `Task`, `Area`, `Goal`, `Habit`, `Module`, `Contact`, `Outreach`, `Finance`

Temporal types: `Yearly`, `Monthly`, `Weekly`

Content types (v2): `Inbox`, `Slip`, `Essay`, `Scratch`

### 5.2 Task Buckets

`Today`, `Upcoming`, `Backlog`, `Someday`, `Logbook`, `Trash`

### 5.3 Note Categories

`Notes`, `Todo`, `Today`, `Pinned`, `Locked`, `Trash`

### 5.4 Strategy Sections

`Current Cycle`, `Scorecard`, `Weekly Plans`, `Reviews`, `Life Arenas`, `Archive`

---

## 6. Summary of Improvement Opportunities

These are areas where the current design is functional but could be elevated:

1. **Accent color**: Everything is white-on-black. Introduce one accent color for interactive elements (FAB, active states, CTAs) to create stronger visual hierarchy.

2. **Typography hierarchy**: Add a display typeface for page titles. Current type scale is too uniform — row titles and page headers look identical.

3. **Home screen density**: The Today view is underutilized screen real estate. Add progress indicators, streaks, or quick-glance metrics.

4. **Tab bar iconography**: Text-only tabs are clean but slow to scan. Even minimal icons would improve recognition speed.

5. **Depth and elevation**: The design is entirely flat. Selective use of shadow or blur on the FAB and modals would improve spatial clarity.

6. **Empty states**: "No results for X" is bare. Add illustration or suggested actions.

7. **Transition and motion**: No motion language defined. Add enter/exit animations for the modal, tab transitions, and row interactions.

8. **Responsive scaling**: Currently mobile-only. Define breakpoint behavior for tablet and desktop.

9. **Accessibility**: No visible focus states, no high-contrast mode consideration. Add focus rings and ensure 4.5:1 contrast ratios on all text.

10. **The diamond FAB is the strongest brand element** — preserve and refine it. Consider adding a subtle animation (rotation, scale) on state change.