# Sources Build Spec

## Purpose

Build a Sources system for saving, organizing, and processing web URLs, books, and other reference material for later consumption. This is a read-later capture system that feeds into the Knowledge tab and lays the foundation for an eventual full reader experience.

Sources are stored as `reference: source` items in the existing `items` table. Raw captures land in the capture inbox (`/inbox`) and are processed into sources via the Capture Review wizard (`/wizard/capture`).

## Scope

### In scope for v1

- Capture web URLs and free-text references (books, etc.) via the existing command sheet into the capture inbox
- Process inbox captures into `reference: source` items via the Capture Review wizard at `/wizard/capture`
- GTD-aligned one-at-a-time wizard with actions: Save as Source, Skip, Delete
- Fetch preview metadata for URL sources during wizard processing (deferred, not at capture time)
- Client-side domain heuristic for `source_type` detection, with metadata fetcher override
- Support tagging via existing `tags`
- Support manual `source_type` override in edit mode
- Source views: Inbox (`status = backlog`), Reading (`status = active`), Archive (`status = archived`)
- Rich source cards: cover thumbnail, favicon, title, site name, source type, date
- Source viewer at `/sources/$id`: read-mode first, inline CodeMirror edit toggle via 3-dot menu
- Sources added as expandable row in Knowledge tab of context sheet
- "Capture Review" button on home page adjacent to inbox count
- Configure a source template from settings via `link_template_id`, with built-in default fallback
- Literature note convention using `subtype: literature` with wikilink + `source:` frontmatter field

### Out of scope for v1

- Full article text extraction and reader mode
- Reader snapshots, highlights, annotations
- PDF, YouTube transcript, or podcast audio parsing
- RSS/newsletter ingestion
- Offline support
- A new source-specific database table
- Structured form editor for source fields (CodeMirror for v1)
- Bidirectional literature note display in source viewer
- Full GTD wizard branches beyond Save as Source, Skip, Delete
- Automatic status transitions (status is always set manually)

## Data Model

Use `public.items`. No new table.

### New columns on `items`

```sql
archived_at   timestamptz   -- audit timestamp, set on first archive, never cleared
normalized_url text         -- dedupe key for URL sources
site_name      text         -- from OG/meta fetcher (e.g. "YouTube", "The Verge")
favicon_url    text         -- from fetcher
source_type    text         -- article | video | podcast | post | book | other
```

`archived_at` is an audit timestamp only. It records when an item was first archived and is never cleared, even when status moves back to `backlog`. Filtering always uses `status`, not `archived_at`.

The existing `cover_link` column stores the OG image. No new `og_image` column is needed.

### Existing columns used by sources

```sql
type text           -- always 'reference' for sources
subtype text        -- always 'source'
title text
subtitle text
status text         -- backlog | active | archived
access text
area text
workbench boolean
author text
medium text
url text
isbn text
bookmark boolean
cover_link text     -- populated from OG image by fetcher
cover_alt_text text
description text
date_created timestamptz
date_modified timestamptz
date_trashed timestamptz
tags jsonb
content text
frontmatter jsonb
```

### New column on `user_settings`

```sql
link_template_id uuid references public.items(id) on delete set null
```

Behaves identically to `daily_template_id`:

- Settings UI lets the user choose a source template
- Template choices restricted to user-owned `is_template = true` items with `type = reference` and `subtype = source`
- Falls back to built-in default if no valid template is selected or the selected template is trashed/missing

## Source Status

| Status | View route | Meaning |
|---|---|---|
| `backlog` | `/sources/inbox` | Saved, waiting to consume |
| `active` | `/sources/reading` | Currently being consumed |
| `archived` | `/sources/archive` | Done or deliberately archived |

Status is changed manually by the user from within the source viewer (3-dot menu). `archived_at` is set on first archive and never cleared — it serves as a permanent audit trail.

### Re-archive deduplication

If a re-saved URL matches a source with `status = archived`, `archived_at` stays set, status moves to `backlog`, and the user sees:

> This source was already archived. Moved it back to inbox.

## Source Types

Medium-based and platform-agnostic. Platform identity is carried by `site_name` and `favicon_url`.

