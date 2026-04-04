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

## Feature: Item Editor (step 7)

**Summary:** Replace the placeholder item route with the real markdown editor flow: assembled raw markdown in CodeMirror, explicit save, frontmatter parsing, and history snapshots.

**Agents involved:** both

**Sequence:**

### Phase 7 — Item Editor

**Agent:** @planner

**Goal:** Introduce the v1 editor in small chunks without violating the build order or silently changing the persistence model.

**Chunks:**

1. **Editor data contract**
   - Files touched: `src/lib/items.js`, `src/lib/frontmatter.js`, `src/routes/items.$id.jsx`
   - Steps:
     1. Add item fetch/update helpers for the editor route.
     2. Define the raw-markdown assembly/parsing contract between `items.content`, structured columns, and `frontmatter`.
     3. Add save logic that writes the updated item row and the `item_history` snapshot on explicit save.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: the current schema has no dedicated raw-markdown column, so the canonical source-of-truth format must be confirmed before implementation.
   - Commit message: `feat(editor): add data contract`

2. **CodeMirror shell**
   - Files touched: `package.json`, `package-lock.json`, `src/routes/items.$id.jsx`, `src/components/editor/ItemEditor.jsx`, `src/components/editor/ItemEditor.module.css`
   - Steps:
     1. Add the approved CodeMirror packages only.
     2. Replace the textarea placeholder with the editor shell and a save button in the header.
     3. Add explicit dirty-state handling and `Cmd/Ctrl+S` save behavior without auto-save.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: bundle size will increase; dependency approval is required before adding CodeMirror packages.
   - Commit message: `feat(editor): add codemirror shell`

3. **Frontmatter save path**
   - Files touched: `src/lib/frontmatter.js`, `src/lib/items.js`, `src/components/editor/ItemEditor.jsx`
   - Steps:
     1. Parse YAML frontmatter from the editor document on save.
     2. Update the mapped `items` columns plus `frontmatter` for unknown keys.
     3. Persist the full markdown snapshot to `item_history` with `change_type: updated`.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: malformed YAML and invalid frontmatter values need a clear blocking save error.
   - Commit message: `feat(editor): parse frontmatter`

4. **Editor enrichments**
   - Files touched: `src/components/editor/ItemEditor.jsx`, `src/lib/items.js`, `src/lib/wikilinks.js`
   - Steps:
     1. Add wikilink autocomplete on `[[` and tag autocomplete on `#`.
     2. Add the workbench toggle in the editor header.
     3. Keep backlinks-panel work scoped to the later backlinks phase unless the spec conflict is explicitly resolved otherwise.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: autocomplete source queries must stay bounded to avoid visible typing lag.
   - Commit message: `feat(editor): add autocompletes`

**Open questions before execution:**
- Should `items.content` remain the body-only field, with the editor assembling raw markdown from serialized frontmatter plus body and parsing it back on save?
- Are the official CodeMirror packages approved for this phase?
- Should Step 7 stop at editor/save/autocomplete and defer wikilink resolution plus the backlinks panel to Step 12, despite the overlap in the item-editor section of the spec?

## Feature: Template Management (step 8)

**Summary:** Replace the placeholder templates route with grouped template management, user-template creation, and guarded deletion while reusing the existing editor surface for template editing.

**Agents involved:** both

**Sequence:**

### Phase 8 — Template Management

**Agent:** @planner

**Goal:** Add template listing, creation, edit entry, and deletion in small chunks without changing the core item editor contract.

**Chunks:**

1. **Template data helpers**
   - Files touched: `src/lib/items.js`, `src/lib/templates.js`
   - Steps:
     1. Add fetch helpers for system and user templates scoped to the authenticated user.
     2. Add grouping/sorting helpers for rendering templates by type.
     3. Add creation and deletion helpers for user templates only.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: user-template creation semantics are ambiguous until the starting-content behavior is confirmed.
   - Commit message: `feat(templates): add data helpers`

