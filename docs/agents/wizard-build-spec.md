# Inbox Processing Wizard — Build Specification
**Version:** 2.0
**Date:** 2026-04-08
**Author:** Dwayne M Cyrus
**Parent project:** Personal OS
**Location:** docs/agents/wizard-buildspec.md

---

## Overview

The inbox processing wizard is a two phase system for capturing and
processing items in the Personal OS.

**Phase 01 — Capture**
A fast frictionless capture sheet that accepts any text or URL and
saves it immediately to the inbox. No decisions, no titles, no routing.
Capture is dumb. Processing is smart.

**Phase 02 — Processing Wizard**
A step-by-step modal flow for processing captured inbox items into
their correct type, subtype, and destination within the Personal OS
schema. Follows GTD inbox processing methodology adapted for the
Personal OS type and subtype system.

The wizard never opens the item editor — processing is routing, not
working. The only exception is the 2 minute rule.

---

## Schema Changes

### cuid removed

`cuid` has been removed from the schema entirely. The Supabase `id`
column — `uuid primary key default gen_random_uuid()` — is the single
source of truth for item identification.

All references to `cuid` in templates, frontmatter, and database
operations are replaced with the Supabase `id`.

### Universal frontmatter — updated

```yaml
---
type:
subtype:
title:
status:
access: private
area:
workbench: false
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---
```

### Internal filename during capture

During capture the item is stored internally using the Supabase UUID:

```
550e8400-e29b-41d4-a716-446655440000.md
```

Once the user confirms the title in the processing wizard Step 0 the
filename updates to a slug of the confirmed title:

```
my-confirmed-title.md
```

The Supabase `id` remains the stable internal reference regardless
of what the filename becomes.

---

## Core Principles

- Capture is dumb — no decisions at capture time
- Processing is routing, not working — the editor never opens
- Every branch ends with saved, next item — forward momentum always
- Every item gets an area assignment before saving
- Every item gets a workbench toggle before saving
- Keep or delete is always the first processing decision
- The flow must work on mobile and desktop identically
- No step should require more than one decision
- The wizard closes when inbox is empty or user stops

---

## Phase 01 — Capture Sheet

### Entry points

The capture sheet is accessible from every screen via FAB tap.

### Behaviour

- Single text input — autofocused on open
- Accepts plain text or URLs — no distinction made at capture time
- All text saves to the `content` field of a new inbox item
- Title is auto-generated from the first 80 characters of content
- Filename is the Supabase UUID at this stage
- Item saved with `type: inbox`, `status: unprocessed`
- Sheet clears and stays open in rapid log mode
- Sheet closes when user dismisses

### Rapid log mode

- Toggle inside capture sheet
- Input clears after each save — ready for next capture
- Each entry saves as a separate inbox item
- Toggle off or close to exit

### Database operation on capture

```javascript
insert into items (
  user_id,
  type,
  subtype,
  title,
  status,
  content,
  date_created,
  date_modified,
  created_at,
  updated_at
) values (
  [user_id],
  'inbox',
  null,
  left([content], 80),     -- first 80 chars as proposed title
  'unprocessed',
  [full captured text],    -- all text goes to content
  now(),
  now(),
  now(),
  now()
)
```

---

## Phase 02 — Processing Wizard

### Entry points

1. Inbox view — "Process Inbox" button at top of inbox list
2. Individual inbox item — tapping opens wizard at that item

When entered from inbox list the wizard processes items one by one
in order of `created_at` oldest first until inbox is empty or user stops.

### Wizard structure

Full screen modal on mobile.
Centered modal on desktop — max width 600px.
Each step occupies the full modal. No scrolling within a step.
Progress shown as step indicator at top.
Back button available on every step except Step 0.
Stop button always visible to exit wizard at any point.

---

## Step 0 — Review and Triage

The first screen shown for each inbox item.
This is the keep or delete decision.

```
[ Content — full captured text, read only ]

Title: [ proposed title — first 80 chars — editable ]

Do you want to keep this item?

[ Keep ]    [ Delete ]
```

**On Keep:**
- Title field value becomes the confirmed title
- Filename updates from UUID to slug of confirmed title
- Frontmatter `title` field set to confirmed title
- Wizard advances to Step 1

**On Delete:**
- Item is trashed — `date_trashed` set to now
- No area or workbench step needed
- Wizard advances to next inbox item immediately

### Database operation on Keep

```javascript
update items set
  title = [confirmed title],
  date_modified = now(),
  updated_at = now()
where id = [item id]
```