| `source_type` | Description | Client detection domains |
|---|---|---|
| `article` | Written web content | default fallback |
| `video` | Any video content | `youtube.com`, `youtu.be`, `vimeo.com`, `twitch.tv` |
| `podcast` | Audio podcast | `podcasts.apple.com`, `open.spotify.com`, `overcast.fm`, `pocketcasts.com` |
| `post` | Social media post | `x.com`, `twitter.com`, `threads.net`, `bsky.app` |
| `book` | Physical or digital book | manual only |
| `other` | Catch-all | unmatched |

Detection runs client-side from the URL hostname at wizard processing time. The metadata fetcher may override `source_type` using OG `og:type` and `og:site_name` signals.

`x.com` and `twitter.com` are treated as the same domain for detection only — the stored `url` is not rewritten.

## Dedupe

### URL sources

Use `normalized_url` as the dedupe key.

```sql
create unique index idx_items_user_normalized_url_unique
  on public.items (user_id, normalized_url)
  where user_id is not null
    and normalized_url is not null
    and date_trashed is null;
```

**Normalization rules:**

- Lowercase protocol and host
- Remove hash fragments
- Remove tracking params: `utm_*`, `fbclid`, `gclid`, `dclid`, `mc_cid`, `mc_eid`, `igshid`, `ref`, `ref_src`
- Sort remaining query params alphabetically
- Preserve meaningful query params by default

### Book sources

Use `isbn` as the dedupe key when present.

```sql
create unique index idx_items_user_isbn_unique
  on public.items (user_id, isbn)
  where user_id is not null
    and isbn is not null
    and date_trashed is null;
```

### Duplicate behavior

| Existing item state | Behavior |
|---|---|
| `status = archived` | Move to `backlog`, preserve `archived_at`, show: "This source was already archived. Moved it back to inbox." |
| `status = backlog` or `active` | Return existing item, show: "This source is already saved." |
| In trash | Allow new source (trashed items excluded from unique index) |
| Inbox capture matches existing source | Trash the original inbox capture after resolving |

## Capture Flow

1. User types a URL or text in the command sheet → lands in capture inbox (`/inbox`) as `type = inbox`, `status = unprocessed`
2. User taps "Capture Review" on the home page → navigates to `/wizard/capture`
3. Wizard shows captures one at a time (GTD process step)
4. User chooses an action per capture: **Save as Source**, **Skip**, or **Delete**
5. **Save as Source** → detect `source_type` from URL, fetch metadata via Vercel function, create `reference: source` item, trash the original capture

## Wizard (`/wizard/capture`)

GTD-aligned capture processing wizard. Surfaces all unprocessed inbox captures one at a time.

### Actions per capture

| Action | Behavior |
|---|---|
| Save as Source | Detect `source_type`, fetch metadata, create `reference: source`, trash capture |
| Skip | Leave capture in inbox, advance to next |
| Delete | Trash the capture, advance to next |

### Wizard navigation

- Triggered from "Capture Review" button on home page (adjacent to inbox count)
- Back navigation → home page (`/`)
- 3-dot more menu in wizard → secondary list view of all pending captures
- Progress indicator: current position of total captures (e.g. "2 of 7")
- On completion (no more captures): show a completion state and navigate back to home

### Future wizard routes

`/wizard/capture` is the first of multiple planned wizard routes. Future builds will add branches for other subtypes (tasks, notes, etc.) as separate flat route files following the same pattern.

## Metadata Fetcher

Vercel Node serverless function at `api/fetch-metadata.js`.

### Rationale

Client-only URL fetching fails for many sites due to CORS. A Vercel Node function avoids this, keeps metadata parsing dependencies server-only and out of the client bundle, and provides a path toward richer reader features later.

### Fetch timing

Metadata is fetched during wizard processing, not at capture time. Capture is instant and always succeeds. Enrichment is a discrete wizard step.

### Fields returned

```
title
description
favicon_url
cover_link      (OG image → populates items.cover_link)
site_name
source_type     (optional override of client heuristic)
```

### Security constraints

- Authenticated requests only (validate Supabase JWT)
- URL scheme allowlist: `http`, `https` only
- Block private networks and localhost (SSRF protection)
- Maximum redirect count: 3
- Request timeout: 8 seconds
- Maximum response body size: 500KB
- Require HTML content-type before parsing
- Return sanitized strings only — no raw HTML in response