2. **Template list**
   - Files touched: `src/routes/templates.jsx`, `src/features/templates/TemplateList.jsx`, `src/features/templates/TemplateList.module.css`
   - Steps:
     1. Replace the placeholder route with the real grouped template list.
     2. Add loading, empty, and error states.
     3. Make template rows open the existing editor surface for editing.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: the route should stay simple and avoid inventing a second editor surface.
   - Commit message: `feat(templates): add template list`

3. **New template flow**
   - Files touched: `src/routes/templates.jsx`, `src/features/templates/NewTemplateForm.jsx`, `src/features/templates/NewTemplateForm.module.css`, `src/lib/items.js`
   - Steps:
     1. Add a subtype picker for creating a new user template.
     2. Create the new template from the approved subtype source.
     3. Route directly into the editor after creation.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: the starting content for user templates depends on whether creation clones a seeded system template or starts blank.
   - Commit message: `feat(templates): add creation flow`

4. **Deletion confirmation**
   - Files touched: `src/routes/templates.jsx`, `src/features/templates/DeleteTemplateDialog.jsx`, `src/features/templates/DeleteTemplateDialog.module.css`, `src/lib/items.js`
   - Steps:
     1. Add deletion affordance only for user-owned templates.
     2. Require exact case-sensitive subtype confirmation before deletion.
     3. Keep seeded system templates read-only and undeletable.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: deletion entry point is ambiguous until the interaction surface is confirmed.
   - Commit message: `feat(templates): add deletion flow`

**Open questions before execution:**
- Should tapping a template from `/templates` reuse the existing `/items/$id` editor, or do you want a dedicated template detail route? Recommended: reuse `/items/$id` now.
- When creating a new user template from a subtype, should it clone the seeded system template content/frontmatter for that subtype, or start as a mostly blank template with only the subtype set? Recommended: clone the seeded system template.
- Where should deletion live: directly from the `/templates` list via a confirmation dialog, or from inside the editor? Recommended: from the `/templates` list via a confirmation dialog.

## Feature: Daily Note (step 9)

**Summary:** Add the home-screen daily-note entry point plus a persisted settings-defined default daily template.

**Agents involved:** both

**Sequence:**

### Phase 9 — Daily Note

**Agent:** @planner

**Goal:** Implement open-or-create daily-note behavior in small chunks, with the persistence model resolved before UI work begins.

**Chunks:**

