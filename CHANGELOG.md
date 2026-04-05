# Changelog

All notable changes to Personal OS will be documented in this file.

## [0.9.0] - 2026-04-05

Recommended release: `v0.9.0`

### Added
- `date_published` support in the `items` schema and frontmatter contract.

### Changed
- Renamed the publish field from `published` to `publish` across the schema, runtime editor contract, and source docs.
- `date_created`, `date_modified`, and `date_published` now sync between frontmatter and database columns.
- Plain date input for authored timestamps now normalizes on save using the local browser timezone at midnight.
- `date_modified` now auto-updates only when omitted, and `date_published` auto-fills when `publish: true` and the field is omitted.
- Template folder settings are now truly user-defined. New templates inherit a folder only when one is explicitly configured.
- The Home workbench row now shows its count in `#/12` format.

### Fixed
- Editor saves can now preserve imported authored publish/date metadata instead of forcing the old one-way timestamp behavior.

### Notes
- This milestone tightens the markdown-to-database contract so imported historical metadata can round-trip more predictably through the editor.

## [0.8.0] - 2026-04-05

Recommended release: `v0.8.0`

### Added
- Daily note folder preferences in Settings, including autocomplete from existing folders and an optional post-save bulk update for existing daily notes.
- A shared centered dialog primitive for app-wide modal confirmations and warnings.

### Changed
- Daily Note settings now follow the reference sheet structure more closely, with template selection, folder location, and a placeholder date-format row.
- Newly created daily notes now apply the saved daily note folder preference automatically.
- The Home screen now labels the primary daily-note action as `Create Today's Note` until today’s note exists, then switches to `Open Today's Note`.

### Fixed
- Missing-template warnings for Today’s Note now appear as a centered modal and route directly to `settings/daily-note`.
- Stale saved daily-template ids are now treated as missing-template state instead of leaking Supabase 406 errors, and invalid saved ids are cleared automatically from `user_settings`.

### Notes
- This milestone continues the mobile app rebuild by tightening the daily-note flow, the Settings support stack, and shared modal behavior.
- The new dialog primitive now backs the Home warning, daily-note folder bulk update confirmation, and template delete confirmation.

## [0.7.0] - 2026-04-04

Recommended release: `v0.7.0`

### Added
- Inbox count badge on the navigation tab so unprocessed captures remain visible from the main shell.

### Changed
- Renamed item date fields from `start_date` and `end_date` to `date_start` and `date_end` across the schema, runtime parser, and source docs.
- Removed runtime dependence on seeded system templates. New templates now open blank, runtime template flows use user-owned templates only, and missing template cases fail clearly instead of falling back implicitly.
- Preserved authored frontmatter shape across saves so sparse templates and notes stay sparse instead of being regenerated with default metadata.
- Stripped the app shell, navigation, command sheet, editor surfaces, and main routes back to a neutral dark structural baseline for manual UI rebuild work.

### Fixed
- Repaired template insertion so user-created templates merge correctly into documents instead of failing or wiping content.
- Corrected template save behavior so authored frontmatter is no longer expanded with unrelated defaults on reopen.

### Notes
- This milestone shifts the app into a pre-`v1` UI hardening phase while keeping the feature set intact.
- The current interface is intentionally reduced so the next passes can rebuild the visual system deliberately from a clean baseline.

## [0.6.1] - 2026-04-04

Recommended release: `v0.6.1`

### Changed
- Committed the accumulated implementation plans in `PLANS.md` so the repository now includes the recorded execution plan for the completed build phases.

### Notes
- This is a documentation-only patch release after `v0.6.0`.
- No application behavior changed in this milestone.

## [0.6.0] - 2026-04-04

Recommended release: `v0.6.0`

### Added
- Responsive navigation shell with a mobile bottom tab bar, desktop sidebar, and route-aware active states.
- Home summaries for unprocessed inbox items and recent workbench items.
- Full items library view with search, type and subtype filters, and sortable results.
- Trash management with restore and permanent delete flows backed by typed confirmation.
- Live wikilink resolution in the editor and a saved-state backlinks panel grouped by property.

### Changed
- Settings now acts as a stronger route hub with shortcuts, slash command reference, and the trash entry point.
- System templates remain readable in the shared editor while user-owned items continue to be editable and navigable.

### Notes
- This milestone completes the navigation, trash, and backlinks phases of the build sequence.
- The remaining defined build phase in the current spec is the final settings audit and completion pass.

