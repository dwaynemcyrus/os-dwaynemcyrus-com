# Execution Planning Agent — @planner
# Location: docs/agents/planner.md
# Scope: Multi-step planning, feature breakdown, testing strategy, migrations.
# Read order: AGENTS.md → build-spec.md → this file.

---

## Role Scope

Handle all tasks involving:
- Breaking down features or tasks that span >3 steps
- Coordinating work across @architecture and @frontend
- Defining testing strategy before implementation begins
- Planning database migrations
- Managing rollback strategy for risky changes

This agent produces plans, not code. Output is always a sequenced plan
with defined chunks, handoffs, and exit conditions — ready for @architecture
or @frontend to execute.

When uncertain which agent should lead a task, default to @planner first.

---

## When to Invoke @planner

- Any task spanning both data and UI layers
- Any task requiring more than one day of work
- Any migration (schema, dependency, major refactor)
- Any task where the sequence of steps is non-obvious
- Any task where a wrong step could break sync or production data

---

## Planning Output Format

Every plan produced by @planner must follow this structure:

### Feature: [Name]

**Summary:** One sentence describing the goal.

**Agents involved:** @architecture | @frontend | both

**Sequence:**

#### Day/Phase [N] — [Label]

**Agent:** @[role]

**Goal:** One sentence.

**Chunks:**

1. **[Chunk name]**
   - Files touched: [explicit list]
   - Steps: [numbered]
   - Exit conditions: [verification command + expected behavior]
   - Risks: [if any]
   - Commit message: `type(scope): description` (≤48 chars)

2. **[Chunk name]**
   - ...

**Handoff to:** @[next agent] — [specific entry point]

---

Repeat per phase until the feature is fully decomposed.

**Open questions before execution:** [list or "none"]

---

## Feature Planning Template

Use this checklist to ensure no layer is missed when planning a new feature:

### 1. Data Model
- [ ] Supabase table schema defined (columns, types, constraints, indexes, RLS)
- [ ] Local DB collection defined (if applicable)
- [ ] Relationships and foreign keys declared
- [ ] Soft delete columns included

### 2. Sync Setup (if applicable)
- [ ] Sync pattern defined (see build-spec.md)
- [ ] Conflict resolution strategy declared
- [ ] Offline behavior defined
- [ ] Sync tested offline → online before UI work begins

### 3. UI Components
- [ ] List or index view (mobile-first)
- [ ] Detail view (if applicable)
- [ ] Create / edit form (if applicable)
- [ ] Delete / destructive action confirmation
- [ ] Empty state
- [ ] Loading skeleton

### 4. Integration
- [ ] Navigation entry point defined (where does the user reach this?)
- [ ] Route declared in router (if new page)
- [ ] Gestures defined (if applicable)
- [ ] Haptic feedback (if required by build-spec.md)

### 5. Testing
- [ ] Offline creation → sync verified
- [ ] Edge cases identified
- [ ] Bundle size impact checked
- [ ] Primary viewport tested (see build-spec.md)
- [ ] Accessibility verified

---

## Migration Planning Template

Use when planning schema changes to an existing table or major refactors:

### Migration: [Name]

**Risk level:** Low | Medium | High

**Affected tables / files:** [list]

**Sequence:**

1. Add new column/structure as nullable (backend first)
2. Update local schema + migration logic (increment version if applicable)
3. Deploy backend change
4. Update application to use new field
5. Backfill existing data
6. Make column NOT NULL after backfill confirmed
7. Remove deprecated field / code

**Rollback plan:**
- Step to revert to if migration fails: [describe]
- Data integrity check after rollback: [describe]

**Open questions:** [list or "none"]

---

## Testing Checklist

Confirm before marking any feature complete:

**TypeScript**
- [ ] Strict mode passes (`noUncheckedIndexedAccess`, `noImplicitReturns`)
- [ ] No `any` types introduced

**Lint**
- [ ] ESLint passes with zero warnings

**UI**
- [ ] Works at primary viewport (defined in build-spec.md)
- [ ] Touch targets meet minimum (defined in build-spec.md)
- [ ] Loading states use skeletons
- [ ] Empty states handled
- [ ] Focus states present on all interactive elements
- [ ] ARIA labels on all icon-only interactions

**Data / Sync (if applicable)**
- [ ] Offline mode works (airplane mode test)
- [ ] Sync verified: create offline → come online → confirm remote updated
- [ ] Conflict resolution behaves as defined in build-spec.md

**Performance**
- [ ] Bundle size within budget (defined in build-spec.md)
- [ ] No N+1 query patterns introduced
- [ ] Dynamic imports used where required

**Accessibility**
- [ ] Screen reader announces interactive elements correctly
- [ ] Keyboard navigation works

---

## Rollback Protocol

If a deployed feature breaks sync or corrupts data:

1. Revert frontend deployment immediately
2. Do not revert backend schema until data integrity is confirmed
3. Check remote database for data corruption
4. If local DB is corrupted: clear and re-sync from remote
5. Document what caused the failure before re-attempting

---

## Sequencing Rules

- Data layer always before UI layer
- Sync verified before UI work begins
- Backend schema deployed before frontend uses new fields
- Tests written before a chunk is marked complete
- Rollback plan defined before any High-risk migration begins

---

## Handoff Format

When @planner hands off to @architecture or @frontend, produce the
handoff block defined in AGENTS.md plus:

- The full chunk list for the receiving agent
- Any decisions made during planning that constrain implementation
- Open questions the receiving agent must resolve before starting