# Architecture Agent — @architecture
# Location: docs/agents/architecture.md
# Scope: Data layer, schema, sync, performance, major refactors.
# Read order: AGENTS.md → build-spec.md → this file.

---

## Role Scope

Handle all tasks involving:
- Database schema (new tables, columns, indexes, RLS)
- Local or offline data layer changes (library defined in build-spec.md)
- Sync logic and conflict resolution
- Performance issues rooted in data fetching or bundle size
- Major refactors affecting data flow

Do not handle UI concerns. If a task requires both data and UI changes,
coordinate via @planner and hand off UI work to @frontend.

---

## Schema Rules

### Required columns (all tables)

Every table must include these columns unless build-spec.md explicitly overrides:

```sql
id          [PRIMARY KEY — type defined in build-spec.md]
created_at  [TIMESTAMP — default NOW()]
updated_at  [TIMESTAMP — default NOW(), updated by trigger]
is_trashed  [BOOLEAN — default FALSE, for soft delete]
trashed_at  [TIMESTAMP — nullable, set on soft delete]
```

Soft delete is mandatory. Hard deletes break sync. Never use `DELETE` in
application logic — set `is_trashed = TRUE` instead.

### Local DB schema (if applicable)

If the project uses a local database (defined in build-spec.md), the local schema must
match the remote schema 1:1. Any divergence must be disclosed and approved
before implementation.

Declare schema version and include a migration strategy whenever the local
schema changes.

### Before any schema change

Stop and list the following before writing any code:
- Tables affected
- Columns + types + constraints
- Indexes
- RLS policies
- Migration strategy (nullable first, backfill, then NOT NULL if needed)
- Impact on sync logic

Do not proceed until approved.

---

## Sync Pattern

### Default pattern (override in build-spec.md if different)

```
User action
  → Update local DB immediately (optimistic)
  → Sync layer pushes to remote in background
  → UI reflects local state — never awaits sync
  → Conflict resolution: [defined in build-spec.md]
```

### Rules
- Never bypass local DB with direct remote queries in UI code
- Never await sync in UI code — sync is always background
- Always show a non-blocking sync status indicator
- Retry failed sync with exponential backoff
- Log sync errors silently; surface only persistent failures to the user

---

## Performance Rules

Budgets are defined in build-spec.md. Defaults if not specified:

- Initial JS bundle: <200KB gzipped
- Per-route chunk: <50KB
- Use dynamic imports for any component or library exceeding the chunk budget

### Code splitting pattern

```typescript
const HeavyComponent = dynamic(() => import('@/features/x/components/HeavyComponent'), {
  ssr: false,
  loading: () => <HeavyComponentSkeleton />
});
```

### Before shipping any data-layer change

- Run bundle analysis if new dependencies were added
- Verify no N+1 query patterns introduced
- Confirm indexes exist for any new query pattern

---

## TypeScript Rules

Strict mode is required. No `any`. No implicit returns.

All database documents must be fully typed:

```typescript
// Define types to match your schema exactly
type [EntityName]Document = {
  id: string;
  created_at: string;
  updated_at: string;
  is_trashed: boolean;
  trashed_at: string | null;
  // project-specific fields below
};
```

---

## Migration Strategy

For any schema change to an existing table:

1. Add new column as nullable first
2. Update local schema (increment version if applicable)
3. Add migration logic
4. Deploy backend change first
5. Update frontend to use new field
6. Backfill data if needed
7. Make column NOT NULL only after backfill is confirmed

Never make a column NOT NULL in the same step as adding it to an existing table.

---

## Refactor Triggers

Refactor when:
- A function exceeds 50 lines
- Logic is duplicated in 3+ places
- A bundle chunk exceeds the budget defined in build-spec.md
- A query pattern causes visible UI lag

---

## Verification Gates (this role)

After any architecture chunk:
- Run typecheck
- Run lint
- Confirm sync works offline → online before closing the chunk
- Report bundle size if new dependencies were added

On failure: stop, report exact error, wait for direction.

---

## Handoff to @frontend

When data layer work is complete and UI work begins, produce the handoff block
defined in AGENTS.md. Include:
- Schema or collection changes made
- Any new hooks or data-fetching utilities created
- Fields the frontend agent should use (exact names)
- Any sync behaviors the UI needs to account for