### Cost note

Vercel Hobby plan includes base function usage. Implement conservative timeouts and size limits so metadata fetching does not become an unbounded usage surface.

## Source Template

Built-in default source template:

```md
---
cuid: "{{date}}{{time}}"
type: reference
subtype: source
title: "{{title}}"
subtitle:
status: backlog
access: private
area:
workbench: false
author:
medium:
url:
isbn:
source_type:
date_start:
date_end:
bookmark:
cover_link:
cover_alt_text:
date_created: "{{date}}T{{time}}"
date_modified:
date_trashed:
tags:
---

## Summary

A 1-3 paragraph summary of the source in your own words.

## Key Ideas

## Literature Notes

* [[]]
```

Runtime-created source items populate `url`, `title`, `description`, `source_type`, `site_name`, `favicon_url`, and `cover_link` from the wizard processing step and metadata fetcher.

## Literature Notes Convention

Use `subtype: literature` to capture notes taken from a source.

### v1 convention

Link a literature note to its source via:

1. Wikilink in content: `[[Source Title]]`
2. `source:` frontmatter field: `source: "[[Source Title]]"`

### Future build

The source viewer will display linked literature notes by querying items where `frontmatter->source` wikilinks back to the source. A "New literature note" action will pre-populate the template with the source wikilink. This is deferred — no special UI is needed in v1.

## Routes

All flat routes following the existing codebase pattern.

| File | Path | Description |
|---|---|---|
| `sources.jsx` | `/sources` | Redirect to `/sources/inbox` |
| `sources.$filter.jsx` | `/sources/$filter` | Inbox / Reading / Archive list views |
| `sources.$id.jsx` | `/sources/$id` | Source viewer (read-mode + inline edit) |
| `wizard.capture.jsx` | `/wizard/capture` | GTD capture review wizard |

### Filter config for `sources.$filter.jsx`

| `$filter` | `status` | Label |
|---|---|---|
| `inbox` | `backlog` | Inbox |
| `reading` | `active` | Reading |
| `archive` | `archived` | Archive |

### Source viewer (`/sources/$id`)

**Read mode (default):**
- Favicon + site name header
- Title (h1)
- Description
- Source type badge
- Status
- Author (if set)
- Tags (if set)
- Primary "Open URL" button (external link, URL sources only)
- 3-dot more menu: Edit, Move to Reading, Archive, Trash

**Edit mode (toggled from 3-dot menu):**
- Existing CodeMirror editor pattern (frontmatter + content)
- Same pattern as `ItemEditorScreen` with `editorKind = 'source'`
- Save/cancel controls

### Source card anatomy

Rich card displayed in list views:

- `cover_link` as a thumbnail image (if present)
- `favicon_url` + `site_name` as a source line
- `title` as the primary label
- `source_type` badge
- Formatted `date_modified` or `date_created`

`cover_link` is displayed on cards only, not in the source viewer.

## Context Sheet

Sources added to the Knowledge tab in `navigation.js`:

```
Knowledge
  ├── Notes (expandable, existing)
  ├── Sources (expandable) → /sources/inbox   count badge: backlog + active
  │     ├── Inbox    → /sources/inbox         count badge: backlog count
  │     ├── Reading  → /sources/reading       count badge: active count
  │     └── Archive  → /sources/archive
  └── Trash (existing)
```

## Home Page

The existing Inbox row on the home page gains a secondary "Capture Review" button that navigates to `/wizard/capture`. The inbox count and Capture Review button share the same row.

## Verification

Required gates before shipping:

- `supabase db lint`
- `npm run lint`
- `npm run build`
- Manual layout checks at 390px, 744px, 1024px
- Duplicate tests: new URL, active duplicate, archived duplicate (re-archive flow), trashed duplicate, ISBN duplicate
- Metadata tests: article URL, YouTube URL, X post URL, Vimeo URL, metadata fetch failure (item still saves)
- Wizard flow: URL capture → Save as Source, text capture → Skip, capture → Delete, empty state on completion
- Source viewer: read-mode fields, edit toggle, Open URL, status change actions
- Context sheet: Sources row count badges, sub-row navigation, active state highlighting
