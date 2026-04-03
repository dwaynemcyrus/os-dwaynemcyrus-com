# PLANS.md

## Feature: Personal OS bootstrap (steps 1-3)

**Summary:** Build the initial Vite/React application scaffold first, then author the initial Supabase schema SQL, then author the system-template seed SQL, with approval gates between each step.

**Agents involved:** both

**Sequence:**

### Phase 1 — Project scaffold

**Agent:** @frontend

**Goal:** Create a runnable Vite + React + TanStack Router + TanStack Query + Supabase JS shell with the required route surface and no feature logic yet.

**Chunks:**

1. **Runtime bootstrap**
   - Files touched: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`
   - Steps:
     1. Initialize the npm package with Vite/React runtime dependencies and the build/dev scripts required by the spec.
     2. Add the Vite entry HTML and minimal React mount so the app builds before route work begins.
     3. Keep the initial render intentionally small so later chunks can add router/query wiring without refactoring.
   - Exit conditions: `npm install` completes; `npm run build` succeeds.
   - Risks: local Node is `v22`, while the spec targets `20.x`; implementation should stay compatible with both.
   - Commit message: `chore(app): bootstrap vite runtime`

2. **Provider shell**
   - Files touched: `eslint.config.js`, `src/app/App.jsx`, `src/app/providers.jsx`, `src/main.jsx`
   - Steps:
     1. Add the ESLint config required by the repo rules.
     2. Introduce the application shell entry and wrap the tree with shared providers.
     3. Wire TanStack Query at the provider layer without introducing feature hooks yet.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: none beyond dependency install drift.
   - Commit message: `chore(app): add provider shell`

3. **Router core**
   - Files touched: `src/app/router.jsx`, `src/routes/__root.jsx`, `src/routes/index.jsx`, `vite.config.js`
   - Steps:
     1. Add TanStack Router wiring and the route root.
     2. Register the home route and connect the router to the provider shell.
     3. Update Vite config only as needed for the router setup.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: route generation details depend on the chosen TanStack Router setup.
   - Commit message: `chore(router): add router core`

4. **Primary route stubs**
   - Files touched: `src/routes/inbox.jsx`, `src/routes/items.jsx`, `src/routes/items.$id.jsx`, `src/routes/templates.jsx`
   - Steps:
     1. Add route placeholders for the primary authenticated app surfaces.
     2. Keep content minimal and explicit so later feature work can replace it incrementally.
     3. Confirm the route tree still builds cleanly.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: none.
   - Commit message: `chore(router): add main route stubs`

5. **Secondary route stubs**
   - Files touched: `src/routes/settings.jsx`, `src/routes/trash.jsx`, `src/routes/auth/signin.jsx`, `src/routes/auth/signup.jsx`
   - Steps:
     1. Add the settings and trash placeholders.
     2. Add the first auth route placeholders.
     3. Keep auth pages isolated from protected route logic for now.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: none.
   - Commit message: `chore(router): add secondary routes`

6. **Auth completion and Supabase client**
   - Files touched: `src/routes/auth/forgot.jsx`, `src/routes/auth/reset.jsx`, `src/lib/supabase.js`, `.env.example`
   - Steps:
     1. Add the remaining auth route placeholders.
     2. Create the shared Supabase browser client contract from `import.meta.env`.
     3. Document the required environment variables without checking in secrets.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: auth flow implementation is deferred to later phases by spec.
   - Commit message: `chore(data): add supabase client`

7. **Global style foundation**
   - Files touched: `src/styles/reset.css`, `src/styles/variables.css`, `src/app/App.jsx`, `src/main.jsx`
   - Steps:
     1. Add the reset stylesheet and the token file mandated by the build spec.
     2. Apply the global CSS imports at the root.
     3. Keep tokens minimal and functional, not final-design heavy.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: none.
   - Commit message: `style(app): add global style base`

**Handoff to:** @architecture — initial schema SQL and RLS policies

### Phase 2 — Database migration

**Agent:** @architecture

**Goal:** Author the initial SQL migration containing all four tables, indexes, triggers, and RLS policies required by the spec.

**Chunks:**

1. **Initial schema SQL**
   - Files touched: `supabase/config.toml`, `supabase/migrations/20260403_000001_initial_schema.sql`
   - Steps:
     1. Add Supabase project config needed to keep migrations in a conventional location.
     2. Create the initial schema SQL for `items`, `item_history`, `habit_logs`, and `finance_entries`.
     3. Add indexes, updated-at trigger support, and RLS policies consistent with authenticated-user scoping plus readable system templates.
   - Exit conditions: `supabase db lint` succeeds; `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: the exact schema for `item_history`, `habit_logs`, and `finance_entries` is not fully specified in the docs and may require clarification before execution.
   - Commit message: `feat(db): add initial schema`

**Handoff to:** @architecture — system template seed SQL

### Phase 3 — Template seeding

**Agent:** @architecture

**Goal:** Seed every required system template record using the schema reference content exactly.

**Chunks:**

1. **System template seed SQL**
   - Files touched: `supabase/seed.sql`
   - Steps:
     1. Convert each required template frontmatter/body pair from `schema-reference.md` into a seeded `items` row.
     2. Mark seeded rows as `is_template = true` and `user_id = null`.
     3. Preserve the original markdown body verbatim enough for later editor use while keeping parsed columns aligned with the explicit `items` schema.
   - Exit conditions: `supabase db lint` succeeds; `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: the spec says "31" templates, but the explicit lists enumerate more than that; execution should wait for clarification.
   - Commit message: `feat(db): seed system templates`

**Handoff to:** @frontend — authentication implementation after step 3 approval

**Resolved execution decisions:**
- Treat the explicit subtype and slash-command lists as canonical; ignore the repeated "31" count in the prose.
- Derive `item_history`, `habit_logs`, and `finance_entries` conservatively from the feature notes and markdown table structures in `schema-reference.md`.
- Normalize mismatches during initial implementation: `rating` remains integer, use `year`, and use `platform`.
- Until a test runner is added, verify steps 1-3 with `npm run build`, `npx eslint src/`, and `supabase db lint`.

**Open questions before execution:**
- None. Waiting for explicit approval to start Phase 1, Chunk 1.
