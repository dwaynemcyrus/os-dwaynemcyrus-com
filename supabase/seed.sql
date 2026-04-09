begin;

-- System templates seeded from docs/agents/schema-reference.md
-- Explicit subtype lists in docs/agents/build-spec.md are treated as canonical.
insert into public.items (
  user_id,
  is_template,
  type,
  subtype,
  title,
  status,
  access,
  area,
  workbench,
  resources,
  dependencies,
  blocked,
  slug,
  published,
  tier,
  growth,
  rating,
  series,
  series_position,
  format,
  medium,
  genre,
  platform,
  collection,
  source,
  chains,
  manuscript,
  project,
  principle,
  course,
  asset_type,
  contact_type,
  contact_status,
  contacted_last,
  next_follow_up,
  deal_status,
  deal_value,
  institution,
  instructor,
  url,
  isbn,
  bookmark,
  repo,
  stack,
  modules,
  be_and_feel,
  for_sale,
  price,
  currency,
  sold,
  exhibited,
  dimensions,
  year,
  outcome,
  problem,
  solution,
  delivery,
  lag_measure,
  lag_target,
  lag_unit,
  lag_actual,
  score_overall,
  week,
  month,
  theme,
  date_delivered,
  recording_link,
  attendees,
  duration_target,
  episode,
  season,
  cover_link,
  cover_alt_text,
  certificate_link,
  unit,
  target,
  frequency,
  total_sent,
  total_comments,
  total_responses,
  currency_primary,
  currency_secondary,
  month_revenue_chf,
  month_expenses_chf,
  month_profit_chf,
  date_field,
  mood,
  chapter_count,
  issue,
  author,
  subtitle,
  description,
  date_start,
  date_end,
  content,
  frontmatter,
  date_created,
  date_modified,
  date_trashed,
  tags

) values
(
  null,
  true,
  'journal',
  'daily',
  '{{date:YYYY-MM-DD}}',
  'active',
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: journal
subtype: daily
title: "{{date:YYYY-MM-DD}}"
status: active
access: private
area:
workbench: false
rating:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Capture


## Reflection

**Wins:**

**Losses:**

**Lessons:**

**1% better tomorrow:**',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'journal',
  'istikarah',
  null,
  'active',
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: journal
subtype: istikarah
title:
status: active
access: private
area:
workbench: false
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Intention

What are you seeking guidance on?

## Guidance

What did you receive from Allah SWT?

## Quranic References


## Action

What will you do as a result?

## Signs

#### {{date:YYYY-MM-DD}}

What did you notice and what does it mean?',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'journal',
  'dream',
  null,
  'active',
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: journal
subtype: dream
title:
status: active
access: private
area:
workbench: false
mood:
rating:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Dream


## Symbols


## Reflection

What do you think this dream means?',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'journal',
  'scratch',
  null,
  'active',
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: journal
subtype: scratch
title:
status: active
access: private
area:
workbench: false
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'journal',
  'devlog',
  '{{date:YYYY-MM-DD}}',
  'active',
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  '[[]]',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: journal
subtype: devlog
title: "{{date:YYYY-MM-DD}}"
status: active
access: private
area:
workbench: false
resources:
  - "[[]]"
project: "[[]]"
series:
series_position:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## What I worked on


## Decisions made


## Blockers


## Next session',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'essay',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  'seedling',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: essay
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
slug:
description:
growth: seedling
tier:
cover_link:
cover_alt_text:
published: false
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Hook


## Body


## Conclusion',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'framework',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  'seedling',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: framework
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
slug:
description:
growth: seedling
tier:
published: false
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Problem

What problem does this framework solve?

## Framework

### Principle 1


### Principle 2


### Principle 3


## Application

How is this framework applied in real life?

## Example

A concrete example of this framework in action.',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'lesson',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  'seedling',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: lesson
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
slug:
description:
growth: seedling
tier:
published: false
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Story

Tell the story. Put the reader in the middle of it.

## Insight

What does the story teach?

## Application

How can the reader apply this insight in their own life?',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'manuscript',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  'seedling',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: manuscript
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
slug:
description:
genre:
medium:
growth: seedling
chapter_count: 0
date_start:
date_end:
published: false
tier:
cover_link:
cover_alt_text:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Premise

What is this manuscript about in one paragraph?

## Audience

Who is this for?

## Structure

How is this manuscript organized?

## Chapters

- [ ] Chapter 1 — [[]]
- [ ] Chapter 2 — [[]]
- [ ] Chapter 3 — [[]]

## Notes

Any additional thoughts, research, or ideas.',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'chapter',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  '[[]]',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: chapter
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
manuscript: "[[]]"
series:
series_position:
date_start:
date_end:
published: false
tier:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Summary

One paragraph describing what this chapter covers.

## Draft

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'comic',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  'seedling',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: comic
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
series:
series_position:
issue:
growth: seedling
date_start:
date_end:
published: false
tier:
cover_link:
cover_alt_text:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Premise

What is this issue about in one paragraph?

## Story Beats

-
-
-

## Script

### Page 1

**Panel 1**
- Visual:
- Dialogue:
- Caption:

**Panel 2**
- Visual:
- Dialogue:
- Caption:

## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'poem',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  'seedling',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: poem
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
collection:
series:
series_position:
growth: seedling
published: false
tier:
cover_link:
cover_alt_text:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Poem


## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'story',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  'seedling',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: story
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
series:
series_position:
genre:
growth: seedling
published: false
tier:
cover_link:
cover_alt_text:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Premise

What is this story about in one paragraph?

## Story


## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'artwork',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  'seedling',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: artwork
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
series:
series_position:
medium:
dimensions:
year:
growth: seedling
for_sale: false
price:
currency: CHF
sold: false
exhibited: false
published: false
tier:
cover_link:
cover_alt_text:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Description

What is this artwork about?

## Process

How was this made?

## Exhibition History

-

## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'case_study',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  'seedling',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  '[[]]',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: case_study
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
project: "[[]]"
outcome:
growth: seedling
published: false
tier:
cover_link:
cover_alt_text:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Overview

What was this project and why did it matter?

## Challenge

What problem were you solving?

## Process

How did you approach it?

## Outcome

What was the result?

## Lessons

What did you learn?',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'workshop',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: workshop
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
format:
series:
series_position:
platform:
date_delivered:
attendees: 0
recording_link:
published: false
tier:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Objective

What is the goal of this session?

## Outline

-
-
-

## Materials

-

## Resources

-

## Notes

Post-event additions and observations.',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'creation',
  'script',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: creation
subtype: script
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
format:
duration_target:
series:
series_position:
episode:
season:
recording_link:
published: false
tier:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Hook


## Body


## Call To Action


## Resources

-

## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'slip',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[[]]',
  '["[[]]"]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: slip
title:
status:
access: private
area:
workbench: false
source: "[[]]"
chains:
  - "[[]]"
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Note

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'identity',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: identity
title:
subtitle:
status:
access: private
area:
workbench: false
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Content

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'principle',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: principle
title:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Principle


## Why

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'directive',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  '[[]]',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: directive
title:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
principle: "[[]]"
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Directive


## Application

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'source',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  '[[]]',
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: source
title:
subtitle:
status:
access: private
area:
workbench: false
author: "[[]]"
medium:
url:
isbn:
date_start:
date_end:
bookmark:
cover_link:
cover_alt_text:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Summary

A 1-3 paragraph summary of the source in your own words.

## Key Ideas


## Literature Notes

- [[]]',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'literature',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[[]]',
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: literature
title:
status:
access: private
area:
workbench: false
source: "[[]]"
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Notes


## Key Ideas


## Slips

- [[]]',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'quote',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[[]]',
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  '[[]]',
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: quote
title:
status:
access: private
area:
workbench: false
author: "[[]]"
source: "[[]]"
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

>
',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'guide',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: guide
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
published: false
tier:
cover_link:
cover_alt_text:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Overview


## Steps


## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'offer',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: offer
title:
status:
access: private
area:
workbench: false
problem:
solution:
price:
currency: CHF
delivery:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Problem


## Solution


## Value

What transformation does this offer provide?

## Delivery

How is this offer delivered?

## Pricing


## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'asset',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: asset
title:
status:
access: private
area:
workbench: false
asset_type:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Content


## Usage Notes

When and how to use this asset.',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'software',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: software
title:
subtitle:
status:
access: private
area:
workbench: false
repo:
stack:
  -
url:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Overview

What does this software do?

## Architecture


## Features

-

## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'course',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: course
title:
subtitle:
status:
access: private
area:
workbench: false
institution:
instructor:
url:
date_start:
date_end:
certificate_link:
modules:
  - "[[]]"
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Overview

What is this course about?

## Modules

- [ ] [[]]
- [ ] [[]]
- [ ] [[]]

## Key Takeaways


## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'reference',
  'module',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  '[[]]',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: reference
subtype: module
title:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
course: "[[]]"
series:
series_position:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Summary


## Key Takeaways


## Notes


## Resources

- [[]]',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'log',
  'habit',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: log
subtype: habit
title:
status:
access: private
area:
workbench: false
unit:
target:
frequency:
  -
date_start:
date_end:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

| Date | Value | Note |
|------|-------|------|
|      |       |      |',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'log',
  'goal',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: log
subtype: goal
title:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
lag_measure:
lag_target:
lag_unit:
lag_actual: 0
score_overall:
date_start:
date_end:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Lead Measures

| Date | Lead | Target | Actual | Score | Done | Note |
|------|------|--------|--------|-------|------|------|
|      |      |        |        |       |      |      |

## Weekly Scores

| Week | Score | Lag | On Track | Reflection |
|------|-------|-----|----------|------------|
| 1    |       |     |          |            |
| 2    |       |     |          |            |
| 3    |       |     |          |            |
| 4    |       |     |          |            |
| 5    |       |     |          |            |
| 6    |       |     |          |            |
| 7    |       |     |          |            |
| 8    |       |     |          |            |
| 9    |       |     |          |            |
| 10   |       |     |          |            |
| 11   |       |     |          |            |
| 12   |       |     |          |            |

## EOW Review

**Blocker:**

**Adjustment:**

**Observations:**',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'log',
  'finance',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: log
subtype: finance
title:
status:
access: private
area:
workbench: false
date_field:
currency_primary: CHF
currency_secondary: USD
month_revenue_chf: 0
month_expenses_chf: 0
month_profit_chf: 0
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Revenue

| Date | Client | Offer | Type | Currency | Amount | CHF | Cumulative | Note |
|------|--------|-------|------|----------|--------|-----|------------|------|
|      |        |       |      |          |        |     |            |      |

## Expenses

| Date | Vendor | Category | Currency | Amount | CHF | Cumulative | Note |
|------|--------|----------|----------|--------|-----|------------|------|
|      |        |          |          |        |     |            |      |

## EOD Review

**Rate USD/CHF:**

**Outstanding:**

**Observations:**',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'log',
  'contact',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: log
subtype: contact
title:
status:
access: private
area:
workbench: false
contact_type:
contact_status:
contacted_last:
next_follow_up:
deal_status:
deal_value:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Details

- Email:
- Phone:
- Handles:

## Deal

- Title:
- Notes:

## Interactions

#### {{date:YYYY-MM-DD}}

- Channel:
- Summary:
- Next:',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'log',
  'outreach',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: log
subtype: outreach
title:
status:
access: private
area:
workbench: false
platform:
total_sent: 0
total_comments: 0
total_responses: 0
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

| Name | Platform | Type | Status | Note |
|------|----------|------|--------|------|
|      |          |      |        |      |

## Observations

- Did you update total_* frontmatter fields?
- Did you create contact notes for all promoted rows?
- Any follow-ups to schedule for tomorrow?',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'review',
  'weekly',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: review
subtype: weekly
title:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
week:
theme:
score_overall:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Scores This Week

| Area | Target | Actual | Status |
|------|--------|--------|--------|
|      |        |        |        |

## Wins

What worked and why?

## Losses

What didn''t work and why?

## Key Lessons


## Adjustments for Next Week',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'review',
  'monthly',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: review
subtype: monthly
title:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
month:
score_overall:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Scores This Month

| Area | Target | Actual | Status |
|------|--------|--------|--------|
|      |        |        |        |

## Wins

What worked and why?

## Losses

What didn''t work and why?

## Key Lessons


## Adjustments for Next Month',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'review',
  'yearly',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: review
subtype: yearly
title:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
year:
score_overall:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Gratitude & Experiences

### I am thankful for...


### I am proud of...


### I overcame...


### People to acknowledge...


### Unique experiences...


## Lessons & Discoveries

### Learned about myself...


### Learned about others...


### Meaningful discoveries...


## Feelings

### Positive feelings to carry forward...


### Negative feelings to let go of...


## Work To Do

### Limiting beliefs...


### What needs to change...


### Envy mapping...


### Current vs desired state...

**Pains of my current state:**

**Joys of my desired state:**

## Next Steps

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'review',
  'area',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: review
subtype: area
title:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
be_and_feel:
  -
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Vision


## Milestones

- [ ]

## Assessment

### Experience


### Problem


### Pain


### Relief


### Reward

## Outcome


**CYCLE 1** —
- Goal: [[]]
- Maintain:

**CYCLE 2** —
- Goal:

**CYCLE 3** —
- Goal:',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'action',
  'task',
  null,
  null,
  'private',
  null,
  false,
  '[]'::jsonb,
  '["[[]]"]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  '[[]]',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: action
subtype: task
title:
status:
access: private
area:
workbench: false
project: "[[]]"
dependencies:
  - "[[]]"
blocked: false
date_start:
date_end:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'action',
  'project',
  null,
  null,
  'private',
  null,
  false,
  '["[[]]"]'::jsonb,
  '["[[]]"]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: action
subtype: project
title:
subtitle:
status:
access: private
area:
workbench: false
resources:
  - "[[]]"
dependencies:
  - "[[]]"
blocked: false
date_start:
date_end:
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Outcome

What does done look like?

## Tasks

- [ ] [[]]
- [ ] [[]]
- [ ] [[]]

## Notes

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
),
(
  null,
  true,
  'inbox',
  null,
  null,
  'unprocessed',
  'private',
  null,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  null,
  'CHF',
  false,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  0,
  0,
  0,
  'CHF',
  'USD',
  0,
  0,
  0,
  null,
  null,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  '---
type: inbox
subtype:
title:
status: unprocessed
access: private
area:
workbench: false
date_created: "{{date:YYYY-MM-DD}}T{{time:HH:mm:ss}}"
date_modified:
date_trashed:
tags:
---

## Capture

',
  '{}'::jsonb,
  null,
  null,
  null,
  '[]'::jsonb
)
;

commit;