1. **Daily settings persistence**
   - Files touched: `supabase/migrations/*_daily_settings.sql`, `src/lib/settings.js`, `src/routes/settings.jsx`
   - Steps:
     1. Add a dedicated user settings persistence model for the daily template selection.
     2. Add data helpers to load and update the authenticated user’s daily template preference.
     3. Extend the settings route with the daily-template picker.
   - Exit conditions: `supabase db lint --linked` succeeds; `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: the repo currently has no settings table, so the persistence model must be approved before execution.
   - Commit message: `feat(settings): add daily picker`

2. **Daily note data helpers**
   - Files touched: `src/lib/items.js`, `src/lib/settings.js`
   - Steps:
     1. Add helper to find an existing daily note for the current calendar day.
     2. Add helper to create today’s daily note from the selected template when missing.
     3. Keep creation idempotent and route-friendly so repeated clicks do not create duplicates.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: “today” needs one consistent timezone rule between the UI and stored dates.
   - Commit message: `feat(daily): add data helpers`

3. **Home entry point**
   - Files touched: `src/routes/index.jsx`
   - Steps:
     1. Replace the home placeholder with the Open Today’s Note action.
     2. Wire the button to open an existing daily note or create one and route into the editor.
     3. Add loading and error states for the action.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: the home surface should stay narrow and not pull in later navigation/dashboard work early.
   - Commit message: `feat(daily): add home entry`

**Open questions before execution:**
- The schema has no persisted user settings model today. Recommended: add a `user_settings` table with `user_id uuid primary key`, `daily_template_id uuid references public.items(id)`, `created_at`, and `updated_at`, plus user-owned RLS.
- What should define “today” for the daily note lookup? Recommended: use the user’s local browser date and store the note’s `date_field` as that local calendar date.
- Should the daily-template picker allow both seeded system daily templates and user-owned daily templates, or only user-owned custom daily templates after creation? Recommended: allow both seeded system daily templates and user-owned daily templates with subtype `daily`.

## Feature: Navigation (step 10)

**Summary:** Add the real app navigation shell and complete the required home/items/tab surfaces for mobile and desktop without pulling Trash into primary navigation.

**Agents involved:** both

**Sequence:**

### Phase 10 — Navigation

**Agent:** @planner

**Goal:** Introduce mobile bottom tabs and a desktop sidebar, then fill the route surfaces the spec assigns to the navigation phase.

**Chunks:**

1. **Navigation shell**
   - Files touched: `src/routes/_authenticated.jsx`, `src/components/layout/AppNav.jsx`, `src/components/layout/AppNav.module.css`, `src/components/command/CommandSheet.module.css`
   - Steps:
     1. Add the shared authenticated navigation shell with active-route state.
     2. Render a bottom tab bar on mobile and a sidebar on desktop for `home`, `inbox`, `items`, `templates`, and `settings`.
     3. Preserve the existing FAB on all screens and make the shell spacing work around it.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: mobile bottom-tab layout needs to coexist cleanly with the fixed FAB.
   - Commit message: `feat(nav): add app shell`

2. **Navigation counts and home data**
   - Files touched: `src/lib/items.js`, `src/routes/index.jsx`, `src/components/layout/AppNav.jsx`
   - Steps:
     1. Add helper queries for inbox count and recent workbench items.
     2. Update the home route to show date, daily note button, inbox count, and workbench items.
     3. Wire the inbox count badge into navigation.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: count fetching should stay bounded and not duplicate query logic across shell and home.
   - Commit message: `feat(nav): add home data`

3. **Items list**
   - Files touched: `src/lib/items.js`, `src/routes/items.jsx`
   - Steps:
     1. Add fetch helpers for the non-trashed item list, filters, and sorting.
     2. Replace the placeholder items route with the real list surface.
     3. Add type and subtype filters plus sort controls for `date_created`, `date_modified`, and `title`.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: subtype options need to derive from the filtered result set without becoming inconsistent.
   - Commit message: `feat(nav): add items list`

4. **Navigation polish**
   - Files touched: `src/routes/templates.jsx`, `src/routes/settings.jsx`, `src/components/layout/AppNav.jsx`
   - Steps:
     1. Ensure the existing templates and settings surfaces fit the final navigation shell.
     2. Add any route labels, badges, or shell affordances needed to make all declared routes resolve cleanly.
     3. Verify the primary navigation destinations work at mobile and desktop breakpoints.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: shell spacing regressions can affect every authenticated page.
   - Commit message: `feat(nav): polish routes`

**Open questions before execution:**
- Should primary navigation include only `home`, `inbox`, `items`, `templates`, and `settings`, with `trash` staying reachable only from settings until Step 11? Recommended: yes.
- What should the default `Items` sort be on first load? Recommended: `date_modified desc`.
- On home, how many workbench items should render initially? Recommended: the 8 most recently modified workbench items.
- On mobile, should the bottom tab bar split around the center FAB instead of trying to place five tabs evenly under it? Recommended: yes.

## Feature: Authentication (step 4)

**Summary:** Implement Supabase Auth flows for sign up, sign in, sign out, password reset, and route protection using the existing scaffold.

**Agents involved:** both

**Sequence:**

### Phase 4 — Authentication

**Agent:** @frontend

**Goal:** Add session-aware auth state, protected route redirects, and working auth forms for the routes already scaffolded.

**Chunks:**

1. **Auth state foundation**
   - Files touched: `src/app/providers.jsx`, `src/app/router.jsx`, `src/lib/supabase.js`, `src/lib/auth.js`
   - Steps:
     1. Add a shared auth-state layer around the existing Supabase client.
     2. Subscribe to session changes and expose the current user/session to the router.
     3. Prepare router-level auth context so later route guards do not duplicate logic.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: the exact redirect strategy depends on how protected routes should preserve the originally requested path.
   - Commit message: `feat(auth): add session foundation`

2. **Route protection**
   - Files touched: `src/routes/__root.jsx`, `src/routes/index.jsx`, `src/routes/inbox.jsx`, `src/routes/items.jsx`
   - Steps:
     1. Gate all non-`/auth/*` routes behind the auth check.
     2. Redirect unauthenticated users to `/auth/signin`.
     3. Redirect authenticated users away from auth entry routes when appropriate.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: preserving the intended destination after sign-in needs one canonical behavior.
   - Commit message: `feat(auth): protect app routes`

3. **Sign-in and sign-up flows**
   - Files touched: `src/routes/auth/signin.jsx`, `src/routes/auth/signup.jsx`, `src/components/auth/AuthForm.jsx`, `src/components/auth/AuthForm.module.css`
   - Steps:
     1. Replace the placeholders with working email/password forms.
     2. Call Supabase sign-in and sign-up APIs and surface success/error states.
     3. Route successful auth into the protected app.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: sign-up UX differs depending on whether email confirmation is enabled in the project.
   - Commit message: `feat(auth): add sign in flows`

4. **Password reset flow**
   - Files touched: `src/routes/auth/forgot.jsx`, `src/routes/auth/reset.jsx`, `src/lib/auth.js`
   - Steps:
     1. Implement forgot-password email submission.
     2. Implement password update from the reset route.
     3. Use the correct redirect URL so the recovery email lands in the app.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: reset-link behavior depends on the allowed redirect URLs configured in Supabase.
   - Commit message: `feat(auth): add reset flow`

5. **Sign-out and account display**
   - Files touched: `src/routes/settings.jsx`, `src/components/auth/AuthStatus.jsx`, `src/components/auth/AuthStatus.module.css`
   - Steps:
     1. Add the current user email display.
     2. Add a sign-out action wired to Supabase.
     3. Keep the settings page minimal but compliant with the current build order.
   - Exit conditions: `npm run build` succeeds; `npx eslint src/` succeeds.
   - Risks: settings will still be placeholder-heavy until the later settings phase.
   - Commit message: `feat(auth): add account actions`

**Open questions before execution:**
- Should authentication preserve the originally requested protected path and return the user there after sign-in, or is redirecting to `/` sufficient for v1?
- For sign-up, should I assume email confirmation is disabled and sign the user in immediately on success, or should I optimize for the “check your email” flow?
- For password reset, is using `${window.location.origin}/auth/reset` as the recovery redirect URL the intended behavior for both local and deployed environments?

## Feature: Command Sheet (step 5)

**Summary:** Add the global FAB and command sheet for quick capture, recent/templates browsing, title search, slash-command creation, and the editor insertion entry point.

**Agents involved:** @frontend

**Sequence:**

### Phase 5 — Command Sheet

**Agent:** @frontend

**Goal:** Make the command sheet accessible from every authenticated route and wire the v1 capture/open/create flows required by the build spec.

**Chunks:**

1. **Global shell and FAB**
   - Files touched: `src/routes/_authenticated.jsx`, `src/components/command/FabButton.jsx`, `src/components/command/FabButton.module.css`, `src/components/command/CommandSheet.jsx`, `src/components/command/CommandSheet.module.css`
   - Steps:
     1. Add an authenticated app shell wrapper that can render a fixed bottom-center FAB on every protected route.
     2. Add the command sheet container with open/close state, autofocus behavior, and content padding so the FAB does not obscure page content.
     3. Keep the shell compatible with the later navigation phase so the FAB does not need to be re-architected.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: this phase introduces a partial app shell before the dedicated navigation phase, so the wrapper should stay minimal.
   - Commit message: `feat(command): add sheet shell`

2. **Search and quick capture**
   - Files touched: `src/components/command/CommandSheet.jsx`, `src/lib/items.js`, `src/lib/cuid.js`
   - Steps:
     1. Query recent items and system templates for the default command-sheet state.
     2. Add real-time item-title search and open-in-editor selection behavior.
     3. Implement quick capture and rapid log mutations that create inbox items with `status: unprocessed`, first-line title extraction, and overflow body handling.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: all create flows depend on a consistent client-side `cuid` generator and the minimum required `items` fields for new records.
   - Commit message: `feat(command): add quick capture`

3. **Slash commands**
   - Files touched: `src/components/command/CommandSheet.jsx`, `src/lib/templates.js`, `src/lib/items.js`
   - Steps:
     1. Surface the canonical slash-command list when input starts with `/`.
     2. Filter commands in real time and resolve each command to the matching seeded template.
     3. Create a new item from the selected template and route to the item editor.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: command-to-template mapping must stay aligned with the canonical subtype list and the seeded template records.
   - Commit message: `feat(command): add slash actions`

4. **Insert-template entry point**
   - Files touched: `src/components/command/CommandSheet.jsx`, `src/routes/items.$id.jsx`, `src/lib/command-context.js`
   - Steps:
     1. Add the command-sheet mode needed for “Insert template” when the sheet is opened from the editor route.

## Fix: Remove Processed Column

**Summary:** Remove the redundant `processed` boolean everywhere and use `status` as the only inbox-state field, with `unprocessed | backlog` as the remaining valid values.

**Agents involved:** @architecture, @frontend

**Sequence:**

1. **Schema cleanup**
   - Files touched: `supabase/migrations/20260403045547_initial_schema.sql`, `supabase/migrations/20260403115850_drop_processed_column.sql`, `supabase/seed.sql`
   - Steps:
     1. Remove `processed` from the initial schema source so fresh environments never create it.
     2. Add a forward migration that drops `public.items.processed` from the linked project.
     3. Remove the field from the template seed insert/upsert paths so seed rows match the updated schema.
   - Exit conditions: `supabase db lint --linked` succeeds; `supabase db push --linked` succeeds.
   - Risks: seed SQL must keep every tuple aligned after the column removal.
   - Commit message: `fix(db): drop processed column`

2. **App cleanup**
   - Files touched: `src/lib/items.js`
   - Steps:
     1. Remove the redundant `processed` write from inbox quick capture.
     2. Keep inbox creation driven only by `status: 'unprocessed'`.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: none once the schema is aligned.
   - Commit message: `fix(command): remove processed flag`

3. **Spec cleanup**
   - Files touched: `docs/agents/build-spec.md`, `docs/agents/schema-reference.md`
   - Steps:
     1. Remove the `processed` column from the schema spec.
     2. Remove `processed` from the inbox status value lists.
   - Exit conditions: docs no longer describe `processed` as a field or status option.
   - Risks: none.
   - Commit message: `docs(spec): remove processed field`

## Fix: Viewport Shell And Command Sheet Bounds

**Summary:** Constrain the app to a full-viewport shell with inner scrolling only, and keep the command sheet fully usable within that shell on mobile and desktop.

**Agents involved:** @frontend

**Sequence:**

1. **Viewport shell**
   - Files touched: `src/routes/__root.jsx`, `src/routes/_authenticated.jsx`, `src/components/auth/AuthForm.module.css`
   - Steps:
     1. Add a root viewport shell that uses the full visible viewport instead of allowing the page body to grow naturally.
     2. Make authenticated app content scroll inside the shell rather than on the document.
     3. Bring the auth surface onto the same viewport-bounded behavior so login/signup do not rely on page scroll.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: fixed-height shells can clip content if inner overflow is not assigned to the right container.
   - Commit message: `fix(layout): add viewport shell`

2. **Command sheet bounds**
   - Files touched: `src/components/command/CommandSheet.jsx`, `src/components/command/CommandSheet.module.css`
   - Steps:
     1. Constrain the sheet panel to the available viewport height with safe-area padding.
     2. Move overflow into an internal scroll region so the header and composer remain reachable.
     3. Preserve the existing mobile-first behavior while preventing the panel from extending beyond the top edge.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: the panel height must account for the FAB offset and safe-area inset on smaller screens.
   - Commit message: `fix(command): constrain sheet height`

## Fix: Align Runtime CUID Format

**Summary:** Change runtime item creation so new `cuid` values match the timestamp-based format described in the schema reference instead of the temporary `item_*` generator shape.

**Agents involved:** @architecture, @frontend

**Sequence:**

1. **Define runtime `cuid` contract**
   - Files touched: `src/lib/cuid.js`, `docs/agents/schema-reference.md`
   - Steps:
     1. Replace the temporary programmatic `item_*` id format with a timestamp-based generator.
     2. Make the collision strategy explicit so rapid-log creation cannot violate the unique constraint.
     3. Clarify the docs if the runtime format needs more precision or suffixing than the current placeholder implies.
   - Exit conditions: a single canonical `cuid` format is defined for runtime item creation.
   - Risks: the schema reference currently implies a pure second-based value, which can collide during rapid-log creation.
   - Commit message: `fix(data): align cuid format`

2. **Apply runtime creation path**
   - Files touched: `src/lib/cuid.js`, `src/lib/items.js`
   - Steps:
     1. Update quick capture to use the corrected generator.
     2. Keep the DB insert contract otherwise unchanged.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: none once the generator contract is defined.
   - Commit message: `fix(command): use timestamp cuid`

3. **Optional data backfill**
   - Files touched: `supabase/migrations/...`
   - Steps:
     1. Backfill existing non-template `item_*` rows only if requested.
     2. Preserve uniqueness while avoiding changes to seeded system-template ids.
   - Exit conditions: `supabase db lint --linked` and `supabase db push --linked` succeed if this step is chosen.
   - Risks: changing persisted ids after creation can affect future wikilink assumptions, so this should only happen intentionally.
   - Commit message: `fix(db): backfill item cuids`

## Feature: Inbox (step 6)

**Summary:** Build the first real inbox workflow: list all unprocessed captures, show the current inbox count on the FAB, and process an inbox item into a typed backlog item.

**Agents involved:** both

**Sequence:**

### Phase 6 — Inbox

**Agent:** @frontend

**Goal:** Turn `/inbox` into a working capture-processing surface using the existing `items` table and seeded system templates.

**Chunks:**

1. **Inbox data helpers**
   - Files touched: `src/lib/items.js`
   - Steps:
     1. Add focused item queries for unprocessed inbox rows.
     2. Add the mutation that updates an inbox item in place during processing.
     3. Reuse the existing template fetch path so the processor can resolve valid type/subtype targets without introducing new schema.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: processor save logic needs one canonical rule for how template-derived content is stored before the CodeMirror phase exists.
   - Commit message: `feat(inbox): add data helpers`

2. **Inbox list**
   - Files touched: `src/routes/inbox.jsx`
   - Steps:
     1. Replace the inbox route placeholder with a list of all `type: inbox` and `status: unprocessed` rows.
     2. Add loading, empty, and error states using the existing shell conventions.
     3. Keep the count badge deferred until the navigation phase exists.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: the later nav phase will need to introduce a shared inbox-count source without duplicating fetch logic.
   - Commit message: `feat(inbox): add inbox list`

3. **Inbox processor**
   - Files touched: `src/routes/inbox.jsx`, `src/lib/items.js`, `src/lib/templates.js`, `src/routes/items.$id.jsx`
   - Steps:
     1. Add the processor surface that opens from an inbox row and shows the captured title and body.
     2. Let the user edit the title and choose a target type/subtype from the seeded template set.
     3. Apply the chosen template to the inbox item, set `status: backlog`, and route to `/items/$id`.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: the processor surface is under-specified in the build docs and needs one approved interaction model before implementation.
   - Commit message: `feat(inbox): add processor`

**Open questions before execution:**
- Should the inbox processor be an inline detail view inside `/inbox` or a right-sized modal/panel on top of the inbox list? Recommended: inline detail view inside `/inbox`, because it avoids inventing a new route before the editor/navigation phases.
- The build spec asks for a count badge on both nav and FAB, but navigation is still Phase 10. Resolved: do not add a FAB badge; defer count-badge work to the navigation phase and update docs when the UI chunk lands.
- When processing an inbox item before the CodeMirror phase exists, should I transform the existing inbox row in place to the selected `type`/`subtype` and set `status: backlog` without trying to synthesize full raw frontmatter markdown yet? Recommended: yes, keep this phase to structured column updates and let the later editor phase own full raw markdown/frontmatter assembly.
     2. Define the minimal insertion contract so a selected template body can be handed back to the editor at the cursor location.
     3. Keep the implementation thin enough that the CodeMirror-based editor phase can replace the placeholder editor surface without reworking the command sheet.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: this chunk depends on how strictly the build order should treat the current placeholder editor versus the later CodeMirror editor phase.
   - Commit message: `feat(command): add insert mode`

**Open questions before execution:**
- Should the command-sheet phase add only the FAB and sheet shell now, leaving the full bottom-tab/sidebar navigation for Phase 10, or do you want a temporary broader app shell in this phase?
- The build spec includes “Insert template” in Phase 5, but the real editor is Phase 7. Do you want a thin insertion contract wired to the current placeholder `/items/$id` route now, or should that specific behavior wait until the CodeMirror editor exists?
- For the FAB “hold” action, should I treat long-press as mobile-only for this phase and defer a desktop equivalent until later, or do you want a desktop fallback included now?

## Feature: Trash (step 11)

**Summary:** Build the trash view with soft-deleted item listing, restore, and permanent delete with typed confirmation while preserving item history semantics and removing companion records for log items.

**Agents involved:** both

**Sequence:**

1. **Trash data helpers**
   - Files touched: `src/lib/items.js`
   - Steps:
     1. Add a query for trashed items scoped to the current user.
     2. Add a restore mutation that clears `date_trashed`, updates `date_modified`, and writes an `item_history` snapshot with `change_type: restored`.
     3. Add a permanent-delete mutation that removes the item and any `habit_logs` or `finance_entries` rows tied to it.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: permanent delete must delete companion-table rows in the correct order and still surface partial-failure behavior clearly.
   - Commit message: `feat(trash): add data helpers`

2. **Trash list**
   - Files touched: `src/routes/trash.jsx`, `src/routes/TrashRoute.module.css`
   - Steps:
     1. Replace the placeholder trash route with the real trashed-item list.
     2. Add loading, empty, and error states consistent with the current shell.
     3. Show enough metadata to distinguish similarly titled items and open the selected delete/restore controls inline.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: the route should stay scoped to trash behavior and not become a second items index.
   - Commit message: `feat(trash): add trash list`

3. **Restore and permanent delete**
   - Files touched: `src/routes/trash.jsx`, `src/lib/items.js`
   - Steps:
     1. Add restore actions for trashed items and update the list immediately after server confirmation.
     2. Add permanent delete with exact typed title confirmation.
     3. Surface partial failures if the item deletes but related cleanup fails.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: typed confirmation needs to use the live item title or a safe fallback label when the title is blank.
   - Commit message: `feat(trash): add delete flow`

## Feature: Wikilinks and Backlinks (step 12)

**Summary:** Resolve saved wikilinks in the editor surface, make resolved links tappable, mark unresolved links visually, and add a backlinks panel grouped by relationship type.

**Agents involved:** both

**Sequence:**

1. **Wikilink helpers**
   - Files touched: `src/lib/wikilinks.js`, `src/lib/items.js`, `src/lib/frontmatter.js`
   - Steps:
     1. Add canonical extraction helpers for wikilinks in frontmatter and body.
     2. Add target resolution for the current item’s saved document and backlink queries for matching items.
     3. Group backlink matches by frontmatter property name, with body references under `Mentions`.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: duplicate item titles make exact target resolution ambiguous unless one canonical rule is chosen.
   - Commit message: `feat(links): add wikilink helpers`

2. **Editor link rendering**
   - Files touched: `src/components/editor/ItemEditor.jsx`, `src/components/editor/ItemEditor.module.css`, `src/routes/items.$id.jsx`
   - Steps:
     1. Render saved wikilinks as tappable editor decorations.
     2. Mark unresolved wikilinks with a distinct visual treatment.
     3. Keep editing behavior and explicit-save flow intact.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: editor decorations must not interfere with typing, selection, or existing autocomplete behavior.
   - Commit message: `feat(editor): render wikilinks`

3. **Backlinks panel**
   - Files touched: `src/routes/items.$id.jsx`, `src/lib/items.js`, `src/lib/wikilinks.js`
   - Steps:
     1. Load backlinks for the saved item title and document.
     2. Render the grouped backlinks panel below the editor.
     3. Make every backlink entry tappable and route to the linked item.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: backlinks should reflect saved state, not unsaved draft content, unless explicitly chosen otherwise.
   - Commit message: `feat(links): add backlinks panel`

## Fix: rename action date fields

**Summary:** Rename the persisted action date fields from `start_date` and `end_date` to `date_start` and `date_end` across the schema, seed data, parser mapping, and source docs without leaving mismatched field names behind.

**Agents involved:** @architecture

**Sequence:**

1. **Schema and seed rename**
   - Files touched: `supabase/migrations/*.sql`, `supabase/migrations/20260403045547_initial_schema.sql`, `supabase/seed.sql`
   - Steps:
     1. Add a forward migration that renames the live `items.start_date` and `items.end_date` columns to `date_start` and `date_end`.
     2. Update the base schema migration and seed SQL to use the new names.
     3. Keep existing data intact through the rename.
   - Exit conditions: `supabase db lint --linked` succeeds; `supabase db push --linked` succeeds.
   - Risks: direct renames are simpler, but all references must move together to avoid broken seed upserts and editor saves.
   - Commit message: `fix(db): rename item date fields`

2. **Runtime and docs alignment**
   - Files touched: `src/lib/frontmatter.js`, `docs/agents/build-spec.md`, `docs/agents/schema-reference.md`
   - Steps:
     1. Rename the known frontmatter field mapping from `start_date`/`end_date` to `date_start`/`date_end`.
     2. Update all schema-reference templates and prose to the new names.
     3. Update the build spec column list to match.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: if any old key survives in docs or parser order, saves will silently drift from the database contract.
   - Commit message: `fix(spec): align action date names`

## Fix: preserve authored template frontmatter

**Summary:** Make template and editor frontmatter behave more like Obsidian by preserving the authored property shape instead of regenerating a normalized full schema projection on save.

**Agents involved:** @planner + @architecture

**Research note:** Official Obsidian docs state that when you insert a template, “all the properties from the template will be added to the note” and existing note properties are merged with template properties. The current app already approximates merge-on-insert, but save/load still rebuilds known fields from database columns and defaults, which expands sparse template YAML and loses authored property presence.

**Sequence:**

1. **Frontmatter persistence contract**
   - Files touched: `src/lib/frontmatter.js`, `src/lib/items.js`
   - Steps:
     1. Change the save contract so the `frontmatter` jsonb column preserves the authored frontmatter object for both known and unknown keys.
     2. Continue projecting queryable known keys into dedicated columns on save.
     3. Rebuild editor markdown from the authored `frontmatter` object first, falling back to synthesized frontmatter only when legacy rows do not have preserved authored frontmatter.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: this is a behavioral persistence change and must not break existing legacy items that only have unknown keys in `frontmatter`.
   - Commit message: `fix(editor): preserve authored frontmatter`

2. **Template insert alignment**
   - Files touched: `src/lib/frontmatter.js`, `src/components/command/CommandSheet.jsx`, `src/routes/items.$id.jsx`
   - Steps:
     1. Keep insert-template behavior based on the preserved authored frontmatter shape.
     2. Ensure template insertion merges properties into the current note without forcing unrelated defaults into the note.
     3. Verify sparse templates stay sparse after save and reopen.
   - Exit conditions: `npm run build` succeeds; `npm run lint` succeeds.
   - Risks: merge behavior must stay consistent with the earlier Obsidian-like rules for title, subtitle, tags, dates, and body insertion.
   - Commit message: `fix(command): preserve template shape`
