# Agent System — Setup & Usage Guide

This guide is for humans: developers setting up a new project or making updates
to the agent system. If you're an AI agent, read `AGENTS.md` instead.

---

## What This System Is

This repo uses a structured set of documents to guide AI coding agents
(Claude Code, Codex CLI, or similar). The system is split into two layers:

- **Template layer** — rules that never change across projects
- **Project layer** — everything specific to this codebase

The goal is that any agent dropped into this repo knows exactly how to behave,
what stack it's working with, and where to find what it needs.

---

## File Structure

```
AGENTS.md                          # Root — agents read this first (template, do not edit)
docs/
└── agents/
    ├── README.md                  # This file
    ├── build-spec.md               # Project-specific config (edit this per project)
    ├── architecture.md            # Architecture agent sub-doc
    ├── frontend.md                # Frontend agent sub-doc
    └── planner.md               # Execution planning agent sub-doc
```

`AGENTS.md` lives at the **repo root**. Agents and tools like Codex CLI look
for it there by convention. Do not move it.

All other agent documents live in `docs/agents/`. Keep them here — AGENTS.md
references this path explicitly and agents are instructed to look here.

---

## Setting Up a New Project

### Step 1 — Copy the template files

Copy `AGENTS.md` to the repo root. Copy the contents of `docs/agents/` into
your new project at the same path.

Do not modify `AGENTS.md`. It is the stable template layer.

### Step 2 — Fill in build-spec.md

Open `docs/agents/build-spec.md`. This is the only file you must edit before
inviting an agent into the project. Work through it top to bottom:

- Fill in the project identity and stack sections completely
- Paste or describe the file structure
- List any project-specific forbidden libraries
- Define core product rules (offline support, viewport, UI pattern, etc.)
- Set performance budgets if relevant
- Document any known limitations or existing technical debt

Leave no `[PLACEHOLDER]` values behind. An agent that encounters an unfilled
placeholder will either guess or stall.

### Step 3 — Check the active sub-docs

In build-spec.md, check the boxes next to the sub-docs your project actually
uses. If a sub-doc is not relevant (e.g. no database means no architecture.md),
uncheck it so agents don't load it unnecessarily.

### Step 4 — Populate the database schema table

If your project has a database, list every active table in the schema reference
section of build-spec.md before any agent touches the codebase. This prevents
agents from making undisclosed schema changes.

---

## Updating an Existing Project

### Updating build-spec.md

Edit `docs/agents/build-spec.md` directly. Common updates:
- New tables → add to the schema reference table
- New dependencies → add to the stack section
- New forbidden libraries → add to the forbidden section
- New routes → update the navigation section

Add a row to the changelog at the bottom of build-spec.md whenever you make
a meaningful change, so collaborators know what shifted and when.

### Updating sub-docs

Sub-docs (`architecture.md`, `frontend.md`, `planner.md`) define how each
agent role operates. Edit them when:
- A pattern or convention changes project-wide
- A new component or data pattern becomes the standard
- A performance or accessibility rule is added or removed

Do not duplicate rules between sub-docs and AGENTS.md. If a rule belongs
to all agents, it lives in AGENTS.md. If it belongs to one role, it lives
in that role's sub-doc.

### Never edit AGENTS.md per project

If you find yourself wanting to change AGENTS.md for a specific project, that
change belongs in build-spec.md instead. AGENTS.md should be identical across
every project that uses this system. If a change genuinely improves the
template for all projects, update the canonical version and propagate it.

---

## Rule Priority

When rules conflict, agents follow this order:

```
AGENTS.md  >  build-spec.md  >  sub-docs
```

If you need to override a default from AGENTS.md for this project, do it
in build-spec.md and note it explicitly so it's easy to find.

---

## Adding a New Sub-Doc

If your project needs an agent role not covered by the existing three
(e.g. a dedicated `api.md` or `cms.md`):

1. Create the file at `docs/agents/[role].md`
2. Add it to the active sub-docs checklist in build-spec.md
3. Add a routing entry for it in AGENTS.md under Agent Roles — or note it
   in build-spec.md if the trigger is project-specific

---

## Common Mistakes

**Leaving placeholders unfilled in build-spec.md.**
Agents treat placeholder text as real content. Fill every field or delete
sections that don't apply.

**Putting project-specific rules in AGENTS.md.**
They'll carry over to the next project invisibly. Keep AGENTS.md clean.

**Duplicating rules across files.**
If the same rule appears in two places and they diverge, agents will follow
whichever they read last. One rule, one location.

**Not updating the schema table when adding a database table.**
Agents check this table before proposing schema changes. An outdated table
means agents don't know what already exists.

---

## Quick Reference

| Task | File to edit |
|---|---|
| Set up a new project | `docs/agents/build-spec.md` |
| Change stack or dependencies | `docs/agents/build-spec.md` |
| Add a database table | `docs/agents/build-spec.md` (schema table) |
| Change how the frontend agent works | `docs/agents/frontend.md` |
| Change how the architecture agent works | `docs/agents/architecture.md` |
| Change planning conventions | `docs/agents/planner.md` |
| Change agent behavior across all projects | `AGENTS.md` (canonical template) |
| Add a new agent role | `docs/agents/[role].md` + register in AGENTS.md |
