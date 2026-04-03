# AGENTS.md — Implementation Agent Template
# Version: 2.0
# Scope: Template (stack-agnostic). Do not edit per project.
# Project overrides live in: docs/agents/build-spec.md

---

## Read Order (mandatory)

Read documents in this exact sequence before any action:
1. `AGENTS.md` (this file) — behavioral rules, workflow, quality gates
2. `docs/agents/build-spec.md` — project-specific stack, constraints, overrides
3. The relevant sub-doc for your role — see Agent Roles below

In any conflict, priority order is: **AGENTS.md > build-spec.md > sub-docs.**

---

## Prime Directive

Build deliberately. Prefer clarity over speed. Ship small, reviewable changes.

---

## Operating Rules

- Plan before execution. Stop after planning and wait for explicit approval.
- Work in small, safe chunks (1–4 files per chunk).
- Never invent APIs, frameworks, or services not declared in build-spec.md.
- Never silently change scope — ask first, always.
- Prefer minimal diffs. Avoid abstractions not needed by the current chunk.
- Verify stack from build-spec.md before assuming anything.
- After any changes, always include a commit message in the response.
- No speculative code. Forward planning in planner is expected and required —
  speculative *code* written ahead of approved chunks is forbidden.

---

## Forbidden Actions (all projects)

- No silent new dependencies, services, or frameworks — ask first
- No production configuration or billing changes
- No silent database schema changes
- No scope expansion without explicit approval
- No skipping verification gates

Project-specific forbidden actions are declared in build-spec.md.

---

## Workflow

### Step 1 — Planning

Produce a numbered implementation plan broken into chunks.

Each chunk must include:
- **Goal** — one sentence
- **Files touched** — explicit list
- **Steps** — numbered
- **Exit conditions** — verification command + expected behavior
- **Risks** — if any
- **Commit message** — ≤48 characters, lowercase, conventional-commit format

Stop after planning. Do not proceed until explicitly approved.

### Step 2 — Execution

Execute chunks sequentially. After each chunk:
- Run all required verification gates (see below)
- Report pass/fail briefly — no verbose logs unless something fails
- On failure: stop, report the exact error, and wait for direction. Do not attempt silent fixes across scope.
- Restate commit message with type
- Declare chunk complete

If instructed to wait between chunks, pause for explicit direction.

### Step 3 — Completion

Provide:
- Summary of all chunks completed
- Ordered list of commit messages
- What changed (high level)
- Where to look (file paths)
- How to verify (exact commands)
- Known limitations or follow-ups

---

## Verification Gates (mandatory)

Detect available scripts from package.json before running.

**After any chunk touching logic, routing, state, or data fetching:**
- Run typecheck (or build if typecheck unavailable)
- Run lint
- Run existing tests, or add tests if none exist

**After UI-only chunks:**
- Run typecheck or build

**On gate failure:**
- Stop immediately
- Report the exact error output
- Do not proceed to the next chunk
- Wait for explicit direction

---

## Database Change Disclosure (mandatory)

If any database change is required, stop before execution and explicitly list:
- Tables
- Columns + types
- Constraints
- Indexes
- RLS policies
- Migration strategy

Do not execute until approved.

---

## Agent Roles and Routing

### Sub-doc locations
All sub-docs live in `docs/agents/`:
- `docs/agents/build-spec.md` — project-specific overrides (required per project)
- `docs/agents/architecture.md` — schema, sync, data layer
- `docs/agents/frontend.md` — UI components, styling, gestures, navigation
- `docs/agents/planner.md` — multi-step planning, migrations, testing strategy

### Role definitions

**@architecture**
Scope: schema changes, new features, performance, sync logic, major refactors.
Read: `docs/agents/architecture.md`
Triggers: "add table", "change database", "optimize", "refactor sync", "new collection"

**@frontend**
Scope: UI components, styling, gestures, navigation, accessibility.
Read: `docs/agents/frontend.md`
Triggers: "create component", "add button", "style page", "fix layout", "add gesture"

**@planner**
Scope: multi-step tasks, feature planning, migration strategies.
Read: `docs/agents/planner.md`
Triggers: "plan out", "how should I", "what's the best way to", any task >3 steps

### Routing decision table

| Situation | Route to |
|---|---|
| Adding UI only | @frontend |
| Changing data structure | @architecture |
| Multi-day or multi-layer task | @planner first, then @architecture or @frontend |
| Bug — UI layer | @frontend |
| Bug — data layer | @architecture |
| Bug — both layers | @planner to coordinate, then both |
| Performance issue | @architecture |
| New page, no new data | @frontend |
| New page + new data | @planner leads; @architecture then @frontend |
| Uncertain | @planner — default tiebreaker |

### Multi-agent handoff format

When one agent completes work that another will continue, produce this block:

```
## Handoff
- Chunks completed: [list]
- Verification status: [pass/fail per gate]
- Files changed: [list]
- Open questions: [list or "none"]
- Next agent: @[role]
- Entry point for next agent: [specific task or file]
```

---

## Escalation — When to Stop and Ask

Always escalate to human when:
- A breaking change to sync or auth logic is required
- A new third-party dependency >100KB is needed
- An architectural pattern change is required
- A performance budget would be exceeded
- A verification gate fails and the fix is non-obvious
- The task requires resolving a multi-device conflict beyond last-write-wins
- Scope is genuinely ambiguous after reading build-spec.md

---

## Naming Conventions (defaults — override in build-spec.md)

- **Component files:** PascalCase (`Button.tsx`, `Button.module.css`)
- **CSS:** BEM in modules (`.button`, `.button--primary`, `.button__icon`)
- **Functions:** camelCase (`handleSubmit`, `fetchTasks`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Types:** PascalCase, descriptive (`TaskDocument`, `SyncStatus`)

---

## Commit Message Format

```
type(scope): short description
```

Rules:
- ≤48 characters total
- Lowercase
- Types: `feat`, `fix`, `refactor`, `style`, `test`, `chore`, `docs`
- Example: `feat(tasks): add optimistic delete`

---

## What This File Does Not Contain

The following are intentionally absent from this template and must be defined
in `docs/agents/build-spec.md` per project:

- Stack (framework, database, deployment, UI libraries)
- File structure
- Forbidden libraries specific to the project
- Design system constraints (mobile breakpoints, touch targets, etc.)
- Performance budgets
- Core product rules (offline-first, optimistic UI, etc.)
- Environment and tooling specifics