## [0.5.0] - 2026-04-03

Recommended release: `v0.5.0`

### Added
- Full markdown item editor with CodeMirror, explicit save, `Cmd/Ctrl+S`, and item history snapshots on save.
- Frontmatter parsing and serialization with YAML, plus frontmatter validation that blocks invalid known-field shapes.
- Wikilink and tag autocomplete in the editor, plus a workbench toggle in the item header.
- Template management for browsing, creating from seeded subtypes, opening in the shared editor, and soft-deleting user templates with typed confirmation.
- Daily note settings backed by `user_settings`, persisted daily-template selection, and a home action for opening or creating today's note.

### Changed
- Template insertion now preserves existing note identity, merges frontmatter safely, and inserts template body content at the cursor instead of replacing the document.
- Daily note creation now requires an explicitly selected template instead of silently falling back to a seeded system placeholder.
- The home route now provides the daily-note entry point and missing-template warning path into settings.

### Fixed
- Stabilized the editor shell so typing no longer remounts the editor, loses focus, or wipes unsaved text during routine rerenders.
- Corrected timestamp-based runtime `cuid` generation to align new item creation with the schema reference.

### Notes
- This milestone completes the item editor, template management, and daily note phases of the build sequence.
- Navigation shell and list-navigation work remain next in the planned order.

## [0.4.0] - 2026-04-03

Recommended release: `v0.4.0`

### Added
- Global command-sheet shell with a persistent floating action button on authenticated screens.
- Recent items, template browsing, live title search, quick capture, and rapid logging in the command sheet.
- Slash-command creation from seeded system templates and a thin insert-template flow on the item route.
- Real inbox list and inline inbox processor for reviewing captures before moving them into backlog.

### Changed
- The app now runs inside a viewport-bounded shell with inner scrolling instead of page-level scrolling.
- The command sheet stays within the app shell and uses an internal scroll region when content grows.
- New runtime items now use timestamp-based `cuid` values with collision suffixes when needed.

### Fixed
- Removed the redundant `processed` field from the schema, seed data, runtime logic, and spec docs.
- Inbox processing now relies on `status` only and moves completed captures to `backlog`.

### Notes
- This milestone completes the command sheet and inbox phases of the build sequence.
- The item editor phase is next in the planned build order.

## [0.3.0] - 2026-04-03

Recommended release: `v0.3.0`

### Added
- Supabase-backed authentication flows for sign in, sign up, forgot password, reset password, and sign out.
- Route protection for all non-authenticated application routes with redirect-back handling.
- Shared auth UI components for account access and account status screens.
- Settings account section showing the signed-in email address.

### Changed
- Auth state now tracks the current session and latest auth event so recovery and redirect flows can respond to session changes.
- Password recovery emails now target the in-app reset route and preserve the originally requested destination when available.

### Notes
- This milestone completes the authentication phase of the build sequence.
- Core app workflows after authentication remain ahead in the build order.

## [0.2.0] - 2026-04-03

Recommended release: `v0.2.0`

### Added
- Initial Supabase schema migration for `items`, `item_history`, `habit_logs`, and `finance_entries`.
- Row level security policies for user-scoped data and readable system templates.
- System template seed SQL covering all canonical template records defined in the schema reference.
- Supabase CLI project config for migrations and seeding.

### Changed
- Applied the database schema and template seed to the linked Supabase project.

### Fixed
- Qualified trigram operator classes in the migration so the remote Postgres deployment can create the search indexes.
- Preserved schema defaults during seeding so blank frontmatter values no longer insert invalid `null` values into non-null columns.

### Notes
- This milestone completes the first data-layer foundation of the app.
- Authentication and application workflows remain ahead in the build sequence.

## [0.1.0] - 2026-04-03

Recommended release: `v0.1.0`

### Added
- Initial Vite + React application scaffold.
- TanStack Query provider shell and TanStack Router setup.
- Route stubs for home, inbox, items, item editor, templates, settings, trash, and auth screens.
- Shared Supabase client module and `.env.example`.
- Repo hygiene files for linting and ignored generated artifacts.
- Execution plan for the phased build sequence.

### Changed
- Removed the obsolete `build-spec-template.md` file from the repository history after the new document-driven setup was established.

### Notes
- This is the first tagged milestone for the project.
- The app currently covers Phase 1 scaffold work only. Database schema, template seeding, authentication, and feature implementation remain ahead.