### Database operation on Delete

```javascript
update items set
  date_trashed = now(),
  date_modified = now(),
  updated_at = now()
where id = [item id]
```

---

## Step 1 — Is it actionable?

```
Is this actionable?

[ Yes — I need to do something about this ]
[ No — I don't need to do anything about this ]
```

---

## Not Actionable Branch

### Step 1N — What kind of item is this?

```
What is this?

[ Something to consume ]
  Articles, books, videos, tweets, podcasts

[ A spiritual or personal journal entry ]
  Istikarah, dream, scratch thought

[ Something to track over time ]
  A contact, goal, outreach log

[ Reference material ]
  A note, idea, quote, principle, guide

[ Someday / Maybe ]
  I might want to do this one day

[ Trash ]
  I don't need this
```

---

### Step 1N-A — Something to consume → reference: source

```
What kind of source is this?

[ Book ]
[ Article ]
[ Video ]
[ Tweet ]
[ Podcast ]
[ Ebook ]
[ Course ]
```

Then:

```
URL or link if available:
[ text input ]

Author if known:
[ text input ]
```

Then → area assignment → workbench toggle → save

Creates: `reference: source` with correct `medium`, `url`, `author`

---

### Step 1N-B — Spiritual or personal journal entry

```
What kind of entry is this?

[ Istikarah — a conversation with Allah SWT ]
[ Dream — a dream I want to record ]
[ Scratch — a thought I need to hold somewhere ]
```

Then → area assignment → workbench toggle → save

Creates: `journal: istikarah` or `journal: dream` or `journal: scratch`

---

### Step 1N-C — Something to track over time

```
What are you tracking?

[ Contact — a person in my network ]
[ Goal — a 12 week year goal ]
[ Outreach — daily outreach activity ]
```

Then → area assignment → workbench toggle → save

Creates: `log: contact` or `log: goal` or `log: outreach`

---

### Step 1N-D — Reference material

```
What kind of reference is this?

[ Slip — an atomic idea to connect with others ]
[ Quote — someone else's words worth keeping ]
[ Principle — a rule I live by ]
[ Directive — how a principle applies in real life ]
[ Guide — instructions I will return to ]
[ Identity — something about who I am ]
[ Asset — a reusable business document ]
[ Software — a software product reference ]
[ Offer — a coaching or business offer ]
[ Literature — notes on a source I consumed ]
```

Then → area assignment → workbench toggle → save

Creates the correct `reference` subtype

---

### Step 1N-E — Someday / Maybe

```
This item will be saved to your Someday list.
You can review it during your weekly review.

[ Confirm → Save to Someday ]
```

Then → area assignment → workbench toggle → save

Creates: `action: task` with `status: someday`

---

### Step 1N-F — Trash

```
Are you sure you want to trash this item?
This moves it to trash. You can restore it later.

[ Yes — Move to Trash ]
[ No — Go Back ]
```

Sets `date_trashed` on the item.
No area or workbench step needed.
Moves immediately to next item.

---

## Actionable Branch

### Step 1A — Under 2 minutes?

```
Will this take less than 2 minutes to complete?

[ Yes — I can do it right now ]
[ No — It will take longer ]
```

---

### Step 1A-Yes — Do it now

```
Go do it now.
Come back when you are done and mark it complete.

[ Mark as Done ]
[ Actually it takes longer → ]
```

Marking done sets `status: done` and `date_trashed` to now.
Moves immediately to next item.

---

### Step 2A — What kind of action is this?

```
What kind of action is this?

[ A recurring habit or behavior ]
  Something I want to do regularly

[ A scheduled review ]
  A weekly, monthly, or yearly review

[ Writing or creation ]
  An essay, framework, story, artwork, script

[ A single task ]
  One clear action to complete

[ Part of a larger project ]
  Multiple steps needed to reach the outcome
```

---

### Step 2A-A — Recurring habit → action: habit

```
How often will you do this?

[ Daily ]
[ Specific days → day picker ]
[ Weekly ]
```

Then:

```
What are you measuring?

Unit: [ minutes | reps | pages | km | times | other ]
Target: [ numeric input ]
```

Then → area assignment → workbench toggle → save

Creates: `action: habit` with `frequency`, `unit`, `target`

---

### Step 2A-B — Scheduled review

```
What kind of review is this?

[ Weekly review ]
[ Monthly review ]
[ Yearly review ]
[ Life area review ]
```

Then → area assignment → workbench toggle → save

Creates the correct `review` subtype

---

### Step 2A-C — Writing or creation

```
What kind of creation is this?

[ Essay ]
[ Framework ]
[ Lesson ]
[ Manuscript ]
[ Comic ]
[ Poem ]
[ Story ]
[ Artwork ]
[ Case study ]
[ Workshop ]
[ Script ]
```

Then → area assignment → workbench toggle → save

Creates the correct `creation` subtype

---

### Step 2A-D — Single task

```
When does this need to happen?

[ Today ]
[ Specific date → date picker ]
[ Anytime — no deadline ]
[ Someday ]
```

Then → area assignment → workbench toggle → save

Creates: `action: task` with correct `status` and `end_date`

**Routing logic applied on save:**

| Selection | status | end_date |
|-----------|--------|----------|
| Today | open | today |
| Specific date | open | chosen date |
| Anytime | open | null |
| Someday | someday | null |

---

### Step 2A-E — Part of a project

```
Which project does this belong to?

[ Search existing projects... ]
[ + Create new project ]
```

If creating new project:

```
Project title: [ text input ]
```

Creates `action: project` silently in background.
Links the task to the new project.

Then:

```
When does this task need to happen?

[ Today ]
[ Specific date → date picker ]
[ Anytime — no deadline ]
[ Someday ]
```

Then → area assignment → workbench toggle → save

Creates: `action: task` linked to project with correct `status` and `end_date`

---

## Universal Steps — All Paths Except Trash and Done

### Area Assignment Step

```
Which area of life does this belong to?

[ Search your areas... ]
[ No specific area ]
```

Shows all `review: area` items as options.
Selecting sets `area` field as wikilink `[[area-title]]`.
Selecting No specific area leaves `area` blank.

---

### Workbench Toggle Step

```
Add to workbench?
Workbench items appear on your home screen for active focus.

[ ] Yes — add to workbench

[ Save and continue → ]
```

Sets `workbench: true` if toggled on.
Default is off.

---

## Confirmation Screen

Shown after every save before moving to next item.

```
✓ Saved

[subtype icon] [subtype name]
Area: [area name or None]
[Workbench badge if workbench: true]
[Due: date if applicable]
[Status if someday]

[ Next item → ]      [ Stop processing ]
```

If inbox is now empty:

```
✓ Inbox is empty

Nothing left to process.

[ Done ]
```

---

## Database Operations — Full Reference

### On Keep (Step 0)

```javascript
update items set
  title = [confirmed title],
  date_modified = now(),
  updated_at = now()
where id = [item id]
```

### On final save — all routing paths

```javascript
update items set
  type = [resolved type],
  subtype = [resolved subtype],
  status = [resolved status],
  area = [selected area wikilink or null],
  workbench = [true or false],
  end_date = [resolved date or null],
  project = [project wikilink or null],
  medium = [medium or null],
  url = [url or null],
  author = [author or null],
  unit = [unit or null],
  target = [target or null],
  frequency = [frequency array or null],
  date_modified = now(),
  updated_at = now()
where id = [item id]
```

### On Delete (Step 0) and Trash (Step 1N-F)

```javascript
update items set
  date_trashed = now(),
  date_modified = now(),
  updated_at = now()
where id = [item id]
```

### On Done (2 minute rule)

```javascript
update items set
  status = 'done',
  date_trashed = now(),
  date_modified = now(),
  updated_at = now()
where id = [item id]
```

### On new project creation

```javascript
insert into items (
  user_id, type, subtype, title, status,
  date_created, date_modified, created_at, updated_at
) values (
  [user_id], 'action', 'project',
  [project title], 'active',
  now(), now(), now(), now()
)
```

### Item history snapshot on every save

```javascript
insert into item_history (
  item_id, user_id, content, frontmatter, change_type, changed_at
) values (
  [item id], [user id], [content], [frontmatter], 'updated', now()
)
```

---

## State Management

```javascript
{
  currentItem: item,
  currentStep: string,
  stepHistory: string[],
  selections: {
    type: string,
    subtype: string,
    status: string,
    area: string,
    workbench: boolean,
    endDate: date | null,
    project: string | null,
    medium: string | null,
    url: string | null,
    author: string | null,
    unit: string | null,
    target: number | null,
    frequency: string[],
  },
  inboxQueue: item[],
  processedCount: number,
}
```

State resets for each new item.
Selections accumulate as user moves through steps.
Back button reverts to previous step and clears selections made after it.

---

## Navigation Rules

- Forward — only via explicit selection buttons, never auto-advance
- Back — always available, reverts to previous step
- Stop — always available, exits wizard, saves nothing for current item
- No swipe navigation — buttons only
- No skip — every step must be completed in sequence

---

## Component Structure

```
CaptureSheet/
├── CaptureSheet.jsx
├── CaptureSheet.module.css
└── hooks/
    └── useCapture.js

WizardModal/
├── WizardModal.jsx
├── WizardModal.module.css
│
├── WizardHeader/
│   ├── WizardHeader.jsx
│   └── WizardHeader.module.css
│
├── WizardStep/
│   ├── WizardStep.jsx
│   └── WizardStep.module.css
│
├── steps/
│   ├── ReviewTriage.jsx       # Step 0 — keep or delete
│   ├── IsActionable.jsx       # Step 1 — actionable yes/no
│   ├── NotActionableType.jsx  # Step 1N — not actionable branch
│   ├── SourceType.jsx         # Step 1N-A — source medium picker
│   ├── JournalType.jsx        # Step 1N-B — journal subtype picker
│   ├── LogType.jsx            # Step 1N-C — log subtype picker
│   ├── ReferenceType.jsx      # Step 1N-D — reference subtype picker
│   ├── SomedayConfirm.jsx     # Step 1N-E — someday confirmation
│   ├── TrashConfirm.jsx       # Step 1N-F — trash confirmation
│   ├── TwoMinutes.jsx         # Step 1A — under 2 minutes yes/no
│   ├── DoItNow.jsx            # Step 1A-Yes — do it now
│   ├── ActionType.jsx         # Step 2A — action type picker
│   ├── HabitSetup.jsx         # Step 2A-A — habit setup
│   ├── ReviewType.jsx         # Step 2A-B — review subtype picker
│   ├── CreationType.jsx       # Step 2A-C — creation subtype picker
│   ├── TaskWhen.jsx           # Step 2A-D — task timing
│   ├── ProjectPicker.jsx      # Step 2A-E — project assignment
│   ├── AreaAssignment.jsx     # Universal — area picker
│   ├── WorkbenchToggle.jsx    # Universal — workbench toggle
│   └── Confirmation.jsx       # Confirmation screen
│
└── hooks/
    ├── useWizard.js
    ├── useInboxQueue.js
    └── useSaveItem.js
```

---

## Definition of Done

### Capture Sheet
- [ ] Capture sheet opens from FAB on every screen
- [ ] Accepts plain text and URLs without distinction
- [ ] All text saves to content field
- [ ] Title auto-generated from first 80 characters
- [ ] Internal filename uses Supabase UUID
- [ ] Item saved as type: inbox, status: unprocessed
- [ ] Rapid log mode saves back to back and clears input
- [ ] Sheet closes on dismiss

### Processing Wizard
- [ ] Wizard opens from inbox list and individual inbox item
- [ ] Items processed oldest first by created_at
- [ ] Step 0 shows content and proposed title — title editable
- [ ] Keep confirms title, updates filename to title slug
- [ ] Delete trashes item immediately, advances to next
- [ ] Step 1 branches correctly on actionable yes/no
- [ ] All not actionable branches route correctly
- [ ] All actionable branches route correctly
- [ ] Source branch captures medium, url, and author
- [ ] Habit branch captures frequency, unit, and target
- [ ] Task branch captures when and applies correct status and end_date
- [ ] Project branch searches existing and creates new silently
- [ ] Area assignment appears on all branches except trash and done
- [ ] Workbench toggle appears on all branches except trash and done
- [ ] Confirmation screen shows correct routing summary
- [ ] Save updates existing inbox item in place
- [ ] Item history snapshot written on every save
- [ ] Trash sets date_trashed correctly
- [ ] Done sets status: done and date_trashed correctly
- [ ] Back button works and reverts selections
- [ ] Stop exits without saving current item
- [ ] Advances to next item after each save
- [ ] Empty inbox confirmation shown when complete
- [ ] Works on mobile
- [ ] Works on desktop
- [ ] All items scoped to authenticated user

---

## Changelog

| **Date** | **Change** | **Author** |
|---|---|---|
| 2026-04-08 | Initial wizard buildspec created | Dwayne M Cyrus |
| 2026-04-08 | v2.0 — Phase 01/02 capture logic, cuid removed, UUID filename, Keep/Delete triage added | Dwayne M Cyrus |